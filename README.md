# Stock Sentiment Analyzer

> Analyze stock market sentiment from real-time news headlines using AI.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![NewsAPI](https://img.shields.io/badge/NewsAPI-black?style=for-the-badge)

---

## 🚀 Live Demo

> _https://stock-sentiment-analyzer-eight.vercel.app/_

---

## 📌 What It Does

Type a stock ticker (e.g. `AAPL`, `THYAO`) and the app will:

1. Fetch the latest news headlines via **NewsAPI**
2. Send those headlines to **Google Gemini** for analysis
3. Return an overall sentiment (**Positive / Negative / Neutral**), a confidence score, and a short summary
4. Display everything in a clean dashboard with a sentiment gauge and news list

Supports **TR / EN** language toggle and **Global / BIST 100** market presets.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + JSX |
| Build Tool | Vite |
| Styling | Vanilla CSS (no UI libraries) |
| News Data | [NewsAPI](https://newsapi.org/) |
| AI Analysis | [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`) |

---

## ⚙️ Getting Started

### 1. Clone and install

```bash
git clone https://github.com/celiikerenn/stock-sentiment-analyzer.git
cd stock-sentiment-analyzer
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_NEWS_API_KEY=your_newsapi_key
VITE_GEMINI_API_KEY=your_gemini_key
# Optional: override default model
# VITE_GEMINI_MODEL=gemini-2.5-flash
```

- Get a free NewsAPI key at [newsapi.org](https://newsapi.org)
- Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔍 How It Works

```
User enters ticker
      ↓
NewsAPI → fetches latest headlines
      ↓
Headlines sent to Gemini with structured prompt
      ↓
Gemini returns { sentiment, confidence, summary }
      ↓
Dashboard updates: gauge + summary card + news list
```

---

## 📊 Features

- **Sentiment Gauge** — gradient track (red → yellow → green) with a moving indicator
- **AI Summary** — 2–3 sentence Gemini-generated summary of the news
- **News List** — source, time, description, and direct article links
- **Bilingual** — TR/EN toggle with auto re-analysis on language switch
- **Market Presets** — Global (AAPL, MSFT...) or BIST 100 (THYAO, AKBNK...)
- **Error Handling** — user-friendly messages for missing keys, failed requests, no news

---

## ⚠️ Disclaimer

This app is for **informational purposes only** and does not constitute financial advice.

---

## 📫 Contact

**Eren Çelik** — [LinkedIn](https://www.linkedin.com/in/eren-celik01/) · [eren1.celikk@gmail.com](mailto:eren1.celikk@gmail.com)
