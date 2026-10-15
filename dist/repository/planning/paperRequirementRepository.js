"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paperRequirementRepo = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const planningPaper_1 = require("../../models/planning/planningPaper");
const paper_requirement_layers_1 = require("../../models/planning/requirement/paper_requirement_layers");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const statusList = ["planning", "lackQty", "producing", "requested"];
exports.paperRequirementRepo = {
    buildPaperRequirementsOptions: ({ machine, whereCondition, }) => {
        const queryOptions = {
            where: { status: "PLANNING", ...whereCondition },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: {
                        chooseMachine: machine,
                        status: { [sequelize_1.Op.in]: statusList },
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
                            model: order_1.Order,
                            attributes: ["flute", "dateRequestShipping", "isFSC"],
                            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                        },
                    ],
                },
            ],
        };
        return queryOptions;
    },
    getLayerRequirementsById: async (requirementId) => {
        return await paper_requirement_layers_1.PaperRequirementLayers.findAll({
            where: { requirementId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    },
    sumTotalRequiredRequirement: async ({ ghepKho, machine, dayStart, }) => {
        return await paperRequirements_1.PaperRequirements.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("PaperRequirements.totalRequiredQty")), 0), "totalQty"],
            ],
            where: { paperRollWidth: ghepKho, status: "PLANNING" },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine, dayStart: new Date(dayStart) },
                    attributes: [],
                    required: true,
                },
            ],
            raw: true,
        });
    },
};
//# sourceMappingURL=paperRequirementRepository.js.map