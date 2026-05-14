import dotenv from "dotenv";
dotenv.config();

import { Meilisearch } from "meilisearch";

interface MeiliConfig {
  apiKey: string;
  host: string;
  port: number;
}

let meiliConfig: MeiliConfig;

const devEnvironment = process.env.NODE_ENV === "development";

if (devEnvironment) {
  meiliConfig = {
    apiKey: process.env.MEILISEARCH_MASTER_KEY_DEV as string,
    host: "localhost",
    port: 7701,
  };
} else {
  meiliConfig = {
    apiKey: process.env.MEILISEARCH_MASTER_KEY_PROD as string,
    host: "192.168.1.151",
    port: 7700,
  };
}

const meiliClient = new Meilisearch({
  host: `http://${meiliConfig.host}:${meiliConfig.port}`,
  apiKey: meiliConfig.apiKey,
});

// console.log("--- CHECK BIẾN MÔI TRƯỜNG ---");
// console.log("NODE_ENV:", process.env.NODE_ENV);
// console.log("MEILI_KEY:", meiliConfig.apiKey ? "Đã nhận" : "Trống rỗng");
// console.log("MEILI_HOST:", meiliConfig.host);
// console.log("MEILI_PORT:", meiliConfig.port);

const connectMeilisearch = async () => {
  try {
    await meiliClient.health();
    console.log("✅ Kết nối Meilisearch thành công!");
  } catch (error) {
    console.error("❌ Lỗi kết nối Meilisearch:", error);
    process.exit(1);
  }
};

// async function showMyKeys() {
//   const keys = await meiliClient.getKeys();
//   console.log("--- DANH SÁCH KEY CỦA BẠN ---");
//   keys.results.forEach((key) => {
//     console.log(`Tên: ${key.name}`);
//     console.log(`Key: ${key.key}`);
//     console.log(`Quyền: ${key.actions.join(", ")}`);
//     console.log("----------------------------");
//   });
// }

// showMyKeys();

export { meiliClient, connectMeilisearch };
