import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB, sequelize } from "./configs/connectDB.js";
import errorMiddlewareHandle from "./middlewares/errorMiddleWare.js";

//create table
import "./models/index.js";

// import routes
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

dotenv.config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//routes
app.use("/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/product", productRoutes);

sequelize
  .sync()
  .then(() => console.log("✅ Database & tables synchronized"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.use(errorMiddlewareHandle);

app.listen(port, (err) => {
  if (err) {
    console.log(err);
  }
  connectDB();
  console.log(`Server is running at http://localhost:${port}`);
});
