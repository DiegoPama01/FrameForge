import re

def clean_reddit_text(text: str) -> str:
    """
    Strips Reddit footers and normalizes whitespace.
    """
    if not text:
        return ""

    lines = text.splitlines()
    clean_lines = []
    for line in lines:
        l = line.strip().lower()
        # Reddit footer markers
        if l == "submitted by" or (l.startswith("submitted by") and "/" in l) or l.startswith("/u/"):
            break
        if l == "[link]" or l == "[comments]":
            break
        clean_lines.append(line)
    
    text = "\n".join(clean_lines).strip()
    
    # Normalize empty lines: max 2 consecutive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text
