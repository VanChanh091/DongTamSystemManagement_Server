import { Customer } from "../models/customer/customer";
import { Order } from "../models/order/order";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Product } from "../models/product/product";
import { InboundHistory } from "../models/warehouse/inboundHistory";

export const warehouseRepository = {
  getAllInboundHistory: async (page: number, pageSize: number) => {
    return await InboundHistory.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          attributes: ["planningId", "qtyProduced"],
          include: [
            {
              model: Order,
              attributes: [
                "orderId",
                "flute",
                "QC_box",
                "day",
                "matE",
                "matB",
                "matC",
                "matE2",
                "songE",
                "songB",
                "songC",
                "songE2",
                "lengthPaperCustomer",
                "paperSizeCustomer",
                "quantityCustomer",
              ],
              include: [
                { model: Customer, attributes: ["customerName", "companyName"] },
                { model: Product, attributes: ["typeProduct", "productName"] },
              ],
            },
          ],
        },
        {
          model: PlanningBox,
          attributes: ["planningBoxId"],
          include: [
            {
              model: Order,
              attributes: [
                "orderId",
                "flute",
                "QC_box",
                "day",
                "matE",
                "matB",
                "matC",
                "matE2",
                "songE",
                "songB",
                "songC",
                "songE2",
                "lengthPaperCustomer",
                "paperSizeCustomer",
                "quantityCustomer",
              ],
              include: [
                { model: Customer, attributes: ["customerName", "companyName"] },
                { model: Product, attributes: ["typeProduct", "productName"] },
              ],
            },
          ],
        },
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [["inboundId", "ASC"]],
    });
  },
};
