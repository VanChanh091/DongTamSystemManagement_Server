import { FindOptions, Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { PaperRequirementLayers } from "../../models/planning/requirement/paper_requirement_layers";

export const paperRequirementRepo = {
  buildPaperRequirementsOptions: ({
    page,
    pageSize,
    machine,
    whereCondition,
  }: {
    page: number;
    pageSize: number;
    machine: string;
    whereCondition?: any;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: { status: "PLANNING", ...whereCondition },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          where: {
            chooseMachine: machine,
            status: { [Op.in]: ["planning", "lackQty", "producing", "requested"] },
          },
          attributes: [
            "orderId",
            "dayStart",
            "ghepKho",
            "runningPlan",
            "dayReplace",
            "matEReplace",
            "matBReplace",
            "matCReplace",
            "matE2Replace",
            "songEReplace",
            "songBReplace",
            "songCReplace",
            "songE2Replace",
            "chooseMachine",
            "lengthPaperPlanning",
            "sizePaperPLaning",
          ],
          include: [
            {
              model: Order,
              attributes: ["flute", "dateRequestShipping"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["requirementId", "ASC"]];
    }

    return queryOptions;
  },

  getLayerRequirementsById: async (requirementId: number) => {
    return await PaperRequirementLayers.findAll({
      where: { requirementId },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },
};
