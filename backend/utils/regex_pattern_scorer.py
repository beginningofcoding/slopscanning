import re
from typing import Dict, Any, List

def score_match(match: Dict[str, Any]) -> Dict[str, Any]:
    score = 1.0
    skip = False
    reasons = []

    value = str(match.get("value", ""))
    file = str(match.get("file", ""))
    line_content = str(match.get("lineContent", ""))
    surrounding = match.get("surrounding", [])
    pattern_type = str(match.get("patternType", ""))

    clean_value = value.strip("'\"`")

    # Rule 1 & 2: Skip conditions
    if re.search(r'__tests__|__mocks__|\.test\.|spec\.', file, re.IGNORECASE):
        skip = True
        reasons.append("File is in a test or mock directory")
    if "node_modules" in file:
        skip = True
        reasons.append("File is in node_modules")

    # Rule 3
    if re.search(r'\.(example|sample|template)$', file, re.IGNORECASE):
        score -= 0.3
        reasons.append("File is an example or template")

    # Variable name heuristics
    var_match = re.search(r'\b([a-zA-Z0-9_]+)\s*[=:]', line_content)
    if var_match:
        var_name = var_match.group(1).lower()
        if any(w in var_name for w in ["test", "mock", "stub", "fake", "example", "sample", "demo"]):
            score -= 0.3
            reasons.append("Variable name indicates test/mock")
        if any(w in var_name for w in ["threshold", "limit", "max", "min", "default", "ttl", "timeout", "retry", "page", "size", "count"]):
            score -= 0.4
            reasons.append("Variable name indicates config/threshold")

    # Value is pure number
    if re.match(r'^-?\d+(\.\d+)?$', clean_value):
        score -= 0.5
        reasons.append("Value is a pure number")

    # Value is short all-caps name
    if re.match(r'^[A-Z_]+$', clean_value) and len(clean_value) < 30:
        score -= 0.3
        reasons.append("Value is a short all-caps name")

    # Surrounding lines check
    surrounding_text = "\n".join(surrounding)
    if "process.env" in surrounding_text or "os.environ" in surrounding_text:
        score -= 0.4
        reasons.append("Surrounding lines contain process.env")
        
    if clean_value and (f"import {clean_value}" in surrounding_text or f"require('{clean_value}')" in surrounding_text or f"require(\"{clean_value}\")" in surrounding_text):
        score -= 0.1
        reasons.append("Surrounding lines contain import/require of same name")

    # Line inside comment
    if re.match(r'^\s*(//|#|/\*)', line_content):
        score -= 0.3
        reasons.append("Line is inside a comment")

    # Realistic secret
    if re.match(r'^(sk-|pk-|gh[pousr]_|AIza)', clean_value) or (re.match(r'^[a-f0-9]{32,64}$', clean_value) and var_match and any(w in var_match.group(1).lower() for w in ["key", "secret", "token", "password", "credential"])):
        score += 0.5
        reasons.append("Value matches a realistic secret pattern")
    elif re.match(r'^[a-f0-9]{32,64}$', clean_value):
        score -= 0.8
        reasons.append("Hex string without secret variable name")
        
    if clean_value.startswith("Bearer "):
        score += 0.5
        reasons.append("Value is a Bearer token")

    # Pattern specific rules
    if pattern_type == "placeholder":
        if re.search(r'return\s+(null|undefined|true|false|0|""|\'\'|``)', line_content):
            score += 0.4
            reasons.append("Function returns a hardcoded primitive")
            
    if pattern_type == "dead-code" and match.get("noReferences", False):
        score += 0.3
        reasons.append("Symbol has no references in other files")
        
    if pattern_type == "hardcoded-url":
        if not re.search(r'//\s*(dev|local)', surrounding_text, re.IGNORECASE):
            score += 0.2
            reasons.append("Hardcoded URL without dev/local comment")

    if score < 0.4:
        skip = True

    return {
        "score": round(max(0.0, min(1.0, score)), 4),
        "reasons": reasons,
        "skip": skip
    }

HARDCODED_SECRETS = [
    re.compile(r"(['\"`])(sk-[a-zA-Z0-9]{20,})\1"),
    re.compile(r"(['\"`])(pk-[a-zA-Z0-9]{20,})\1"),
    re.compile(r"(['\"`])(gh[pousr]_[A-Za-z0-9_]{20,})\1"),
    re.compile(r"(['\"`])(AIza[0-9A-Za-z\-_]{35})\1"),
    re.compile(r"(['\"`])([a-f0-9]{32,64})\1"),
    re.compile(r"(Bearer\s+[A-Za-z0-9\-._~+/]+=*)")
]

PLACEHOLDERS = [
    re.compile(r"\bpass\b\s*$", re.MULTILINE),
    re.compile(r"return\s+(null|undefined|true|false|0|\"\"|''|``)(\s*;)?\s*/\/\s*(TODO|FIXME|HACK)", re.IGNORECASE),
    re.compile(r"/\/\s*(TODO|FIXME)(?!\s*\(#\d+\)).*implement", re.IGNORECASE),
    re.compile(r"throw\s+new\s+Error\s*\(\s*['\"`]not\s+implemented", re.IGNORECASE),
    re.compile(r"console\.log\s*\(.*\)\s*;\s*/\/\s*temp", re.IGNORECASE)
]

HARDCODED_URLS = [
    re.compile(r"https?://localhost(:\d+)?/[^\s'\"`,]+"),
    re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
]

FAKE_SUCCESS = [
    re.compile(r"return\s*\{\s*success\s*:\s*true\s*\}\s*;?\s*/\/", re.IGNORECASE),
    re.compile(r"res\.json\s*\(\s*\{\s*status\s*:\s*['\"`]ok['\"`]\s*\}\s*\)", re.IGNORECASE)
]