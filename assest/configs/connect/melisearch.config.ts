import dotenv from "dotenv";
dotenv.config();

import { Meilisearch } from "meilisearch";

const meiliClient = new Meilisearch({
  host: "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY,
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
