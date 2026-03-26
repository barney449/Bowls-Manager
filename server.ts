import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";
import { google } from "googleapis";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";

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
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    }
  }));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/callback`
  );

  // Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req.session as any).tokens = tokens;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/status", (req, res) => {
    res.json({ connected: !!(req.session as any).tokens });
  });

  app.post("/api/drive/upload", async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) {
      return res.status(401).json({ error: "Not connected to Google Drive" });
    }

    const { data, filename } = req.body;
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1BZtNra9l4qXHG1v7DVy4nN9ByaBqRi_C";

    try {
      // Check if file already exists in the folder to update it, or create new
      const response = await drive.files.list({
        q: `name = '${filename}' and '${folderId}' in parents and trashed = false`,
        fields: "files(id, name)",
      });

      const fileMetadata = {
        name: filename,
        parents: [folderId],
      };

      const media = {
        mimeType: "application/json",
        body: JSON.stringify(data, null, 2),
      };

      if (response.data.files && response.data.files.length > 0) {
        const fileId = response.data.files[0].id!;
        await drive.files.update({
          fileId: fileId,
          media: media,
        });
        res.json({ success: true, message: "File updated", fileId });
      } else {
        const file = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id",
        });
        res.json({ success: true, message: "File created", fileId: file.data.id });
      }
    } catch (error) {
      console.error("Error uploading to Drive:", error);
      res.status(500).json({ error: "Failed to upload to Google Drive" });
    }
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
