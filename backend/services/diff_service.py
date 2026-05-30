import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Extension-to-type mapping
# ---------------------------------------------------------------------------
_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs", ".c", ".cpp",
    ".h", ".hpp", ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".lua",
    ".r", ".m", ".mm", ".pl", ".pm", ".sh", ".bash", ".zsh", ".fish",
    ".ps1", ".bat", ".cmd", ".awk", ".sed", ".sql", ".ex", ".exs",
    ".erl", ".hs", ".ml", ".clj", ".cljs", ".lisp", ".el", ".vim",
    ".dart", ".jl", ".f90", ".f95", ".v", ".sv", ".vhd", ".zig",
    ".nim", ".cr", ".groovy", ".gradle",
}
_CONFIG_EXTENSIONS = {
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".env",
    ".xml", ".properties", ".plist", ".hcl", ".tf", ".tfvars",
    ".editorconfig", ".eslintrc", ".prettierrc", ".babelrc",
}
_DOC_EXTENSIONS = {
    ".md", ".rst", ".txt", ".adoc", ".tex", ".org", ".wiki",
}
_ASSET_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".webp",
    ".mp3", ".mp4", ".wav", ".ogg", ".woff", ".woff2", ".ttf", ".eot",
    ".otf", ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz",
}
_TEST_PATTERNS = re.compile(
    r"(^|/)tests?/|test_[^/]+$|_test\.[^.]+$|\.test\.[^.]+$|\.spec\.[^.]+$|"
    r"(^|/)__tests__/",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class DiffLine:
    type: str  # 'add', 'remove', 'context'
    number: int | None
    content: str


@dataclass
class DiffHunk:
    old_start: int
    old_count: int
    new_start: int
    new_count: int
    lines: list[DiffLine] = field(default_factory=list)


@dataclass
class FileDiff:
    filename: str
    old_filename: str | None
    added_lines: list[str] = field(default_factory=list)
    removed_lines: list[str] = field(default_factory=list)
    hunks: list[DiffHunk] = field(default_factory=list)
    file_type: str = "unknown"


@dataclass
class DiffStats:
    files_changed: int
    insertions: int
    deletions: int


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def classify_file_type(filename: str) -> str:
    """Classify a filename into one of: code, config, docs, asset, test, unknown."""
    if _TEST_PATTERNS.search(filename):
        return "test"

    # Extract extension (including compound like .d.ts)
    lower = filename.lower()
    dot_idx = lower.rfind(".")
    if dot_idx == -1:
        # Files with no extension – check known names
        basename = lower.rsplit("/", 1)[-1]
        if basename in {
            "makefile", "dockerfile", "jenkinsfile", "vagrantfile",
            "gemfile", "rakefile", "procfile", "cmakelists.txt",
        }:
            return "config"
        if basename in {"readme", "changelog", "license", "authors", "contributing"}:
            return "docs"
        return "unknown"

    ext = lower[dot_idx:]

    if ext in _CODE_EXTENSIONS:
        return "code"
    if ext in _CONFIG_EXTENSIONS:
        return "config"
    if ext in _DOC_EXTENSIONS:
        return "docs"
    if ext in _ASSET_EXTENSIONS:
        return "asset"

    # Lock files are config
    if lower.endswith(".lock") or lower.endswith("-lock.json"):
        return "config"

    return "unknown"


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

_DIFF_HEADER_RE = re.compile(r"^diff --git a/(.*) b/(.*)$")
_HUNK_HEADER_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
_BINARY_RE = re.compile(r"^Binary files .* differ$")


def parse_patch(raw_diff: str) -> list[FileDiff]:
    """Parse a complete unified diff string into a list of FileDiff objects."""
    if not raw_diff or not raw_diff.strip():
        return []

    file_diffs: list[FileDiff] = []
    current_file: FileDiff | None = None
    current_hunk: DiffHunk | None = None
    old_line = 0
    new_line = 0

    lines = raw_diff.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        # ------ File header ------
        header_match = _DIFF_HEADER_RE.match(line)
        if header_match:
            old_path = header_match.group(1)
            new_path = header_match.group(2)

            # Finalise previous file
            if current_file is not None:
                file_diffs.append(current_file)

            old_filename: str | None = old_path if old_path != new_path else None
            current_file = FileDiff(
                filename=new_path,
                old_filename=old_filename,
                file_type=classify_file_type(new_path),
            )
            current_hunk = None
            i += 1
            continue

        # ------ Binary marker ------
        if _BINARY_RE.match(line):
            # Skip binary files – keep the FileDiff but with no hunks
            i += 1
            continue

        # ------ --- / +++ lines ------
        if line.startswith("--- "):
            if current_file is not None:
                stripped = line[4:]
                if stripped == "/dev/null":
                    current_file.old_filename = None
                elif stripped.startswith("a/"):
                    prev_name = stripped[2:]
                    if prev_name != current_file.filename:
                        current_file.old_filename = prev_name
            i += 1
            continue

        if line.startswith("+++ "):
            if current_file is not None:
                stripped = line[4:]
                if stripped == "/dev/null":
                    # Deleted file – keep the filename from the header
                    pass
                elif stripped.startswith("b/"):
                    current_file.filename = stripped[2:]
                    current_file.file_type = classify_file_type(current_file.filename)
            i += 1
            continue

        # ------ Hunk header ------
        hunk_match = _HUNK_HEADER_RE.match(line)
        if hunk_match:
            old_start = int(hunk_match.group(1))
            old_count = int(hunk_match.group(2)) if hunk_match.group(2) else 1
            new_start = int(hunk_match.group(3))
            new_count = int(hunk_match.group(4)) if hunk_match.group(4) else 1

            current_hunk = DiffHunk(
                old_start=old_start,
                old_count=old_count,
                new_start=new_start,
                new_count=new_count,
            )
            if current_file is not None:
                current_file.hunks.append(current_hunk)

            old_line = old_start
            new_line = new_start
            i += 1
            continue

        # ------ Diff content lines ------
        if current_hunk is not None and current_file is not None:
            if line.startswith("+"):
                content = line[1:]
                current_hunk.lines.append(DiffLine(type="add", number=new_line, content=content))
                current_file.added_lines.append(content)
                new_line += 1
            elif line.startswith("-"):
                content = line[1:]
                current_hunk.lines.append(DiffLine(type="remove", number=old_line, content=content))
                current_file.removed_lines.append(content)
                old_line += 1
            elif line.startswith(" "):
                content = line[1:]
                current_hunk.lines.append(DiffLine(type="context", number=new_line, content=content))
                old_line += 1
                new_line += 1
            elif line.startswith("\\"):
                # "\ No newline at end of file" – skip
                pass

        i += 1

    # Append last file
    if current_file is not None:
        file_diffs.append(current_file)

    return file_diffs


def get_diff_stats(diffs: list[FileDiff]) -> DiffStats:
    """Compute aggregate diff statistics."""
    insertions = sum(len(fd.added_lines) for fd in diffs)
    deletions = sum(len(fd.removed_lines) for fd in diffs)
    return DiffStats(
        files_changed=len(diffs),
        insertions=insertions,
        deletions=deletions,
    )
