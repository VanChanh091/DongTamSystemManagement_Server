import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

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
  reportRoutes,
} from "./routes/index.js";

//create table
import "./models/index.js";
import { initSocket } from "./utils/socket/socket.js";

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

app.use(
  cors({
    origin: [
      "http://localhost:5000", //FE DEV
      "http://192.168.1.150:5000", //domain name when running on internal server
    ],
    credentials: true,
  })
);
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
app.use("/api/report", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

sequelize
  // .sync({ alter: true })
  .sync()
  .then(() => console.log("✅ Database & tables synchronized"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.use(authenticate);

server.listen(port, "0.0.0.0", (err) => {
  if (err) {
    console.log(err);
  }
  connectDB();
});
