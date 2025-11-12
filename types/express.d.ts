import { Server as SocketIOServer } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: number;
        role: string;
        permissions: string[];
        email: string;
      };
      io?: SocketIOServer;
      file?: MulterFile;
    }
  }
}

export {}; // bắt buộc để TS hiểu đây là module
