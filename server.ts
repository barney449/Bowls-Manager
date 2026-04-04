import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
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

  const LOCAL_DATA_FILE = path.join(__dirname, "data.json");

  const getLocalData = () => {
    const fallbackData = { players: MOCK_PLAYERS, matches: [], databaseMatches: [], scorecards: [], appSettings: {} };
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, "utf-8"));
      } catch (e) {
        console.error("Failed to load local data:", e);
      }
    }
    return fallbackData;
  };

  const saveLocalData = (data: any) => {
    try {
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Failed to save data locally:", e);
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const data = getLocalData();
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
      saveLocalData(data);

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
      const data = getLocalData();
      const players = data.players || [];
      const user = players.find((p: any) => p.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isBcryptHash = (str: string) => /^\$2[ayb]\$.{56}$/.test(str);

      let isMatch = false;
      if (isBcryptHash(user.password)) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = password === user.password;
        if (isMatch) {
          user.password = await bcrypt.hash(password, 10);
          saveLocalData(data);
        }
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: `Login failed: ${error.message}` });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const data = getLocalData();
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
