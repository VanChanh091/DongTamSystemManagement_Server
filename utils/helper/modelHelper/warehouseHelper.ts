import { Op } from "sequelize";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { warehouseRepository } from "../../../repository/warehouseRepository";
import { OutboundDetail } from "../../../models/warehouse/outboundDetail";
import { OutboundHistory } from "../../../models/warehouse/outboundHistory";
import { Order } from "../../../models/order/order";
import { Customer } from "../../../models/customer/customer";

export const calculateTotalPriceByDate = async (
  dataList: any[],
  field: string,
  keyword: string,
): Promise<Record<string, number>> => {
  if (!dataList || dataList.length === 0) return {};

  // Lọc lấy các ngày duy nhất dạng YYYY-MM-DD
  const uniqueDates = Array.from(
    new Set(dataList.map((item: any) => dayjsUtc(item.dateOutbound).format("YYYY-MM-DD"))),
  );

  // Tạo điều kiện OR các khoảng thời gian tĩnh
  const dateConditions = uniqueDates.map((date) => ({
    dateOutbound: { [Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`] },
  }));

  let mainWhereCondition: any = { [Op.or]: dateConditions };

  if (keyword) {
    if (field === "customerName") {
      const matchedRecords = await OutboundHistory.findAll({
        where: { [Op.or]: dateConditions },
        attributes: ["outboundId"],
        include: [
          {
            model: OutboundDetail,
            as: "detail",
            required: true,
            attributes: [], // Không lấy thuộc tính để query chạy nhẹ
            include: [
              {
                model: Order,
                required: true,
                attributes: [],
                include: [
                  {
                    model: Customer,
                    required: true,
                    attributes: [],
                    where: { customerName: { [Op.like]: `%${keyword}%` } },
                  },
                ],
              },
            ],
          },
        ],
        raw: true,
      });

      const uniqueIds = Array.from(new Set(matchedRecords.map((item: any) => item.outboundId)));
      mainWhereCondition = { outboundId: { [Op.in]: uniqueIds } };
    }
  }

  const dbTotals = await warehouseRepository.getTotalPriceByDateRanges({
    whereCondition: mainWhereCondition,
  });

  return dbTotals.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.dateStr] = Math.round(Number(curr.total));
    return acc;
  }, {});
};
