import { Op } from "sequelize";
import { Order } from "../../../models/order/order";
import { Customer } from "../../../models/customer/customer";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { OutboundDetail } from "../../../models/warehouse/outboundDetail";
import { OutboundHistory } from "../../../models/warehouse/outboundHistory";
import { warehouseRepository } from "../../../repository/warehouseRepository";

export const buildSearchWhereCondition = async (
  field: string,
  keyword: string,
  startDate?: string,
  endDate?: string,
) => {
  let searchWhereCondition: any = {};

  if (field === "dateOutbound") {
    // Hàm phụ check xem chuỗi ngày từ FE
    const isValidDateString = (dateStr: any) => {
      if (
        !dateStr ||
        dateStr === "" ||
        dateStr === "Invalid date" ||
        dateStr === "null" ||
        dateStr === "undefined"
      ) {
        return false;
      }
      return dayjsUtc(dateStr).isValid();
    };

    if (isValidDateString(startDate) && isValidDateString(endDate)) {
      // Ép format về chuẩn YYYY-MM-DD của DB cho an toàn sạch sẽ
      const formattedStart = dayjsUtc(startDate).format("YYYY-MM-DD");
      const formattedEnd = dayjsUtc(endDate).format("YYYY-MM-DD");

      searchWhereCondition.dateOutbound = {
        [Op.between]: [`${formattedStart} 00:00:00`, `${formattedEnd} 23:59:59`],
      };
    }
  } else if (field === "customerName" && keyword) {
    const matchedRecords = await OutboundHistory.findAll({
      attributes: ["outboundId"],
      include: [
        {
          model: OutboundDetail,
          as: "detail",
          required: true,
          attributes: [],
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

    const allCustomerOutboundIds = Array.from(
      new Set(matchedRecords.map((item: any) => item.outboundId)),
    );
    searchWhereCondition = { outboundId: { [Op.in]: allCustomerOutboundIds } };
  }

  return searchWhereCondition;
};

export const calculateTotalPriceByDate = async (
  dataList: any[],
  searchWhereCondition: any = {},
): Promise<Record<string, number>> => {
  if (!dataList || dataList.length === 0) return {};

  const uniqueDates = Array.from(
    new Set(dataList.map((item: any) => dayjsUtc(item.dateOutbound).format("YYYY-MM-DD"))),
  );

  const dateConditions = uniqueDates.map((date) => ({
    dateOutbound: { [Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`] },
  }));

  const dbTotals = await warehouseRepository.getTotalPriceByDateRanges({
    whereCondition: {
      [Op.or]: dateConditions,
      ...searchWhereCondition,
    },
  });

  return dbTotals.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.dateStr] = Math.round(Number(curr.total));
    return acc;
  }, {});
};

export const calculateGrandTotal = async (
  whereCondition?: any,
): Promise<{
  totalPriceOrder: number;
  totalPriceVAT: number;
  totalPricePayment: number;
}> => {
  const result = await warehouseRepository.getTotalPriceGrandTotal(whereCondition);
  return {
    totalPriceOrder: Math.round(result?.totalPriceOrder || 0),
    totalPriceVAT: Math.round(result?.totalPriceVAT || 0),
    totalPricePayment: Math.round(result?.totalPricePayment || 0),
  };
};
