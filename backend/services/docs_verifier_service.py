import re
import os
import json
import logging
import tempfile
import subprocess
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, List
import Levenshtein

from services.fireworks_service import chat_complete

logger = logging.getLogger(__name__)

MARKETING_FLUFF = [
    "cutting-edge", "state-of-the-art", "revolutionary", "game-changing",
    "seamlessly", "effortlessly", "powerful", "robust", "scalable", "enterprise-grade",
    "world-class", "best-in-class", "next-generation", "industry-leading"
]

def clone_repo(repo_url: str, temp_dir: str):
    logger.info(f"Cloning {repo_url} into {temp_dir}")
    subprocess.run(["git", "clone", "--depth", "1", repo_url, temp_dir], check=True, capture_output=True)

def get_doc_files(repo_path: Path) -> List[Path]:
    files = []
    
    # Root level *.md
    for f in repo_path.glob("*.md"):
        files.append(f)
    for f in repo_path.glob("README.*.md"):
        if f not in files: files.append(f)
        
    # docs/**/*.md and .mdx
    docs_dir = repo_path / "docs"
    if docs_dir.exists():
        for f in docs_dir.rglob("*.md"): files.append(f)
        for f in docs_dir.rglob("*.mdx"): files.append(f)
        
    # Filter out skips
    valid_files = []
    for f in set(files):
        path_str = str(f.relative_to(repo_path)).lower()
        if "node_modules" in path_str or ".git" in path_str:
            continue
        if "changelog" in path_str or "license" in path_str or "licence" in path_str or "contributing" in path_str:
            continue
        valid_files.append(f)
        
    return valid_files

def is_installation_section(heading: str) -> bool:
    h = heading.lower()
    return any(w in h for w in ["install", "setup", "getting started", "prerequisites", "requirements"])

def analyze_docs_file(file_path: Path, repo_path: Path, all_source_words: set) -> List[Dict[str, Any]]:
    findings = []
    try:
        content = file_path.read_text(errors="replace")
    except Exception:
        return findings

    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
    lines = content.splitlines()
    
    # Track headings to know if we are in an installation section
    current_heading = ""
    in_code_block = False
    
    for i, line in enumerate(lines):
        line_num = i + 1
        stripped = line.strip()
        
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            continue
            
        if stripped.startswith("#"):
            current_heading = stripped
            continue
            
        if in_code_block or is_installation_section(current_heading):
            continue
            
        if "node_modules" in line or ".env" in line:
            continue
            
        # Placeholder detector
        placeholder_match = re.search(r'\[your (company|product|name|description|feature)\]|lorem ipsum|TODO:\s*(write|add|update|fill|complete)|coming soon|\(placeholder\)|insert .{3,50} here', line, re.IGNORECASE)
        if placeholder_match:
            findings.append({
                "severity": "high",
                "type": "placeholder-content",
                "lines": [line_num],
                "excerpt": line[:200],
                "explanation": "Contains placeholder or incomplete text."
            })
            
        # Outdated version reference
        version_match = re.search(r'(?i)(?:v\d+\.\d+\.\d+|version \d+\.\d+)', line)
        if version_match:
            findings.append({
                "severity": "low",
                "type": "outdated-version",
                "lines": [line_num],
                "excerpt": line[:200],
                "explanation": f"Version reference found ({version_match.group(0)}). Manual verification needed."
            })
            
        # Dead feature reference
        if all_source_words is not None:
            code_spans = re.findall(r'`([^`\s]+)`', line)
            for span in code_spans:
                # simple heuristic: if it's alphanumeric and looks like a symbol
                if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', span):
                    if span not in all_source_words:
                        findings.append({
                            "severity": "medium",
                            "type": "dead-feature-reference",
                            "lines": [line_num],
                            "excerpt": line[:200],
                            "explanation": f"Identifier `{span}` not found anywhere in source code."
                        })

    # Repeated paragraph & Template fluff & Contradictory claims
    # (Checking paragraphs rather than lines)
    norm_paragraphs = []
    for p in paragraphs:
        if p.startswith("```") or p.startswith("#"): 
            norm_paragraphs.append("")
            continue
        norm = re.sub(r'[^\w\s]', '', p.lower())
        norm = re.sub(r'\s+', ' ', norm).strip()
        norm_paragraphs.append(norm)
        
    for idx, (p, norm) in enumerate(zip(paragraphs, norm_paragraphs)):
        if not norm or len(norm) < 50:
            continue
            
        # Marketing fluff
        fluff_count = sum(1 for w in MARKETING_FLUFF if w in norm)
        if fluff_count >= 3:
            findings.append({
                "severity": "low",
                "type": "marketing-fluff",
                "lines": [],
                "excerpt": p[:200],
                "explanation": "Paragraph contains excessive marketing buzzwords."
            })
            
        # Repeated paragraphs
        for j in range(idx + 1, len(paragraphs)):
            norm2 = norm_paragraphs[j]
            if len(norm2) > 50:
                similarity = Levenshtein.ratio(norm, norm2)
                if similarity > 0.85:
                    findings.append({
                        "severity": "medium",
                        "type": "repeated-paragraph",
                        "lines": [],
                        "excerpt": p[:200],
                        "explanation": "Paragraph is highly similar to another paragraph in the document."
                    })
                    
        # Contradictory claim (simplified heuristic)
        if "supports " in norm and "does not support " in norm:
            findings.append({
                "severity": "medium",
                "type": "contradictory-claim",
                "lines": [],
                "excerpt": p[:200],
                "description": "Paragraph contains potentially contradictory claims.",
                "explanation": "Paragraph contains potentially contradictory claims."
            })
            
    # Map explanation to description for frontend
    for f in findings:
        if "description" not in f:
            f["description"] = f.get("explanation", "")

    from heuristics.doc_concreteness_heuristic import analyze_markdown_concreteness

    rel = str(file_path.relative_to(repo_path)) if repo_path else file_path.name
    _, concrete_findings = analyze_markdown_concreteness(content, rel)
    for cf in concrete_findings:
        if "description" not in cf:
            cf["description"] = cf.get("explanation", "")
    findings.extend(concrete_findings)

    return findings

async def analyze_docs_stream(repo_url: str) -> AsyncGenerator[str, None]:
    if not repo_url.startswith("http"):
        repo_url = f"https://github.com/{repo_url}"
        
    temp_dir = tempfile.mkdtemp(prefix="slop_docs_")
    try:
        from services.llm_analysis_service import verify_claims_qwen
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Cloning repository', 'percent': 10})}\n\n"
        
        await asyncio.to_thread(clone_repo, repo_url, temp_dir)
        repo_path = Path(temp_dir)
        
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Extracting source context', 'percent': 30})}\n\n"
        
        doc_files = get_doc_files(repo_path)
        
        source_code_context = ""
        for ext in ["*.js", "*.ts", "*.jsx", "*.tsx", "*.py", "*.go", "*.rs", "*.java", "*.cpp"]:
            for sf in repo_path.rglob(ext):
                path_str = str(sf).lower()
                if "node_modules" in path_str or "dist" in path_str or ".next" in path_str:
                    continue
                try:
                    content = sf.read_text(errors="ignore")
                    if len(content) > 10000:
                        content = content[:10000] + "\n...[truncated]"
                    source_code_context += f"\n--- {str(sf.relative_to(repo_path))} ---\n{content}\n"
                    if len(source_code_context) > 100000:
                        break
                except:
                    pass
            if len(source_code_context) > 100000:
                break
                
        source_code_context = source_code_context[:100000]
        all_source_words = None # disable dead feature checks to avoid regex overhead on large codebases
        
        all_findings = []
        doc_results = []
        for f in doc_files:
            file_findings = analyze_docs_file(f, repo_path, all_source_words)
            try:
                content = f.read_text(errors="replace")
            except:
                content = ""
                
            doc_results.append({
                "path": str(f.relative_to(repo_path)),
                "content": content,
                "findings": file_findings
            })
            if file_findings:
                all_findings.extend(file_findings)

        from heuristics.doc_drift_heuristic import check_readme_vs_manifest

        _, drift_findings = check_readme_vs_manifest(repo_path)
        for df in drift_findings:
            if "description" not in df:
                df["description"] = df.get("explanation", "")
        all_findings.extend(drift_findings)
        readme_doc = next((d for d in doc_results if "readme.md" in d["path"].lower()), None)
        if drift_findings:
            if readme_doc:
                readme_doc["findings"].extend(drift_findings)
            elif doc_results:
                doc_results[0]["findings"].extend(drift_findings)

        yield f"data: {json.dumps({'type': 'progress', 'step': 'Extracting README claims', 'percent': 50})}\n\n"
        claims_list = []
        
        if readme_doc and readme_doc["content"]:
            claims_prompt = (
                "Extract every factual claim about features, architecture, and tech stack from this README as a JSON array of strings. "
                "Each claim should be one testable statement. Return ONLY the JSON array.\n\n" + readme_doc["content"]
            )
            claims_response = await chat_complete(claims_prompt)
            try:
                claims_text = claims_response.strip()
                if claims_text.startswith("```json"): claims_text = claims_text[7:]
                if claims_text.startswith("```"): claims_text = claims_text[3:]
                if claims_text.endswith("```"): claims_text = claims_text[:-3]
                claims_list = json.loads(claims_text.strip())
            except:
                claims_list = []
                
        comparison = {"matches": [], "missingClaims": [], "falseClaims": [], "partialClaims": []}
        if claims_list:
            yield f"data: {json.dumps({'type': 'progress', 'step': 'Verifying claims via AI', 'percent': 70})}\n\n"
            comparison = await verify_claims_qwen(claims_list, source_code_context)
            
            mapped_findings = []
            for missing in comparison.get("missingClaims", []):
                mapped_findings.append({
                    "severity": "medium",
                    "type": "missing-feature",
                    "lines": [],
                    "description": f"Missing feature: {missing}",
                    "explanation": f"Claimed '{missing}' but not found in source."
                })
            for false_claim in comparison.get("falseClaims", []):
                mapped_findings.append({
                    "severity": "high",
                    "type": "false-claim",
                    "lines": [],
                    "description": f"False claim: {false_claim}",
                    "explanation": f"Claimed '{false_claim}' but contradicted by source."
                })
                
            if readme_doc:
                readme_doc["findings"].extend(mapped_findings)
                all_findings.extend(mapped_findings)
                
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Generating final report', 'percent': 90})}\n\n"
        
        total_claims = len(comparison.get("matches", [])) + len(comparison.get("missingClaims", [])) + len(comparison.get("falseClaims", [])) + len(comparison.get("partialClaims", []))
        verified_claims = len(comparison.get("matches", []))
        false_claims = len(comparison.get("falseClaims", []))
        missing_claims = len(comparison.get("missingClaims", []))
        
        if total_claims > 0:
            base_quality = verified_claims / total_claims
            base_slop = (false_claims + missing_claims * 0.5) / total_claims
        else:
            base_quality = 1.0
            base_slop = 0.0
            
        heuristic_penalty = 0.0
        for finding in all_findings:
            # Avoid double-counting false claims as they are already in base_slop if total_claims > 0
            if total_claims > 0 and finding.get("type") in ["false-claim", "missing-feature"]:
                continue
            sev = finding.get("severity", "low")
            if sev == "high":
                heuristic_penalty += 0.1
            elif sev == "medium":
                heuristic_penalty += 0.05
            else:
                heuristic_penalty += 0.02
                
        quality_score = max(0.0, min(1.0, base_quality - heuristic_penalty))
        slop_score = max(0.0, min(1.0, base_slop + heuristic_penalty))
        
        if not all_findings:
            summary_text = "No documentation quality issues were found during the scan."
        else:
            summary_prompt = (
                "Summarize the documentation quality issues found in this repository. Be concise and actionable. "
                "You MUST explicitly mention the exact doc/code snippets where issues lie. "
                "Highlight the issues using HTML, for example `<span style=\"color: var(--color-red); font-weight: 600;\">issue text</span>`. "
                "Group by severity. Do not repeat individual findings verbatim.\n\nFindings:\n" + 
                json.dumps(all_findings, indent=2)
            )
            summary_text = await chat_complete(summary_prompt)
        
        actionable = []
        for f in all_findings:
            if "description" in f and f["description"] not in actionable:
                actionable.append(f["description"])
                
        result = {
            "files": doc_results,
            "summary": {
                "executive_summary": summary_text,
                "quality_score": quality_score,
                "slop_score": slop_score,
                "actionable_fixes": actionable
            }
        }
        
        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
        
    except Exception as e:
        logger.exception("Error in docs verifier stream")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)