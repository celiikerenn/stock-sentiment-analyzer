import './App.css'
import { useEffect, useState } from 'react'

const SENTIMENT_COLORS = {
  Positive: '#22c55e',
  Neutral: '#eab308',
  Negative: '#ef4444',
}

const SENTIMENT_ORDER = ['Negative', 'Neutral', 'Positive']

// İstersen .env içine VITE_GEMINI_MODEL yazarak modeli değiştirebilirsin (örn: gemini-2.5-flash, gemini-1.5-flash-8b)
const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

const STRINGS = {
  tr: {
    title: 'Hisse Duygu Analizörü',
    subtitle:
      'Haber akışına göre bir hissenin piyasa duyarlılığını anında inceleyin.',
    searchTitle: 'Hisse Arama',
    searchPlaceholder: 'Hisse sembolü girin...',
    examplesGlobal: 'Örnek (Dünya):',
    examplesBist: 'Örnek (BIST 100):',
    examplesGlobalTickers: ['AAPL', 'MSFT', 'GOOGL'],
    examplesBistTickers: ['THYAO', 'AKBNK', 'GARAN'],
    analyzeButtonIdle: 'Analiz Et',
    analyzeButtonLoading: 'Analiz Ediliyor...',
    inputError: 'Lütfen bir hisse senedi sembolü girin.',
    apiKeysError:
      'API anahtarları eksik. Lütfen .env dosyanızda VITE_NEWS_API_KEY ve VITE_GEMINI_API_KEY değişkenlerini tanımlayın.',
    newsFetchError: 'Haberler alınırken bir hata oluştu.',
    noNewsError: 'Bu hisse için son haber bulunamadı.',
    sentimentTitle: 'Duygu Göstergesi',
    sentimentPlaceholder:
      'Bir hisse aradığınızda genel piyasa duyarlılığı burada görünecek.',
    sentimentLabels: ['Negatif', 'Tarafsız', 'Pozitif'],
    summaryTitle: 'Özet',
    summaryPlaceholder:
      'Gemini, haber başlıklarını analiz ederek kısa bir Türkçe özet oluşturacak.',
    newsTitle: 'Son Haberler',
    newsCountSuffix: 'sonuç',
    loadingText: 'Haberler ve duygu analizi alınıyor...',
    newsPlaceholder:
      'İlgili hisse için son haberler burada listelenecek.',
    newsLink: 'Habere Git',
    footer:
      'NewsAPI & Google Gemini ile gerçek zamanlı piyasa duyarlılığı analizi.',
    languageLabel: 'Dil',
    marketLabel: 'Piyasa',
    marketGlobal: 'Dünya',
    marketBist: 'BIST 100',
    confidenceLabel: 'Güven',
    confidenceNote:
      'Not: Farklı dillerde küçük güven yüzdesi farkları normaldir ve haber diline göre değişebilir.',
  },
  en: {
    title: 'Stock Sentiment Analyzer',
    subtitle:
      'Quickly inspect market sentiment of any stock based on recent news.',
    searchTitle: 'Stock Search',
    searchPlaceholder: 'Type a stock ticker...',
    examplesGlobal: 'Examples (Global):',
    examplesBist: 'Examples (BIST 100):',
    examplesGlobalTickers: ['AAPL', 'MSFT', 'GOOGL'],
    examplesBistTickers: ['THYAO', 'AKBNK', 'GARAN'],
    analyzeButtonIdle: 'Analyze',
    analyzeButtonLoading: 'Analyzing...',
    inputError: 'Please enter a stock ticker.',
    apiKeysError:
      'API keys are missing. Please define VITE_NEWS_API_KEY and VITE_GEMINI_API_KEY in your .env file.',
    newsFetchError: 'An error occurred while fetching news.',
    noNewsError: 'No recent news found for this stock.',
    sentimentTitle: 'Sentiment Gauge',
    sentimentPlaceholder:
      'Overall market sentiment will appear here after you search a stock.',
    sentimentLabels: ['Negative', 'Neutral', 'Positive'],
    summaryTitle: 'Summary',
    summaryPlaceholder:
      'Gemini will analyze headlines and generate a short summary.',
    newsTitle: 'Latest News',
    newsCountSuffix: 'results',
    loadingText: 'Fetching news and running sentiment analysis...',
    newsPlaceholder:
      'Recent news for the selected stock will be listed here.',
    newsLink: 'Open Article',
    footer:
      'Real-time market sentiment analysis powered by NewsAPI & Google Gemini.',
    languageLabel: 'Language',
    marketLabel: 'Market',
    marketGlobal: 'Global',
    marketBist: 'BIST 100',
    confidenceLabel: 'Confidence',
    confidenceNote:
      'Note: Small differences in confidence between languages are normal and depend on the news language.',
  },
}

function mapScoreToSentiment(score) {
  if (score > 0.2) return 'Positive'
  if (score < -0.2) return 'Negative'
  return 'Neutral'
}

function App() {
  const [language, setLanguage] = useState('tr')
  const [marketScope, setMarketScope] = useState('global')
  const [ticker, setTicker] = useState('')
  const [news, setNews] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const runAnalysis = async (trimmedTicker, lang, scope) => {
    if (!trimmedTicker || isLoading) return

    setIsLoading(true)
    setError('')
    setNews([])
    setSentiment(null)
    setConfidence(null)
    setSummary('')

    try {
      // 1) Haberleri backend proxy üzerinden çek
      const newsRes = await fetch(
        `/api/news?ticker=${encodeURIComponent(
          trimmedTicker
        )}&lang=${encodeURIComponent(lang)}&scope=${encodeURIComponent(scope)}`
      )

      if (!newsRes.ok) {
        throw new Error(STRINGS[lang].newsFetchError)
      }

      const newsData = await newsRes.json()

      if (!newsData.articles || newsData.articles.length === 0) {
        setNews([])
        setError(STRINGS[lang].noNewsError)
        setIsLoading(false)
        return
      }

      const articles = newsData.articles.map((a) => ({
        title: a.title,
        source: a.source?.name ?? 'Bilinmeyen Kaynak',
        url: a.url,
        publishedAt: a.publishedAt,
        description: a.description,
      }))

      setNews(articles)

      // 2) Gemini ile duygu analizi – backend proxy
      const headlinesText = articles
        .map((a, index) => `${index + 1}. ${a.title}`)
        .join('\n')

      const sentimentRes = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: trimmedTicker,
          headlinesText,
          language: lang,
        }),
      })

      if (!sentimentRes.ok) {
        const errBody = await sentimentRes.json().catch(() => null)
        const message =
          errBody?.error || 'Duygu analizi sırasında bir hata oluştu.'
        throw new Error(message)
      }

      const sentimentData = await sentimentRes.json()

      setSentiment(sentimentData.sentiment)
      setConfidence(sentimentData.confidence)
      setSummary(sentimentData.summary || '')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Beklenmeyen bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)

    const trimmedTicker = ticker.trim().toUpperCase()
    if (trimmedTicker) {
      // Dil değişince aynı hisseyi yeni dilde otomatik yeniden analiz et
      runAnalysis(trimmedTicker, lang, marketScope)
    } else {
      // Henüz hisse yoksa sadece arayüz metinlerini değiştir
      setSummary('')
      setSentiment(null)
      setConfidence(null)
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTicker = ticker.trim().toUpperCase()
    if (!trimmedTicker) {
      setError(STRINGS[language].inputError)
      return
    }

    runAnalysis(trimmedTicker, language, marketScope)
  }

  const t = STRINGS[language]

  useEffect(() => {
    document.title = t.title
  }, [t.title])

  const sentimentPercentage =
    sentiment && confidence != null
      ? (() => {
          const baseIndex = SENTIMENT_ORDER.indexOf('Negative')
          const sentimentIndex = SENTIMENT_ORDER.indexOf(sentiment)
          const range = SENTIMENT_ORDER.length - 1 || 1
          const ratio = (sentimentIndex - baseIndex) / range
          return ratio * 100 * confidence
        })()
      : 50

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>{t.title}</h1>
          <p className="app-subtitle">{t.subtitle}</p>
        </div>
        <div className="header-controls">
          <div className="header-control-group">
            <span className="header-control-label">{t.languageLabel}</span>
            <div className="pill-toggle">
              <button
                type="button"
                className={`pill-toggle-option ${
                  language === 'tr' ? 'pill-toggle-option-active' : ''
                }`}
                onClick={() => changeLanguage('tr')}
              >
                TR
              </button>
              <button
                type="button"
                className={`pill-toggle-option ${
                  language === 'en' ? 'pill-toggle-option-active' : ''
                }`}
                onClick={() => changeLanguage('en')}
              >
                EN
              </button>
            </div>
          </div>
          <div className="header-control-group">
            <span className="header-control-label">{t.marketLabel}</span>
            <div className="pill-toggle">
              <button
                type="button"
                className={`pill-toggle-option ${
                  marketScope === 'global' ? 'pill-toggle-option-active' : ''
                }`}
                onClick={() => setMarketScope('global')}
              >
                {t.marketGlobal}
              </button>
              <button
                type="button"
                className={`pill-toggle-option ${
                  marketScope === 'bist' ? 'pill-toggle-option-active' : ''
                }`}
                onClick={() => setMarketScope('bist')}
              >
                {t.marketBist}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="card search-card">
          <h2>{t.searchTitle}</h2>
          <p className="search-hint">
            {marketScope === 'global'
              ? t.examplesGlobal
              : t.examplesBist}{' '}
            {(
              marketScope === 'global'
                ? t.examplesGlobalTickers
                : t.examplesBistTickers
            ).map((sym) => (
              <span key={sym}>{sym}</span>
            ))}
          </p>
          <form className="search-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="search-input"
              maxLength={10}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? t.analyzeButtonLoading : t.analyzeButtonIdle}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </section>

        <section className="grid">
          <div className="card sentiment-card">
            <h2>{t.sentimentTitle}</h2>
            {sentiment ? (
              <>
                <div className="gauge-wrapper">
                  <div className="gauge">
                    <div className="gauge-track">
                      <div
                        className="gauge-fill"
                        style={{
                          backgroundColor: SENTIMENT_COLORS[sentiment],
                          transform: `translateX(${sentimentPercentage}%)`,
                        }}
                      />
                    </div>
                    <div className="gauge-labels">
                      <span>{t.sentimentLabels[0]}</span>
                      <span>{t.sentimentLabels[1]}</span>
                      <span>{t.sentimentLabels[2]}</span>
                    </div>
                  </div>
                </div>
                <div className="sentiment-meta">
                  <span className={`sentiment-pill sentiment-${sentiment}`}>
                    {sentiment}
                  </span>
                  {confidence != null && (
                    <>
                      <span className="confidence">
                        {t.confidenceLabel}:{' '}
                        {(confidence * 100).toFixed(0)}%
                      </span>
                      {t.confidenceNote && (
                        <span className="confidence-note">
                          {t.confidenceNote}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="placeholder">
                {t.sentimentPlaceholder}
              </p>
            )}
          </div>

          <div className="card summary-card">
            <h2>{t.summaryTitle}</h2>
            {summary ? (
              <p className="summary-text">{summary}</p>
            ) : (
              <p className="placeholder">
                {t.summaryPlaceholder}
              </p>
            )}
          </div>
        </section>

        <section className="card news-card">
          <div className="news-header">
            <h2>{t.newsTitle}</h2>
            {news.length > 0 && (
              <span className="news-count">
                {news.length} {t.newsCountSuffix}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="loader-row">
              <div className="loader" />
              <span>{t.loadingText}</span>
            </div>
          )}

          {!isLoading && news.length === 0 && !error && (
            <p className="placeholder">
              {t.newsPlaceholder}
            </p>
          )}

          {!isLoading && news.length > 0 && (
            <ul className="news-list">
              {news.map((item, index) => (
                <li key={item.url ?? index} className="news-item">
                  <div className="news-item-main">
                    <h3>{item.title}</h3>
                    {item.description && (
                      <p className="news-description">{item.description}</p>
                    )}
                  </div>
                  <div className="news-item-meta">
                    <span className="news-source">{item.source}</span>
                    {item.publishedAt && (
                      <span className="news-date">
                        {new Date(item.publishedAt).toLocaleString('tr-TR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="news-link"
                      >
                        {t.newsLink}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <footer className="app-footer">
        <span>
          {t.footer}
        </span>
      </footer>
    </div>
  )
}

export default App
