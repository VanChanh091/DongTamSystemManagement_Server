import { col, FindOptions, fn, Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { PaperRequirementLayers } from "../../models/planning/requirement/paper_requirement_layers";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";

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
            "totalPrice",
            "dayReplace",
            "matEReplace",
            "matBReplace",
            "matCReplace",
            "matAReplace",
            "matE2Replace",
            "songEReplace",
            "songBReplace",
            "songCReplace",
            "songAReplace",
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

  sumTotalRequiredRequirement: async ({
    ghepKho,
    machine,
    dayStart,
  }: {
    ghepKho: number;
    machine: string;
    dayStart: string | Date;
  }) => {
    return await PaperRequirements.findOne({
      attributes: [
        [fn("COALESCE", fn("SUM", col("PaperRequirements.totalRequiredQty")), 0), "totalQty"],
      ],
      where: { paperRollWidth: ghepKho, status: "PLANNING" },
      include: [
        {
          model: PlanningPaper,
          where: { chooseMachine: machine, dayStart: new Date(dayStart) },
          attributes: [],
          required: true,
        },
      ],
      raw: true,
    });
  },
};
