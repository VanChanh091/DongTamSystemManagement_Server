import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB, sequelize } from "./configs/connectDB.js";
import errorMiddlewareHandle from "./middlewares/errorMiddleWare.js";

//create table
import "./models/index.js";

// import routes
import authRoutes from "./routes/authRoutes.js";

const app = express();

dotenv.config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

sequelize
  .sync({ alter: true })
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
