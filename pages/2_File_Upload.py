# pages/2_File_Upload.py
import streamlit as st
import pandas as pd
from lib.models import load_emotion_pipeline, ready
from lib.text_utils import (
    split_by_sentences, split_by_tokens_approx, score_segments,
    top_emotions, rolling_mean, attach_timeline_table, export_csv
)
from lib.viz import line_plot_timeline

st.sidebar.header("File Upload")
seg_method = st.sidebar.selectbox("Segmentation method", ["By sentences (x per chunk)", "By approx tokens (words)"])
if seg_method == "By sentences (x per chunk)":
    chunk_param = st.sidebar.number_input("Sentences per chunk", min_value=1, max_value=10, value=3, step=1)
else:
    chunk_param = st.sidebar.number_input("Approx words per chunk", min_value=50, max_value=1000, value=350, step=50)

smooth_window = st.sidebar.number_input("Smoothing window (segments)", min_value=1, max_value=20, value=1, step=1)
topk = st.sidebar.number_input("Plot top-K emotions", min_value=1, max_value=10, value=5, step=1)

st.title("Emotion Timeline — File Upload")
st.caption("Upload a TXT file with your script or lyrics.")

if not ready():
    st.error("Models not ready. Install `transformers` and either `torch` or `tensorflow`.")
else:
    emo_pipe, e_err = load_emotion_pipeline()
    if e_err:
        st.warning(e_err)

    file = st.file_uploader("Upload .txt file", type=["txt"])
    run = st.button("Analyze", disabled=bool(e_err) or (file is None))

    if run and file is not None:
        text = file.read().decode("utf-8", errors="ignore")
        with st.spinner("Scoring emotions…"):
            if seg_method == "By sentences (x per chunk)":
                segments = split_by_sentences(text, max_sent_per_chunk=int(chunk_param))
            else:
                segments = split_by_tokens_approx(text, chunk_size=int(chunk_param))

            if not segments:
                st.info("No segments found. Try smaller chunk size.")
            else:
                scores = score_segments(emo_pipe, segments)
                smoothed = rolling_mean(scores, window=int(smooth_window))
                to_plot = top_emotions(scores, k=int(topk))

                st.subheader("Timeline")
                line_plot_timeline(smoothed, to_plot, title="Top Emotions Over Segments")

                st.subheader("Details")
                table = attach_timeline_table(segments, scores)
                st.dataframe(table, use_container_width=True)

                csv_bytes = export_csv(table)
                st.download_button(
                    "Download CSV",
                    data=csv_bytes,
                    file_name="emotion_timeline.csv",
                    mime="text/csv"
                )

                st.markdown("### Mean scores (all emotions)")
                st.dataframe(scores.mean(axis=0).sort_values(ascending=False).rename("mean_score"))
