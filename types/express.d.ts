import { Server as SocketIOServer } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: number;
        email: string;
        fullName: string;
        role: string;
        department: string;
        permissions: string[];
      };
      io?: SocketIOServer;
      file?: MulterFile;
    }
  }
}

export {}; // bắt buộc để TS hiểu đây là module
