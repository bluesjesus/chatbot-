const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post("/api/gemini-chat", async (req, res) => {
    const { history } = req.body;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: history })
        });

        const result = await response.json();
        res.json(result);
    } catch (err) {
        console.error("Gemini API error:", err);
        res.status(500).json({ error: "Gemini API failed" });
    }
});

app.listen(3000, () => console.log("Gemini backend running on port 3000"));
