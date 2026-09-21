"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayjsUtc = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
//Trong một ngày có 24h x 60 phút x 60 giây = 86400 giây
//Khoảng thời gian từ 00:00:00 (startOf)  đến 23:59:59 (endOf) đúng bằng 86399 giây.
exports.dayjsUtc = dayjs_1.default;
//# sourceMappingURL=dayjs.config.js.map