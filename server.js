
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get("/api/omdb", async (req, res) => {
  try {
    const apiKey = process.env.OMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OMDb API key is not configured. Check your .env file.",
      });
    }

    const params = new URLSearchParams({
      apikey: apiKey,
    });

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
    return res.json(data);
  } catch (error) {
    console.error("OMDb request failed:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve movie information.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`MovieBox server running at http://localhost:${PORT}`);
});

