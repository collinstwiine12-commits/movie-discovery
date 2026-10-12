
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const apiKey = process.env.OMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OMDb API key is not configured.",
      });
    }

    const params = new URLSearchParams({ apikey: apiKey });

    for (const key of ["s", "t", "i", "type", "page", "plot"]) {
      if (req.query[key]) {
        params.set(key, String(req.query[key]));
      }
    }

    const response = await fetch(
      `https://www.omdbapi.com/?${params.toString()}`
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "OMDb service is temporarily unavailable.",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({
      error: "Unable to retrieve movie data.",
    });
  }
}
