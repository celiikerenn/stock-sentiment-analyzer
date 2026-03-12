function mapScoreToSentiment(score) {
  if (score > 0.2) return 'Positive'
  if (score < -0.2) return 'Negative'
  return 'Neutral'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY
  const model = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

  if (!apiKey) {
    res
      .status(500)
      .json({ error: 'Gemini API key is not configured on server.' })
    return
  }

  const { ticker, headlinesText, language = 'tr' } = req.body || {}

  if (!ticker || !headlinesText) {
    res
      .status(400)
      .json({ error: 'ticker and headlinesText are required in body.' })
    return
  }

  const prompt =
    language === 'tr'
      ? `
Sen bir finans haberleri duygu analizi uzmanısın.
Aşağıdaki hisse senedine ait haber başlıklarını analiz et ve JSON formatında yanıt ver.

Hisse: ${ticker}

Haber Başlıkları:
${headlinesText}

Yanıt formatı tam olarak şu olsun:
{
  "sentiment": "Positive" | "Negative" | "Neutral",
  "confidence": number, // 0 ile 1 arasında
  "summary": "Kısa, 2-3 cümlelik Türkçe özet"
}

Sadece geçerli bir JSON döndür, açıklama ekleme.`
      : `
You are an expert in financial news sentiment analysis.
Analyze the following stock-related news headlines and respond in JSON format.

Ticker: ${ticker}

Headlines:
${headlinesText}

Respond exactly in this format:
{
  "sentiment": "Positive" | "Negative" | "Neutral",
  "confidence": number, // between 0 and 1
  "summary": "Short 2-3 sentence summary in English"
}

Return only valid JSON, no explanation.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      let message = 'Gemini request failed.'
      try {
        const body = await response.json()
        if (body?.error?.message) {
          message = body.error.message
        }
      } catch {
        // ignore
      }
      res.status(500).json({ error: message })
      return
    }

    const geminiData = await response.json()
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let parsed
    try {
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      const lower = rawText.toLowerCase()
      let simpleSentiment = 'Neutral'
      if (lower.includes('positive') || lower.includes('bullish')) {
        simpleSentiment = 'Positive'
      } else if (lower.includes('negative') || lower.includes('bearish')) {
        simpleSentiment = 'Negative'
      }

      parsed = {
        sentiment: simpleSentiment,
        confidence: 0.5,
        summary:
          'Model yanıtı beklendiği gibi yapılandırılamadı, bu nedenle basit bir duygu çıkarımı yapıldı.',
      }
    }

    const finalSentiment =
      parsed.sentiment &&
      ['Positive', 'Negative', 'Neutral'].includes(parsed.sentiment)
        ? parsed.sentiment
        : mapScoreToSentiment(
            typeof parsed.confidence === 'number'
              ? parsed.confidence *
                  (parsed.sentiment === 'Negative' ? -1 : 1)
              : 0
          )

    const finalConfidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5

    res.status(200).json({
      sentiment: finalSentiment,
      confidence: finalConfidence,
      summary: parsed.summary || '',
    })
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Unexpected error while calling Gemini API.' })
  }
}

