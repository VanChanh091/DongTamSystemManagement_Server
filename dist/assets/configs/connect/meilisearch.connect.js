"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMeilisearch = exports.meiliClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const meilisearch_1 = require("meilisearch");
let meiliConfig;
const devEnvironment = process.env.NODE_ENV === "development";
if (devEnvironment) {
    meiliConfig = {
        apiKey: process.env.MEILISEARCH_MASTER_KEY_DEV,
        host: "localhost",
        port: 7701,
    };
}
else {
    meiliConfig = {
        apiKey: process.env.MEILISEARCH_MASTER_KEY_PROD,
        host: "192.168.1.81",
        port: 7700,
    };
}
const meiliClient = new meilisearch_1.Meilisearch({
    host: `http://${meiliConfig.host}:${meiliConfig.port}`,
    apiKey: meiliConfig.apiKey,
});
exports.meiliClient = meiliClient;
// console.log("--- CHECK BIẾN MÔI TRƯỜNG ---");
// console.log("NODE_ENV:", process.env.NODE_ENV);
// console.log("MEILI_KEY:", meiliConfig.apiKey ? "Đã nhận" : "Trống rỗng");
// console.log("MEILI_HOST:", meiliConfig.host);
// console.log("MEILI_PORT:", meiliConfig.port);
const connectMeilisearch = async () => {
    try {
        await meiliClient.health();
        console.log("✅ Kết nối Meilisearch thành công!");
    }
    catch (error) {
        console.error("❌ Lỗi kết nối Meilisearch:", error);
        process.exit(1);
    }
};
exports.connectMeilisearch = connectMeilisearch;
//# sourceMappingURL=meilisearch.connect.js.map