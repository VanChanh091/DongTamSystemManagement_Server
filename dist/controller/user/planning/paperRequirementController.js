"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperRequirements = void 0;
const paperRequirementService_1 = require("../../../service/planning/paperRequirementService");
const getPaperRequirements = async (req, res, next) => {
    const { machine, requirementId } = req.query;
    try {
        let response;
        if (requirementId) {
            response = await paperRequirementService_1.paperRequirementService.getLayersByRequirementId(Number(requirementId));
        }
        else if (machine) {
            response = await paperRequirementService_1.paperRequirementService.getPaperRequirementsList({
                machine,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaperRequirements = getPaperRequirements;
//# sourceMappingURL=paperRequirementController.js.map