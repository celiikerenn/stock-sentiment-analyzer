export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.VITE_NEWS_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NEWS API key is not configured on server.' })
    return
  }

  const { ticker, lang = 'en', scope = 'global' } = req.query || {}
  if (!ticker) {
    res.status(400).json({ error: 'ticker query parameter is required.' })
    return
  }

  const query = String(ticker).toUpperCase()
  const language =
    scope === 'bist' || lang === 'tr'
      ? 'tr'
      : lang === 'en'
        ? 'en'
        : 'en'

  const url = new URL('https://newsapi.org/v2/everything')
  url.searchParams.set('q', query)
  url.searchParams.set('language', language)
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('pageSize', '10')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      res
        .status(500)
        .json({ error: 'NewsAPI request failed', status: response.status, body: text })
      return
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error while calling NewsAPI.' })
  }
}

