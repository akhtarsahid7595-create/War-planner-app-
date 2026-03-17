import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "tactical-warrior-secret-key-123";
// Vercel has a read-only filesystem except for /tmp
const DATA_FILE = process.env.VERCEL ? path.join("/tmp", "user_data.json") : path.join(process.cwd(), "user_data.json");

// Load initial data
let users: any[] = [];
let userProgress: Record<string, any> = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    const fileData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    users = fileData.users || [];
    userProgress = fileData.userProgress || {};
  } catch (e) {
    console.error("Error loading data file:", e);
  }
}

const saveToDisk = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, userProgress }, null, 2));
  } catch (e) {
    console.error("Error saving data to disk:", e);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), email, password: hashedPassword, name };
    users.push(newUser);
    saveToDisk();

    const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // User Data Routes
  app.get("/api/user/progress", authenticate, (req: any, res) => {
    const data = userProgress[req.user.id] || {};
    res.json(data);
  });

  app.post("/api/user/progress", authenticate, (req: any, res) => {
    userProgress[req.user.id] = req.body;
    saveToDisk();
    res.json({ success: true });
  });

  // Groq API Proxy
  app.post("/api/suggest-task", authenticate, async (req, res) => {
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
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export default startServer();
