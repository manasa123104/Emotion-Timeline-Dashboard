import { useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler);

// --------- tiny helpers ----------
const palette = ["#2563eb","#f97316","#16a34a","#9333ea","#ef4444","#0ea5e9","#22c55e","#eab308"];

const smoothMA = (arr, k = 1) => {
  if (!k || k <= 1) return arr;
  const half = Math.floor(k / 2);
  return arr.map((_, i) => {
    const s = Math.max(0, i - half);
    const e = Math.min(arr.length, i + half + 1);
    const slice = arr.slice(s, e);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
};

// naive sentence splitter
const splitSentences = (text) =>
  text
    .split(/(?<=[\.\!\?])\s+|\n+/g)
    .map(s => s.trim())
    .filter(Boolean);

// chunk by words
const chunkByWords = (text, wordsPerChunk) => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
};

// demo lexicon (client-only scoring). Replace with API later if you wish.
const LEXICON = {
  joy:      ["happy","joy","glad","delight","smile","cheer","love","grateful","bliss"],
  anger:    ["angry","furious","rage","mad","annoyed","betrayed","hate"],
  sadness:  ["sad","down","cry","tears","hurt","lonely","grief","broken"],
  fear:     ["afraid","scared","fear","terrified","anxious","worry","panic"],
  surprise: ["surprised","shocked","astonished","unexpected","sudden","wow"],
  trust:    ["trust","faith","rely","depend","secure","safe","confident"],
  disgust:  ["disgust","gross","nausea","repulse","revolt","vile"],
  love:     ["love","adore","dear","beloved","fond","cherish","sweetheart"]
};
const EMOTIONS = Object.keys(LEXICON);

// simple score: (#emotion words)/(#words), clamped to [0..1]
function scoreSegment(text) {
  const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const denom = Math.max(8, tokens.length);
  const counts = {};
  for (const emo of EMOTIONS) counts[emo] = 0;
  for (const t of tokens) {
    for (const emo of EMOTIONS) {
      if (LEXICON[emo].includes(t)) counts[emo] += 1;
    }
  }
  const scores = {};
  for (const emo of EMOTIONS) scores[emo] = Math.min(1, counts[emo] / denom);
  return scores;
}

function toCSV(rows, headers) {
  const esc = (v) => `"${String(v).replace(/"/g,'""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map(h => esc(r[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export default function App() {
  // inputs
  const [mode, setMode] = useState("paste"); // 'paste' | 'file'
  const [text, setText] = useState("");
  const [method, setMethod] = useState("sentences"); // 'sentences' | 'words'
  const [wordsPerChunk, setWordsPerChunk] = useState(60);
  const [smoothK, setSmoothK] = useState(3);
  const [topK, setTopK] = useState(5);

  // data
  const [segments, setSegments] = useState([]); // [{segment, ...emotionScores}]
  const [selected, setSelected] = useState(new Set()); // chosen emotions
  const [error, setError] = useState("");

  const fileRef = useRef(null);

  const handleFile = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Please upload a .txt file.");
      return;
    }
    const content = await file.text();
    setText(content);
    setMode("file");
  };

  const analyze = () => {
    setError("");
    const raw = text?.trim();
    if (!raw) {
      setError("Please paste text or upload a .txt file.");
      return;
    }
    let segs = [];
    if (method === "sentences") {
      const sents = splitSentences(raw);
      const approx = Math.max(20, wordsPerChunk);
      let bucket = [];
      let wc = 0;
      for (const s of sents) {
        const w = s.split(/\s+/).filter(Boolean).length;
        bucket.push(s);
        wc += w;
        if (wc >= approx) {
          segs.push(bucket.join(" "));
          bucket = [];
          wc = 0;
        }
      }
      if (bucket.length) segs.push(bucket.join(" "));
    } else {
      segs = chunkByWords(raw, Math.max(10, Number(wordsPerChunk) || 60));
    }

    const rows = segs.map((s, i) => {
      const em = scoreSegment(s);
      return { segment: i + 1, text: s.slice(0, 140), ...em };
    });
    setSegments(rows);
    setSelected(new Set()); // let default top-K choose
  };

  const csvDownload = () => {
    if (!segments.length) return;
    const headers = ["segment","text", ...EMOTIONS];
    const csv = toCSV(segments, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "emotion_timeline.csv";
    a.click();
  };

  const emotionCols = EMOTIONS;

  // default top-K emotions by mean
  const defaultSelected = useMemo(() => {
    if (!segments.length) return new Set();
    const means = emotionCols.map(e => {
      const m = segments.reduce((a, r) => a + Number(r[e] || 0), 0) / segments.length;
      return { e, m };
    }).sort((a,b) => b.m - a.m).slice(0, Math.max(1, Number(topK)||5));
    return new Set(means.map(x => x.e));
  }, [segments, topK]);

  const activeEmos = selected.size ? selected : defaultSelected;

  const chart = useMemo(() => {
    if (!segments.length) return null;
    const labels = segments.map(r => r.segment);
    const datasets = Array.from(activeEmos).map((emo, i) => {
      const raw = segments.map(r => Number(r[emo] || 0));
      const ys = smoothMA(raw, Number(smoothK) || 1);
      const color = palette[i % palette.length];
      return {
        label: emo,
        data: ys,
        borderColor: color,
        backgroundColor: color + "33",
        tension: 0.25,
        fill: false,
        pointRadius: 0
      };
    });
    return { labels, datasets };
  }, [segments, activeEmos, smoothK]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: "Segment" } },
      y: { title: { display: true, text: "Score (0–1)" }, min: 0, max: 1 }
    },
    plugins: { legend: { position: "bottom" } }
  }), []);

  const toggleEmo = (emo) => {
    const next = new Set(selected);
    next.has(emo) ? next.delete(emo) : next.add(emo);
    setSelected(next);
  };

  return (
    <div className="wrap">
      <header className="header">
        <h1>🎬 EmotionFlow Timeline — React Viewer</h1>
        <p>Upload a <b>.txt</b> file or paste text, then analyze and visualize emotion flow over time.</p>
      </header>

      <main className="grid">
        <section className="card">
          <div className="row">
            <label className="label">Input</label>
            <button onClick={() => setMode("paste")} className={mode==="paste" ? "btn on" : "btn"}>Paste Text</button>
            <button onClick={() => setMode("file")} className={mode==="file" ? "btn on" : "btn"}>Upload TXT</button>
          </div>

          {mode === "file" ? (
            <div className="row">
              <input type="file" accept=".txt" ref={fileRef} onChange={handleFile} />
            </div>
          ) : (
            <div className="row">
              <textarea
                rows={8}
                placeholder="✍️ Paste your script, lyrics, or story here…"
                value={text}
                onChange={e => setText(e.target.value)}
                className="ta"
              />
            </div>
          )}

          <div className="row controls">
            <label>Segmentation</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              <option value="sentences">By sentences (bundled)</option>
              <option value="words">By word count</option>
            </select>

            {method === "words" && (
              <label>
                Words / chunk
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={wordsPerChunk}
                  onChange={e => setWordsPerChunk(Number(e.target.value || 60))}
                />
              </label>
            )}

            <label>
              Smoothing
              <input
                type="number"
                min="1"
                max="15"
                value={smoothK}
                onChange={e => setSmoothK(Number(e.target.value || 1))}
              />
            </label>

            <label>
              Top emotions
              <input
                type="number"
                min="1"
                max="8"
                value={topK}
                onChange={e => setTopK(Number(e.target.value || 5))}
              />
            </label>

            <button className="btn primary" onClick={analyze}>Analyze</button>
            <button className="btn" onClick={() => { setSegments([]); setSelected(new Set()); }}>Reset</button>
            <button className="btn" onClick={csvDownload} disabled={!segments.length}>Download CSV</button>
          </div>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="card chart">
          {chart ? <Line data={chart} options={options} /> : <div className="empty">No timeline yet. Paste or upload text, then click <b>Analyze</b>.</div>}
        </section>

        <section className="card">
          <h3>Emotions</h3>
          <div className="pills">
            {EMOTIONS.map((emo, i) => {
              const on = (selected.size ? selected : defaultSelected).has(emo);
              return (
                <span
                  key={emo}
                  className={`pill ${on ? "on": ""}`}
                  style={{ borderColor: palette[i % palette.length] }}
                  onClick={() => toggleEmo(emo)}
                >
                  {emo}
                </span>
              );
            })}
          </div>
        </section>

        {!!segments.length && (
          <section className="card">
            <h3>Preview (first 10 segments)</h3>
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>segment</th>
                    <th>text</th>
                    {EMOTIONS.map(e => <th key={e}>{e}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {segments.slice(0,10).map((r,i)=>(
                    <tr key={i}>
                      <td>{r.segment}</td>
                      <td>{r.text}</td>
                      {EMOTIONS.map(e => <td key={e}>{r[e].toFixed(3)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">Built for EmotionFlow Timeline — demo frontend (TXT only)</footer>
    </div>
  );
}
