import { Sequelize } from "sequelize";

// Khởi tạo Sequelize với thông tin kết nối MySQL
const sequelize = new Sequelize("DongTam", "root", "dongtam123", {
  host: "localhost",
  dialect: "mysql",
  port: 3306,
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
