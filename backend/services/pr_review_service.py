import json
import logging
from typing import AsyncGenerator
from services.github_service import get_pr
from services.fireworks_service import chat_complete

logger = logging.getLogger(__name__)

async def analyze_pr_stream(repo_url: str, pr_number: int) -> AsyncGenerator[str, None]:
    try:
        # Parse owner and repo from URL (e.g. https://github.com/owner/repo)
        parts = repo_url.rstrip("/").split("/")
        owner, repo_name = parts[-2], parts[-1]
        
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Fetching PR detail', 'percent': 10})}\n\n"
        
        pr_data = await get_pr(owner, repo_name, pr_number)
        original_description = pr_data.get("body") or ""
        
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Extracting diffs', 'percent': 20})}\n\n"
        
        diff_text = ""
        for f in pr_data.get("files", []):
            patch = f.get("patch")
            if patch:
                diff_text += f"\n--- {f['filename']} ---\n{patch}\n"
        
        if len(diff_text) > 80000:
            logger.warning(f"Truncating diff for PR {pr_number} from {len(diff_text)} to 80000 chars")
            diff_text = diff_text[:80000]

        from heuristics.pr_bundle import analyze_pr_heuristics

        heuristic_signals, pr_metrics, _, _preliminary_upi = analyze_pr_heuristics(
            pr_data, diff_text, comparison=None
        )
            
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Generating description from code', 'percent': 30})}\n\n"
        
        desc_prompt = (
            "You are a senior engineer. Read the following code diff and write a PR description "
            "explaining exactly what changes were made, why they were likely made, and what their effect is. "
            "Be specific. Reference file names and function names. Do not be vague.\n\nDiff:\n" + diff_text
        )
        generated_description = await chat_complete(desc_prompt)
        
        if original_description.strip():
            yield f"data: {json.dumps({'type': 'progress', 'step': 'Extracting claims', 'percent': 50})}\n\n"
            claims_prompt = (
                "Extract every factual claim from this PR description as a JSON array of strings. "
                "Each claim should be one testable statement. Return ONLY the JSON array.\n\n" + original_description
            )
            claims_response = await chat_complete(claims_prompt)
            try:
                claims_text = claims_response.strip()
                if claims_text.startswith("```json"): claims_text = claims_text[7:]
                if claims_text.startswith("```"): claims_text = claims_text[3:]
                if claims_text.endswith("```"): claims_text = claims_text[:-3]
                claims_list = json.loads(claims_text.strip())
            except Exception:
                claims_list = []
                
            yield f"data: {json.dumps({'type': 'progress', 'step': 'Comparing claims', 'percent': 75})}\n\n"
            compare_prompt = (
                "Given the generated PR description and the list of original claims, classify each claim. "
                "Return ONLY a JSON object matching this schema: { matches: [{claim, evidence, confidence}], "
                "missingClaims: [...], falseClaims: [...], partialClaims: [...] }. A claim is 'missing' if the "
                "generated description has no evidence for it. A claim is 'false' if the generated description "
                "contradicts it. A claim is 'partial' if there is weak supporting evidence.\n\n"
                f"Generated Description:\n{generated_description}\n\nClaims:\n{json.dumps(claims_list)}"
            )
            compare_response = await chat_complete(compare_prompt)
            try:
                comp_text = compare_response.strip()
                if comp_text.startswith("```json"): comp_text = comp_text[7:]
                if comp_text.startswith("```"): comp_text = comp_text[3:]
                if comp_text.endswith("```"): comp_text = comp_text[:-3]
                comparison = json.loads(comp_text.strip())
            except Exception:
                comparison = {"matches": [], "missingClaims": [], "falseClaims": [], "partialClaims": []}
                
            yield f"data: {json.dumps({'type': 'progress', 'step': 'Generating summary', 'percent': 90})}\n\n"
            summary_prompt = (
                "Write a short natural language paragraph summarizing the comparison between the original PR description "
                "and the actual code changes. Do not output JSON. Highlight any false or missing claims.\n\n" + json.dumps(comparison)
            )
            summary_response = await chat_complete(summary_prompt)
        else:
            yield f"data: {json.dumps({'type': 'progress', 'step': 'Generating summary', 'percent': 90})}\n\n"
            comparison = {"matches": [], "missingClaims": [], "falseClaims": [], "partialClaims": []}
            summary_response = "No PR description was provided, so no claims could be verified. " + generated_description[:300] + "..."
        
        mapped_claims = []
        flags = []
        for match in comparison.get("matches", []):
            mapped_claims.append({
                "claim": match.get("claim", ""),
                "verdict": "VERIFIED",
                "reason": match.get("evidence", ""),
                "confidence": float(match.get("confidence", 0.9) if match.get("confidence") is not None else 0.9)
            })
            
        for partial in comparison.get("partialClaims", []):
            mapped_claims.append({
                "claim": str(partial),
                "verdict": "UNVERIFIABLE",
                "reason": "Weak supporting evidence",
                "confidence": 0.5
            })
            
        for missing in comparison.get("missingClaims", []):
            claim_str = str(missing)
            mapped_claims.append({
                "claim": claim_str,
                "verdict": "MISMATCH",
                "reason": "Missing evidence in code",
                "confidence": 0.9
            })
            flags.append(f"Missing: {claim_str[:30]}...")
            
        for false_claim in comparison.get("falseClaims", []):
            claim_str = str(false_claim)
            mapped_claims.append({
                "claim": claim_str,
                "verdict": "MISMATCH",
                "reason": "Contradicted by actual code",
                "confidence": 0.9
            })
            flags.append(f"False claim: {claim_str[:30]}...")
            
        has_false = len(comparison.get("falseClaims", [])) > 0
        has_missing = len(comparison.get("missingClaims", [])) > 0
        has_partial = len(comparison.get("partialClaims", [])) > 0
        
        if has_false:
            verdict = "MISLEADING"
            confidence_score = 0.9
        elif has_missing or has_partial:
            verdict = "SUSPICIOUS"
            confidence_score = 0.7
        else:
            verdict = "TRUSTWORTHY"
            confidence_score = 0.85

        from heuristics.slop_index import compute_unchecked_publish_index, risks_from_pr_signals

        pr_claim_risk, hollow_risk = risks_from_pr_signals(heuristic_signals, comparison)
        unchecked_publish_index = compute_unchecked_publish_index(
            pr_claim_risk=pr_claim_risk,
            hollow_review_risk=hollow_risk,
            doc_fiction_risk=0.0,
        )

        result = {
            "prNumber": pr_number,
            "originalDescription": original_description,
            "generatedDescription": generated_description,
            "actual_summary": summary_response,
            "claims": mapped_claims,
            "verdict": verdict,
            "confidence_score": confidence_score,
            "flags": flags,
            "signals": [s.to_dict() for s in heuristic_signals],
            "pr_metrics": pr_metrics,
            "unchecked_publish_index": unchecked_publish_index,
        }
        
        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
        
    except Exception as e:
        logger.exception("Error in PR review stream")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
