"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMeilisearch = exports.meiliClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const meilisearch_1 = require("meilisearch");
const meiliClient = new meilisearch_1.Meilisearch({
    host: "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_MASTER_KEY,
});
exports.meiliClient = meiliClient;
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
//# sourceMappingURL=melisearch.config.js.map