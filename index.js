import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import jwt from "jsonwebtoken";

import { Server } from "socket.io";
import { connectDB, sequelize } from "./configs/connectDB.js";
import authenticate from "./middlewares/authMiddleware.js";
import {
  authRoutes,
  adminRoutes,
  customerRoutes,
  orderRoutes,
  productRoutes,
  planningRoutes,
  usersRoutes,
  reportRoutes,
  manufactureRoutes,
} from "./routes/index.js";

//create table
import "./models/index.js";

const app = express();

dotenv.config();
const port = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Có thể thay thế bằng domain cụ thể
    methods: ["GET", "POST"],
  },
});

// Gắn io vào req
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  socket.on("join-machine", (roomName) => {
    socket.join(roomName);
  });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication error: No token"));
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); //set up to get product image

//routes
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/product", productRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/manufacture", manufactureRoutes);

sequelize
  .sync()
  .then(() => console.log("✅ Database & tables synchronized"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.use(authenticate);

server.listen(port, (err) => {
  if (err) {
    console.log(err);
  }
  connectDB();
  console.log(`Server is running at http://localhost:${port}`);
});
