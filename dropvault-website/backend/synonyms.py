SYNONYMS = {
    "diagram": ["chart", "figure", "visual"],
    "whiteboard": ["board", "presentation", "lecture"],
    "meeting": ["discussion", "call", "sync"],
    "notes": ["summary", "points", "writing"],
    "image": ["photo", "picture", "screenshot", "visual"],
    "video": ["recording", "clip", "movie"],
    "audio": ["voice", "speech", "sound", "recording"],
    "code": ["script", "program", "source"],
    "ai": ["machine learning", "neural network", "intelligence"],
    "money": ["revenue", "price", "cost", "billing"],
    "work": ["task", "project", "job"]
}

def expand_query(query):
    if not query:
        return ""
    words = query.lower().split()
    expanded = set(words)

    for w in words:
        # Clean word for lookup
        clean_w = "".join(filter(str.isalnum, w))
        if clean_w in SYNONYMS:
            expanded.update(SYNONYMS[clean_w])

    return " ".join(expanded)
