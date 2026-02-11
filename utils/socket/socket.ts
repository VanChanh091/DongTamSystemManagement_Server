import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { AuthenticatedSocket, DecodedToken, SocketAuth } from "../../interface/socket.type";

const devEnvironment = process.env.NODE_ENV !== "production";

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware: Auth for socket
  io.use((socket: AuthenticatedSocket, next) => {
    const auth = socket.handshake.auth as SocketAuth;
    const token = auth?.token;

    if (!token) {
      if (devEnvironment) console.log("❌ Reject: No token");
      return next(new Error("Authentication error: No token"));
    }

    try {
      const key =
        process.env.NODE_ENV === "development"
          ? process.env.SECRET_KEY_DEV
          : process.env.SECRET_KEY_PROD;

      const decoded = jwt.verify(token, key as string) as DecodedToken;
      socket.user = decoded;
      next();
    } catch (err) {
      if (devEnvironment) console.log("❌ Reject: Invalid token", err);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection logic
  io.on("connection", (socket: AuthenticatedSocket) => {
    //machine
    socket.on("join-machine", (roomName: string) => {
      socket.join(roomName);
      if (devEnvironment) console.log(`📌 socket joined: ${roomName}`);
    });

    //reject order
    socket.on("join-user", (ownerId: number) => {
      socket.join(`reject-order-${ownerId}`);
      if (devEnvironment) console.log(`🔔 User joined notification: ${ownerId}`);
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      if (devEnvironment) console.log(`📌 socket left: ${room}`);
    });
  });

  return io;
};
