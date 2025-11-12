import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

interface DBConfig {
  database: string;
  username: string;
  password: string;
  host: string;
}

let dbConfig: DBConfig;

const env = process.env.NODE_ENV === "development";

if (env) {
  dbConfig = {
    database: process.env.DB_NAME_DEV as string,
    username: process.env.DB_USER_DEV as string,
    password: process.env.DB_PASS_DEV as string,
    host: process.env.DB_HOST_DEV as string,
  };
} else {
  dbConfig = {
    database: process.env.DB_NAME_PROD as string,
    username: process.env.DB_USER_PROD as string,
    password: process.env.DB_PASS_PROD as string,
    host: process.env.DB_HOST_PROD as string,
  };
}

// Khởi tạo Sequelize với thông tin kết nối MySQL
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect: "mysql",
  port: 3306,
  timezone: "+07:00",
  logging: false,
});

const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    // console.log("✅ Kết nối MySQL thành công!");
    console.log(`✅ Đang chạy ở môi trường ${process.env.NODE_ENV}!`);
  } catch (error) {
    console.error("❌ Lỗi kết nối MySQL:", error);
    process.exit(1);
  }
};

export { sequelize, connectDB };
