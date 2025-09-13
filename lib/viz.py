# lib/viz.py
import streamlit as st
import pandas as pd

try:
    import matplotlib.pyplot as plt
    _HAS_MPL = True
except Exception:
    _HAS_MPL = False

def line_plot_timeline(df: pd.DataFrame, emotion_cols: list[str], title: str = "Emotion Timeline"):
    """
    If matplotlib is available, draw a line chart; otherwise fallback to Streamlit's line_chart.
    """
    if df.empty or not emotion_cols:
        st.info("No data to plot yet.")
        return

    if _HAS_MPL:
        fig, ax = plt.subplots()
        for col in emotion_cols:
            ax.plot(df.index, df[col], label=col)
        ax.set_xlabel("Segment")
        ax.set_ylabel("Score")
        ax.set_title(title)
        ax.legend(loc="best")
        st.pyplot(fig, clear_figure=True)
    else:
        st.info("Install `matplotlib` to use a labeled multi-line chart; showing fallback line chart.")
        st.line_chart(df[emotion_cols])
