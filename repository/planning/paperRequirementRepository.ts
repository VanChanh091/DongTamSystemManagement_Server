import { FindOptions, Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { PaperRequirementLayers } from "../../models/planning/requirement/paper_requirement_layers";

const statusList = ["planning", "lackQty", "producing", "requested"];

export const paperRequirementRepo = {
  buildPaperRequirementsOptions: ({
    machine,
    whereCondition,
  }: {
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
            status: { [Op.in]: statusList },
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
            "sortPlanning",
          ],
          include: [
            {
              model: Order,
              attributes: ["flute", "dateRequestShipping", "isFSC"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
    };

    return queryOptions;
  },

  getLayerRequirementsById: async (requirementId: number) => {
    return await PaperRequirementLayers.findAll({
      where: { requirementId },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },
};
