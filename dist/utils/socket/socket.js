"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_connect_1 = require("../../assets/configs/connect/redis.connect");
const devEnvironment = process.env.NODE_ENV !== "production";
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.adapter((0, redis_adapter_1.createAdapter)(redis_connect_1.pubClient, redis_connect_1.subClient));
    if (devEnvironment) {
        console.log(`[PID: ${process.pid}] 🚀 Socket Redis Adapter đã được kích hoạt!`);
    }
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
        if (!socket.user)
            return;
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
            console.log(`📌 User ${userId} auto-joined: user-${userId} | department-${department.toLowerCase()} | role-${role?.toLowerCase() ?? ""}`);
        }
        //=============================================================================
        //machine
        socket.on("join-machine", (roomName) => {
            socket.join(roomName);
            if (devEnvironment)
                console.log(`📌 socket joined: ${roomName}`);
        });
        //request prepare goods
        socket.on("request-prepare", () => {
            socket.join(`prepare-goods`); //room
            if (devEnvironment)
                console.log(`🔔 User joined prepare goods notification`);
        });
        //delivery schedule
        socket.on("delivery-schedule", (deliveryDate) => {
            const dateStr = deliveryDate.split("T")[0];
            const room = `delivery-${dateStr}`;
            socket.join(room);
            if (devEnvironment)
                console.log(`🔔 User joined delivery notification for room: ${room}`);
        });
        //leave room
        socket.on("leave-room", (room) => {
            socket.leave(room);
            if (devEnvironment)
                console.log(`📌 socket left: ${room}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
// Hàm lấy instance IO để bắn thông báo từ Controller / Service API
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io chưa được khởi tạo! Hãy gọi initSocket() trước.");
    }
    return io;
};
exports.getIO = getIO;
//# sourceMappingURL=socket.js.map