# 🎬 EmotionFlow Timeline

Analyze scripts, lyrics, or stories and **visualize how emotions evolve over time**.  
Built with **Streamlit** (Python) for analysis and an optional **React** viewer for lightweight exploration.

---

## ✨ Features
- 📂 **Upload TXT** or ✍️ **Paste Text**
- 🧩 **Segmentation:** by sentences (bundled) or by word-count chunks
- 🎚️ **Smoothing** control to reduce noise
- 📈 **Emotion timeline** (multi-line chart)
- 🏷️ **Top-K emotions** & per-segment scores
- ⬇️ **Export CSV** for research or sharing

---

## 🧠 How it works
- Text is split into segments (sentences or word chunks)
- Each segment is scored for multiple emotions
- Scores are optionally smoothed (moving average)
- The result is an **interactive timeline** of emotion flow

> Back end (Streamlit) can run GoEmotions via Transformers; the React viewer ships with a demo lexicon scorer and can be wired to a real API later.

---

## 🛠️ Tech Stack
**Python:** Streamlit, Transformers (GoEmotions), PyTorch (CPU), pandas, matplotlib, wordcloud  
**Web:** React 18 (Vite), Chart.js (react-chartjs-2)

---

## 🚀 Run locally

### Streamlit (analysis)
```bash
# in project root
python -m venv .venv
# Windows PowerShell:
. .venv/Scripts/Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
streamlit run app.py
