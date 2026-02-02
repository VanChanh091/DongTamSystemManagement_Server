"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    // Middleware: Auth for socket
    io.use((socket, next) => {
        const auth = socket.handshake.auth;
        const token = auth?.token;
        if (!token) {
            if (devEnvironment)
                console.log("❌ Reject: No token");
            return next(new Error("Authentication error: No token"));
        }
        try {
            const key = process.env.NODE_ENV === "development"
                ? process.env.SECRET_KEY_DEV
                : process.env.SECRET_KEY_PROD;
            const decoded = jsonwebtoken_1.default.verify(token, key);
            socket.user = decoded;
            next();
        }
        catch (err) {
            if (devEnvironment)
                console.log("❌ Reject: Invalid token", err);
            return next(new Error("Authentication error: Invalid token"));
        }
    });
    // Connection logic
    io.on("connection", (socket) => {
        //machine
        socket.on("join-machine", (roomName) => {
            socket.join(roomName);
            if (devEnvironment)
                console.log(`📌 socket joined: ${roomName}`);
        });
        socket.on("leave-room", (room) => {
            socket.leave(room);
            if (devEnvironment)
                console.log(`📌 socket left: ${room}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
//# sourceMappingURL=socket.js.map