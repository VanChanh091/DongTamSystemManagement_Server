"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayjsUtc = exports.VN_TZ = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
exports.VN_TZ = process.env.TZ || "Asia/Ho_Chi_Minh";
dayjs_1.default.tz.setDefault(exports.VN_TZ);
//Trong một ngày có 24h x 60 phút x 60 giây = 86400 giây
//Khoảng thời gian từ 00:00:00 (startOf) đến 23:59:59 (endOf) đúng bằng 86399 giây.
exports.dayjsUtc = dayjs_1.default;
exports.default = dayjs_1.default;
//# sourceMappingURL=dayjs.config.js.map