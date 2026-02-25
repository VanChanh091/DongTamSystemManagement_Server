import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import path from "path";

import { connectDB, sequelize } from "./assest/configs/connectDB";
import authenticate from "./middlewares/authMiddleware";

//routes
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
  warehouseRoutes,
  qcRoutes,
  deliveryRoutes,
  badgeRoutes,
} from "./routes/index";

//create table
import "./models/index";
import { initSocket } from "./utils/socket/socket";
import { AppError } from "./utils/appError";
import { cleanStackTrace, sendTelegramAlert } from "./utils/telegram/telegramSending";

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
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//test: curl -I http://localhost:5000/updates/dongtam.exe
app.use("/updates", express.static(path.join(process.cwd(), "updates")));

// const pathApp = path.join(process.cwd(), "updates");
// console.log("Static files served from:", pathApp);

// app.use("/updates", express.static(pathApp));

// ========================
//        ROUTES
// ========================
app.use("/auth", authRoutes);

//sau khi đi qua authenticate thì mới vào được các route dưới đây
app.use(authenticate);
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
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/qc", qcRoutes);
app.use("/api/delivery", deliveryRoutes);

//BADGE
app.use("/api/badge", badgeRoutes);

sequelize
  // .sync({ alter: true })
  .sync()
  .then(() => console.log("✅ Database & tables synchronized"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Lỗi nghiệp vụ (client gây ra)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  //message telegram
  const user = req.user;
  const userInfo = `*User:* ${user.email} (ID: ${user.userId})`;

  const cleanedStack = cleanStackTrace(err.stack);

  const alertMessage = `
  🚨 *SERVER ERROR (500)* 🚨
  ---------------------------
  ${userInfo}
  *Path:* \`${req.method} ${req.originalUrl}\`
  *Message:* ${err.message}
  *Time:* ${new Date().toLocaleString("vi-VN")}
  *Stack Trace:*\`\`\`${cleanedStack}\`\`\``;

  sendTelegramAlert(alertMessage).catch(console.error);

  // Lỗi server thật (bug, DB lỗi, runtime crash)
  console.error("🔥 SERVER ERROR:", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });

  return res.status(500).json({
    message: "Internal server error",
    errorCode: "SERVER_ERROR",
  });
});

server.listen({ port: Number(process.env.PORT) || 5000, host: "0.0.0.0" }, (err?: Error) => {
  if (err) {
    console.log(err);
  }
  connectDB();
});
