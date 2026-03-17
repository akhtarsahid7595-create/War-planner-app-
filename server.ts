import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Groq API Proxy
app.post("/api/suggest-task", async (req, res) => {
  const { user_type, goals, focus_area, energy_level, existing_tasks } = req.body;
  
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  const prompt = `You are a discipline and execution coach running inside a Groq-powered system.
Your job is to suggest ONE highly specific "War Task" for TODAY.
A War Task:
- can be completed in 25–60 minutes,
- is clearly measurable,
- moves the user forward in skills, study, money, body, or mind,
- is realistic for today's energy level.

User context:
Type: ${user_type}
Long-term goals: ${goals}
Today’s focus area: ${focus_area}
Energy level: ${energy_level}
Existing War Tasks today: ${existing_tasks}

Rules:
- Do NOT repeat or closely copy any existing task.
- Make the task concrete and small enough that a tired but serious person can still do it today.
- No motivational speech, no emojis, no extra sentences – just the task.
- Keep the whole response very short.
- Return format: TASK: <your single sentence war task>`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    res.json({ suggestion: content });
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: "Failed to fetch suggestion" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite();

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
