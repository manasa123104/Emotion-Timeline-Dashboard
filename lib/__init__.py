# lib/__init__.py
"""
Helper package for the Emotion Timeline project.

This package includes:
- models.py: loading Hugging Face emotion models
- text_utils.py: text cleaning, segmentation, scoring
- viz.py: visualization helpers
"""

from . import models
from . import text_utils
from . import viz

__all__ = ["models", "text_utils", "viz"]
