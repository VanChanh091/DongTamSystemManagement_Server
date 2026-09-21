"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusPaper = exports.aggregateReportFields = void 0;
const appError_1 = require("../../appError");
const labelFields_1 = require("../../../assets/labelFields");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../../models/planning/timeOverflowPlanning");
const planningPaperRepository_1 = require("../../../repository/planning/planningPaperRepository");
const meiliService_1 = require("../../../service/system/meiliService");
const transactionHelper_1 = require("../transactionHelper");
const order_1 = require("../../../models/order/order");
const paperRequirements_1 = require("../../../models/planning/requirement/paperRequirements");
const sequelize_1 = require("sequelize");
const crud_helper_repository_1 = require("../../../repository/helper/crud.helper.repository");
const aggregateReportFields = (reports) => {
    const shiftProductions = new Set();
    const shiftManagements = new Set();
    reports.forEach((r) => {
        if (r.shiftProduction)
            shiftProductions.add(r.shiftProduction);
        if (r.shiftManagement)
            shiftManagements.add(r.shiftManagement);
    });
    return {
        // Chuyển Set thành chuỗi, ngăn cách bởi dấu phẩy
        combinedShiftProduction: Array.from(shiftProductions).join(", "),
        combinedShiftManagement: Array.from(shiftManagements).join(", "),
    };
};
exports.aggregateReportFields = aggregateReportFields;
const updateStatusPaper = async ({ planningId, targetStatus, extraValidator, }) => {
    return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
        const ids = Array.isArray(planningId) ? planningId : [planningId];
        const planningPapers = await planningPaperRepository_1.planningPaperRepository.getPapersById({
            planningIds: ids,
            options: {
                attributes: [
                    "planningId",
                    "runningPlan",
                    "qtyProduced",
                    "qtyWasteNorm",
                    "status",
                    "orderId",
                    "statusRequest",
                ],
                include: [{ model: order_1.Order, attributes: ["quantityManufacture"] }],
            },
            transaction,
        });
        if (planningPapers.length !== ids.length) {
            throw appError_1.AppError.BadRequest("Một hoặc nhiều planning không tồn tại", "PLANNING_NOT_FOUND");
        }
        // Thực thi validator riêng
        extraValidator(planningPapers);
        await crud_helper_repository_1.CrudHelper.updateData({
            model: planningPaper_1.PlanningPaper,
            data: { status: targetStatus },
            options: { where: { planningId: ids }, transaction },
        });
        const overflowRows = await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
            where: { planningId: ids },
            transaction,
        });
        if (overflowRows.length > 0) {
            await crud_helper_repository_1.CrudHelper.updateData({
                model: timeOverflowPlanning_1.timeOverflowPlanning,
                data: { status: targetStatus },
                options: { where: { planningId: ids }, transaction },
            });
        }
        if (targetStatus === "complete") {
            //cập nhật status cho paperRequiments
            await crud_helper_repository_1.CrudHelper.updateData({
                model: paperRequirements_1.PaperRequirements,
                data: { status: "COMPLETED" },
                options: { where: { planningId: { [sequelize_1.Op.in]: ids } }, transaction },
            });
        }
        //--------------------MEILISEARCH-----------------------
        const dataForMeili = planningPapers.map((p) => ({
            planningId: p.planningId,
            status: targetStatus,
        }));
        await meiliService_1.meiliService.syncOrUpdateMeiliData({
            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
            data: dataForMeili,
            transaction,
            isUpdate: true,
        });
        return { message: `Planning status updated to ${targetStatus}`, ids };
    });
};
exports.updateStatusPaper = updateStatusPaper;
//# sourceMappingURL=manufactureHelper.js.map