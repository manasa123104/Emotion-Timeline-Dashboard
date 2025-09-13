# lib/text_utils.py
from __future__ import annotations
from typing import List, Tuple, Literal
import re
import math
import pandas as pd

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def split_by_sentences(text: str, max_sent_per_chunk: int = 3) -> List[str]:
    # quick sentence split (period, ?, !). For production, use nltk or spacy.
    sentences = re.split(r"(?<=[\.\?\!])\s+", clean_text(text))
    chunk, chunks = [], []
    for sent in sentences:
        if sent:
            chunk.append(sent)
            if len(chunk) >= max_sent_per_chunk:
                chunks.append(" ".join(chunk))
                chunk = []
    if chunk:
        chunks.append(" ".join(chunk))
    return chunks

def split_by_tokens_approx(text: str, chunk_size: int = 350) -> List[str]:
    # simple whitespace chunking as token proxy (approx)
    words = clean_text(text).split()
    if not words:
        return []
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunks.append(" ".join(words[i:i+chunk_size]))
    return chunks

def score_segments(emo_pipe, segments: List[str]) -> pd.DataFrame:
    """
    Returns a DataFrame: columns = emotions, index = segment index, values = scores [0..1].
    """
    if not segments:
        return pd.DataFrame()
    # emo_pipe(segments) -> list[list[{'label','score'}]]
    raw = emo_pipe(segments)
    # collect all labels dynamically
    labels = sorted({item["label"] for row in raw for item in row})
    rows = []
    for row in raw:
        d = {item["label"]: item["score"] for item in row}
        rows.append([d.get(lbl, 0.0) for lbl in labels])
    df = pd.DataFrame(rows, columns=labels)
    df.index.name = "segment"
    return df

def top_emotions(df: pd.DataFrame, k: int = 5) -> List[str]:
    if df.empty:
        return []
    mean_scores = df.mean(axis=0).sort_values(ascending=False)
    return mean_scores.head(k).index.tolist()

def rolling_mean(df: pd.DataFrame, window: int = 1) -> pd.DataFrame:
    window = max(1, int(window))
    return df.rolling(window=window, min_periods=1).mean()

def attach_timeline_table(segments: List[str], scores: pd.DataFrame) -> pd.DataFrame:
    out = scores.copy()
    out.insert(0, "text", segments)
    out.insert(0, "segment", range(1, len(segments) + 1))
    return out

def export_csv(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8")
