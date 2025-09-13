# app.py
import os
import streamlit as st

# ✅ Force sidebar open on app load
st.set_page_config(
    page_title="Emotion Timeline",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ------------------------------
# Landing Page
# ------------------------------
st.title("🎬 Emotion Timeline from Scripts / Lyrics")
st.markdown(
    "Welcome to the **Emotion Timeline Dashboard**! "
    "Upload a movie script, dialogue, or song lyrics and explore how "
    "emotions evolve throughout the text."
)

st.markdown("### 🔹 How it works")
st.markdown(
    "1. The text is split into segments (by sentences or fixed length).  \n"
    "2. Each segment is scored across ~28 emotions using the **GoEmotions** model.  \n"
    "3. The top emotions are plotted as a timeline, with tables and downloads available.  \n"
)

st.success("👉 Use the sidebar to switch pages, or use the quick links below:")

# ------------------------------
# Quick Navigation
# ------------------------------
col1, col2 = st.columns(2)
with col1:
    st.page_link("pages/1_Text_Input.py", label="✍️ Paste Text Manually")
with col2:
    st.page_link("pages/2_File_Upload.py", label="📂 Upload a TXT File")

# ------------------------------
# Footer
# ------------------------------
st.markdown("---")
st.caption("Built with ❤️ using Streamlit and Hugging Face GoEmotions")
