// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let waitingSocket = null;

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // Matchmaking logic
  if (waitingSocket) {
    const partner = waitingSocket;
    socket.partner = partner.id;
    partner.partner = socket.id;

    socket.emit("ready-to-call", { isInitiator: true });
    partner.emit("ready-to-call", { isInitiator: false });

    waitingSocket = null;
  } else {
    waitingSocket = socket;
  }

  // WebRTC signaling
  socket.on("send-offer", ({ offer }) => {
    if (socket.partner) {
      io.to(socket.partner).emit("incoming-offer", { offer });
    }
  });

  socket.on("send-answer", ({ answer }) => {
    if (socket.partner) {
      io.to(socket.partner).emit("incoming-answer", { answer });
    }
  });

  socket.on("ice-candidate", ({ candidate }) => {
    if (socket.partner) {
      io.to(socket.partner).emit("ice-candidate", { candidate });
    }
  });

  socket.on("hangup", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("hangup");
    }
    if (waitingSocket?.id === socket.id) {
      waitingSocket = null;
    }
  });

  // 🟡 New: Chat support
  socket.on("send-message", ({ message }) => {
    if (socket.partner) {
      io.to(socket.partner).emit("receive-message", { message });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
    if (socket.partner) {
      io.to(socket.partner).emit("hangup");
    }
    if (waitingSocket?.id === socket.id) {
      waitingSocket = null;
    }
  });
});

server.listen(4000, "0.0.0.0", () => {
  console.log("🚀 Server listening on http://0.0.0.0:4000");
});
