import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
dotenv.config();

import { connectDB, sequelize } from "./configs/connectDB";
import authenticate from "./middlewares/authMiddleware";
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
  employeeRoutes,
} from "./routes/index";

//create table
import "./models/index";
import { initSocket } from "./utils/socket/socket";

const app = express();

const server = http.createServer(app);
const io = initSocket(server);

// Gắn io vào req
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); //set up to upload product image

//routes
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/product", productRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/manufacture", manufactureRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/employee", employeeRoutes);

sequelize
  // .sync({ alter: true })
  .sync()
  .then(() => console.log("✅ Database & tables synchronized"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.use(authenticate);

server.listen({ port: Number(process.env.PORT) || 5000, host: "0.0.0.0" }, (err?: Error) => {
  if (err) {
    console.log(err);
  }
  connectDB();
});
