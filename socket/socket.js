import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware: Auth for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ Reject: No token");
      return next(new Error("Authentication error: No token"));
    }

    try {
      const key =
        process.env.NODE_ENV === "development"
          ? process.env.SECRET_KEY_DEV
          : process.env.SECRET_KEY_PROD;

      const decoded = jwt.verify(token, key);
      socket.user = decoded;
      // console.log("✅ Token ok:", decoded);
      next();
    } catch (err) {
      console.log("❌ Reject: Invalid token");
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection logic
  io.on("connection", (socket) => {
    //machine
    socket.on("join-machine", (roomName) => {
      socket.join(roomName);
      console.log(`📌 socket joined ${roomName}`);
    });

    socket.on("leave-room", (room) => {
      socket.leave(room);
      console.log(`📌 socket left ${room}`);
    });
  });

  return io;
};
