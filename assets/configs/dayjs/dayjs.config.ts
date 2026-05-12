import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

//Trong một ngày có 24h x 60 phút x 60 giây = 86400 giây
//Khoảng thời gian từ 00:00:00 (startOf)  đến 23:59:59 (endOf) đúng bằng 86399 giây.

export const dayjsUtc = dayjs;
