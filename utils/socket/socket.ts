import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Server as HttpServer } from "http";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

interface DecodedToken extends JwtPayload {
  userId: string;
  username?: string;
  role?: string;
}

interface SocketAuth {
  token?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: DecodedToken;
}

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
      // console.log("✅ Token ok:", decoded);
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
      if (devEnvironment) console.log(`📌 socket joined ${roomName}`);
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      if (devEnvironment) console.log(`📌 socket left ${room}`);
    });
  });

  return io;
};
