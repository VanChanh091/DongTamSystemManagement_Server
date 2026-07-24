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
    if (!socket.user) return;

    const { userId, role, department } = socket.user;

    // console.log(`\n================ INSPECT ROOMS FOR USER ${userId} ================`);
    // console.log(`ID Socket hiện tại: ${socket.id}`);
    // console.log(`==================================================================\n`);

    // 1. Phòng Cá Nhân Đích Danh
    socket.join(`user-${userId}`);

    // 2. Phòng theo Bộ Phận
    if (department) {
      socket.join(`department-${department.toLowerCase()}`);
    }

    // 3. Phòng theo Chức Vụ
    if (role) {
      socket.join(`role-${role.toLowerCase()}`);
    }

    if (devEnvironment) {
      console.log(
        `📌 User ${userId} auto-joined: user-${userId} | department-${department.toLowerCase()} | role-${role?.toLowerCase() ?? ""}`,
      );
    }

    //=============================================================================

    //machine
    socket.on("join-machine", (roomName: string) => {
      socket.join(roomName);
      if (devEnvironment) console.log(`📌 socket joined: ${roomName}`);
    });

    //request prepare goods
    socket.on("request-prepare", () => {
      socket.join(`prepare-goods`); //room
      if (devEnvironment) console.log(`🔔 User joined prepare goods notification`);
    });

    //delivery schedule
    socket.on("delivery-schedule", (deliveryDate: string) => {
      const dateStr = deliveryDate.split("T")[0];
      const room = `delivery-${dateStr}`;
      socket.join(room);
      if (devEnvironment) console.log(`🔔 User joined delivery notification for room: ${room}`);
    });

    //leave room
    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      if (devEnvironment) console.log(`📌 socket left: ${room}`);
    });
  });

  return io;
};
