# lib/models.py
import os
import streamlit as st

# backend probes
try:
    import torch  # noqa: F401
    _HAS_TORCH = True
except Exception:
    _HAS_TORCH = False

try:
    import tensorflow as tf  # noqa: F401
    _HAS_TF = True
except Exception:
    _HAS_TF = False

try:
    from transformers import pipeline
    _HAS_TRANSFORMERS = True
except Exception:
    _HAS_TRANSFORMERS = False

EMOTION_MODEL_ID = "joeddav/distilbert-base-uncased-go-emotions-student"
EMOTION_MODEL_REV = os.getenv("EMO_TIMELINE_REV", "main")  # pinned revision optional

def backend_framework():
    if _HAS_TORCH:
        return "pt"
    if _HAS_TF:
        return "tf"
    return None

def ready():
    return _HAS_TRANSFORMERS and (backend_framework() is not None)

@st.cache_resource(show_spinner=True)
def load_emotion_pipeline():
    """
    Returns (pipeline_or_None, error_msg_or_None).
    The pipeline returns a list of dicts with 'label' and 'score' when return_all_scores=True.
    """
    if not _HAS_TRANSFORMERS:
        return None, "Missing `transformers`. Install: pip install transformers"
    fw = backend_framework()
    if fw is None:
        return None, "Install a backend: PyTorch (`pip install torch`) or TensorFlow (`pip install tensorflow`)."
    try:
        kwargs = {
            "model": EMOTION_MODEL_ID,
            "revision": EMOTION_MODEL_REV,
            "framework": fw,
            "return_all_scores": True,
            "device": -1,  # CPU for safety
        }
        pl = pipeline("text-classification", **kwargs)
        return pl, None
    except Exception as e:
        return None, f"Failed to load GoEmotions pipeline: {e}"
