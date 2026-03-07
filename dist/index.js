"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const connectDB_1 = require("./assest/configs/connectDB");
const authMiddleware_1 = __importDefault(require("./middlewares/authMiddleware"));
//routes
const index_1 = require("./routes/index");
//create table
require("./models/index");
const socket_1 = require("./utils/socket/socket");
const appError_1 = require("./utils/appError");
const telegramSending_1 = require("./utils/telegram/telegramSending");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = (0, socket_1.initSocket)(server);
// Gắn io vào req
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5000", //FE DEV
        "http://192.168.1.150:5000", //domain name when running on internal server
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
//test: curl -I http://localhost:5000/updates/dongtam.exe
app.use("/updates", express_1.default.static(path_1.default.join(process.cwd(), "updates")));
// const pathApp = path.join(process.cwd(), "updates");
// console.log("Static files served from:", pathApp);
// app.use("/updates", express.static(pathApp));
// ========================
//        ROUTES
// ========================
app.use("/auth", index_1.authRoutes);
//sau khi đi qua authenticate thì mới vào được các route dưới đây
app.use(authMiddleware_1.default);
app.use("/api/admin", index_1.adminRoutes);
app.use("/api/dashboard", index_1.dashboardRoutes);
app.use("/api/customer", index_1.customerRoutes);
app.use("/api/order", index_1.orderRoutes);
app.use("/api/product", index_1.productRoutes);
app.use("/api/planning", index_1.planningRoutes);
app.use("/api/user", index_1.usersRoutes);
app.use("/api/manufacture", index_1.manufactureRoutes);
app.use("/api/report", index_1.reportRoutes);
app.use("/api/employee", index_1.employeeRoutes);
app.use("/api/warehouse", index_1.warehouseRoutes);
app.use("/api/qc", index_1.qcRoutes);
app.use("/api/delivery", index_1.deliveryRoutes);
//BADGE
app.use("/api/badge", index_1.badgeRoutes);
connectDB_1.sequelize
    // .sync({ alter: true })
    .sync()
    .then(() => console.log("✅ Database & tables synchronized"))
    .catch((err) => console.error("❌ Error syncing database:", err));
app.use((err, req, res, next) => {
    // Lỗi nghiệp vụ (client gây ra)
    if (err instanceof appError_1.AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            message: err.message,
            errorCode: err.errorCode,
        });
    }
    //message telegram
    const user = req.user;
    const userInfo = `*User:* ${user.email} (ID: ${user.userId})`;
    const cleanedStack = (0, telegramSending_1.cleanStackTrace)(err.stack);
    const alertMessage = `
  🚨 *SERVER ERROR (500)* 🚨
  ---------------------------
  ${userInfo}
  *Path:* \`${req.method} ${req.originalUrl}\`
  *Message:* ${err.message}
  *Time:* ${new Date().toLocaleString("vi-VN")}
  *Stack Trace:*\`\`\`${cleanedStack}\`\`\``;
    (0, telegramSending_1.sendTelegramAlert)(alertMessage).catch(console.error);
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
server.listen({ port: Number(process.env.PORT) || 5000, host: "0.0.0.0" }, (err) => {
    if (err) {
        console.log(err);
    }
    (0, connectDB_1.connectDB)();
});
//# sourceMappingURL=index.js.map