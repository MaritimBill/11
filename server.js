// ============================================================
//  DEBUG Node.js Server - Fixed Version
// ============================================================

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const net = require("net");
const path = require("path");

const TCP_PORT = 8080;
const HTTP_PORT = 5000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from current directory
app.use(express.static(__dirname));

let latestData = {};
let arduinoSocket = null;
let webClients = [];

// TCP Server for Arduino
const tcpServer = net.createServer((socket) => {
  console.log("🎯 ARDUINO CONNECTED via TCP");
  arduinoSocket = socket;
  socket.setEncoding('utf8');

  socket.on("data", (data) => {
    try {
      const text = data.toString().trim();
      console.log("📥 RAW FROM ARDUINO:", text);
      
      text.split(/\r?\n/).forEach(line => {
        if(!line || line.length < 3) return;
        
        try {
          console.log("🔄 PARSING:", line);
          latestData = JSON.parse(line);
          console.log("✅ PARSED DATA:", Object.keys(latestData));
          
          // Send to all web clients
          webClients.forEach(client => {
            if(client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(latestData));
              console.log("📤 SENT TO WEB:", latestData.production !== undefined ? `${latestData.production}% production` : "data");
            }
          });
        } catch(e) { 
          console.log("❌ PARSE ERROR:", e.message); 
        }
      });
    } catch(err) { 
      console.log("❌ DATA ERROR:", err.message); 
    }
  });

  socket.on("end", () => console.log("🔌 ARDUINO DISCONNECTED"));
  socket.on("error", (err) => console.log("❌ TCP ERROR:", err.message));
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`🔌 TCP Server listening on port ${TCP_PORT}`);
  console.log(`📡 Waiting for Arduino connection...`);
});

// WebSocket Server
wss.on("connection", (ws) => {
  console.log("🌐 BROWSER CONNECTED");
  webClients.push(ws);
  
  // Send latest data immediately
  if(Object.keys(latestData).length > 0) {
    ws.send(JSON.stringify(latestData));
    console.log("📤 SENT EXISTING DATA TO NEW CLIENT");
  }

  ws.on("message", (msg) => {
    try {
      const command = JSON.parse(msg);
      console.log("⬅️ FROM BROWSER:", command);
      
      if(arduinoSocket) {
        arduinoSocket.write(JSON.stringify(command) + "\n");
        console.log("➡️ SENT TO ARDUINO:", command);
      } else {
        console.log("❌ NO ARDUINO CONNECTION");
      }
    } catch(e) {
      console.log("❌ BROWSER MESSAGE ERROR:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("💨 BROWSER DISCONNECTED");
    webClients = webClients.filter(client => client !== ws);
  });
  
  ws.on("error", (err) => {
    console.log("❌ WEBSOCKET ERROR:", err.message);
  });
});

// HTTP route for testing
app.get("/status", (req, res) => {
  res.json({
    arduinoConnected: !!arduinoSocket,
    webClients: webClients.length,
    latestData: latestData
  });
});

server.listen(HTTP_PORT, () => {
  console.log(`🖥️ DASHBOARD: http://localhost:${HTTP_PORT}`);
  console.log(`🔌 ARDUINO TCP: ${TCP_PORT}`);
  console.log(`🌐 WEBSOCKET: ${HTTP_PORT}`);
  console.log(`🚀 SYSTEM READY - Waiting for connections...`);
});