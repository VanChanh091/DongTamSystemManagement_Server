import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Khởi tạo Sequelize với thông tin kết nối MySQL
const sequelize = new Sequelize("DongTam", "root", process.env.PASSWORD, {
  host: "localhost",
  dialect: "mysql",
  port: 3306,
  timezone: "+07:00",
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối MySQL thành công!");
  } catch (error) {
    console.error("❌ Lỗi kết nối MySQL:", error);
    process.exit(1);
  }
};

export { sequelize, connectDB };
