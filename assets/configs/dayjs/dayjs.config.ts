import dotenv from "dotenv";
dotenv.config();

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const VN_TZ = process.env.TZ || "Asia/Ho_Chi_Minh";
dayjs.tz.setDefault(VN_TZ);

//Trong một ngày có 24h x 60 phút x 60 giây = 86400 giây
//Khoảng thời gian từ 00:00:00 (startOf) đến 23:59:59 (endOf) đúng bằng 86399 giây.

export const dayjsUtc = dayjs;
export default dayjs;
