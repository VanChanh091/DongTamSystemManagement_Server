"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paperRequirementRepo = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const planningPaper_1 = require("../../models/planning/planningPaper");
const paper_requirement_layers_1 = require("../../models/planning/requirement/paper_requirement_layers");
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
};
//# sourceMappingURL=paperRequirementRepository.js.map