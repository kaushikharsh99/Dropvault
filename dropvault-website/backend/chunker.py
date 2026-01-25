def split_text(text, max_words=300):
    """
    Splits text into chunks of at most max_words.
    Ideally, this would split by sentence or paragraph, but word count is a safe fallback.
    """
    if not text:
        return
    words = text.split()
    for i in range(0, len(words), max_words):
        yield " ".join(words[i:i+max_words])
