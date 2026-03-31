import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import { Octokit } from "octokit";
import bcrypt from "bcryptjs";
import { MOCK_PLAYERS } from "./constants.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_FILE = path.join(__dirname, "chat_messages.json");

// Load chat messages from file
let chatMessages: any[] = [];
if (fs.existsSync(CHAT_FILE)) {
  try {
    chatMessages = JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to load chat messages:", e);
  }
}

const saveChatMessages = () => {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(chatMessages, null, 2));
  } catch (e) {
    console.error("Failed to save chat messages:", e);
  }
};

// Admin Emails
const ADMIN_EMAILS = ["mackenziekittycat33@gmail.com", "gary@example.com"];
const ADMIN_EDITOR_EMAILS = ["sean@example.com"];

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    // Send existing messages on connection
    ws.send(JSON.stringify({ type: "INIT_CHAT", messages: chatMessages }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "NEW_MESSAGE") {
          const newMessage = {
            ...message.payload,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
          };
          chatMessages.push(newMessage);
          saveChatMessages();

          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "MESSAGE_RECEIVED", message: newMessage });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (e) {
        console.error("Failed to process WebSocket message:", e);
      }
    });
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || "bowls-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || "main").toLowerCase();
  const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || "data.json";
  const LOCAL_DATA_FILE = path.join(__dirname, "data.json");

  const getGitHubData = async () => {
    const fallbackData = { players: MOCK_PLAYERS, matches: [], databaseMatches: [], scorecards: [], appSettings: {} };
    
    // Check if local data exists first as a baseline
    let localData = fallbackData;
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      try {
        localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, "utf-8"));
      } catch (e) {
        console.error("Failed to load local data:", e);
      }
    }

    if (!GITHUB_OWNER || !GITHUB_REPO || !process.env.GITHUB_TOKEN) {
      console.warn("GitHub configuration missing, using local storage");
      return localData;
    }

    try {
      const response = await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: GITHUB_FILE_PATH,
        ...(GITHUB_BRANCH ? { ref: GITHUB_BRANCH } : {})
      });

      if ("content" in response.data) {
        const content = Buffer.from(response.data.content, "base64").toString("utf-8");
        const parsed = JSON.parse(content);
        // Ensure mock players are present if not already in GitHub
        if (!parsed.players || parsed.players.length === 0) {
            parsed.players = MOCK_PLAYERS;
        }
        return parsed;
      }
      return localData;
    } catch (error: any) {
      console.error("GitHub fetch failed, falling back to local data:", error.message);
      return localData;
    }
  };

  const saveGitHubData = async (data: any) => {
    // Always save locally as a backup
    try {
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Failed to save data locally:", e);
    }

    if (!GITHUB_OWNER || !GITHUB_REPO || !process.env.GITHUB_TOKEN) {
      return; // Skip GitHub if not configured
    }

    try {
      let sha: string | undefined;
      try {
        const existingFile = await octokit.rest.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: GITHUB_FILE_PATH,
          ...(GITHUB_BRANCH ? { ref: GITHUB_BRANCH } : {})
        });
        if ("sha" in existingFile.data) {
          sha = existingFile.data.sha;
        }
      } catch (e) {}

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: GITHUB_FILE_PATH,
        message: "Update bowls data",
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha,
        ...(GITHUB_BRANCH ? { branch: GITHUB_BRANCH } : {})
      });
    } catch (error: any) {
      console.error("GitHub save failed:", error.message);
      // We don't throw here to avoid breaking the app if GitHub is down/misconfigured
      // since we already saved locally.
    }
  };

  app.get(["/api/github/data", "/.netlify/functions/sync"], async (req, res) => {
    try {
      const data = await getGitHubData();
      res.json(req.path.includes('sync') ? { data } : data);
    } catch (error: any) {
      console.error("Error fetching from GitHub:", error);
      res.status(error.status || 500).json({ 
        error: error.message || "Failed to fetch data from GitHub",
        details: error.response?.data || {}
      });
    }
  });

  app.post(["/api/github/data", "/.netlify/functions/sync"], async (req, res) => {
    try {
      const dataToSave = req.path.includes('sync') ? req.body.content : req.body.data;
      await saveGitHubData(dataToSave);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving to GitHub:", error);
      res.status(error.status || 500).json({ 
        error: error.message || "Failed to save data to GitHub",
        details: error.response?.data || {}
      });
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const data = await getGitHubData();
      const players = data.players || [];

      if (players.find((p: any) => p.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      let role = "Active Member";
      if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        role = "Admin";
      } else if (ADMIN_EDITOR_EMAILS.includes(email.toLowerCase())) {
        role = "Admin Editor";
      }

      const newPlayer = {
        id: `player-${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        role,
        isApproved: true,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        status: "Active"
      };

      data.players = [...players, newPlayer];
      await saveGitHubData(data);

      (req.session as any).userId = newPlayer.id;
      res.json({ success: true, user: { id: newPlayer.id, name: newPlayer.name, email: newPlayer.email, role: newPlayer.role } });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Signup failed" });
    }
  });

    app.post(["/api/auth/login", "/api/auth-login"], async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }

      try {
        const data = await getGitHubData();
        const players = data.players || [];
        const user = players.find((p: any) => p.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          console.warn(`Login failed: User not found for email ${email}`);
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if the password is a bcrypt hash
        const isBcryptHash = (str: string) => /^\$2[ayb]\$.{56}$/.test(str);

        let isMatch = false;
        if (isBcryptHash(user.password)) {
          isMatch = await bcrypt.compare(password, user.password);
        } else {
          // Handle plain text passwords for migration/demo
          isMatch = password === user.password;
          
          // If it's a match, we should probably hash it now for security
          if (isMatch) {
              try {
                  const hashedPassword = await bcrypt.hash(password, 10);
                  user.password = hashedPassword;
                  await saveGitHubData(data);
              } catch (saveError) {
                  console.error("Failed to update password hash during login:", saveError);
                  // We still allow login if the password matched, even if saving the hash failed
              }
          }
        }

        if (!isMatch) {
          console.warn(`Login failed: Password mismatch for email ${email}`);
          return res.status(401).json({ error: "Invalid credentials" });
        }

        (req.session as any).userId = user.id;
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      } catch (error: any) {
        console.error("Login error:", error);
        res.status(500).json({ error: `Login failed: ${error.message}` });
      }
    });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const data = await getGitHubData();
      const user = data.players.find((p: any) => p.id === userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
