import dotenv from "dotenv";
dotenv.config();

import { Meilisearch } from "meilisearch";

const devEnvironment = process.env.NODE_ENV === "development";

const apiKey = devEnvironment
  ? process.env.MEILISEARCH_MASTER_KEY_DEV
  : process.env.MEILISEARCH_MASTER_KEY_PROD;
const host = devEnvironment ? "localhost" : "192.168.1.81";
const port = devEnvironment ? 7701 : 7700;

// console.log(`apiKey: ${apiKey} - host: ${host} - port: ${port}`);

const meiliClient = new Meilisearch({
  host: `http://${host}:${port}`,
  apiKey: apiKey,
});

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
