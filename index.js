import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { initSocket } from "./socket/socket.js";
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
  manufactureRoutes,
  dashboardRoutes,
} from "./routes/index.js";

//create table
import "./models/index.js";

const app = express();

dotenv.config();
const port = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocket(server);

// Gắn io vào req
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); //set up to upload product image

//routes
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/product", productRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/manufacture", manufactureRoutes);
app.use("/api/dashboard", dashboardRoutes);

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
