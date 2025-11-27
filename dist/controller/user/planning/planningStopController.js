"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanningStop = void 0;
const planningStopService_1 = require("../../../service/planning/planningStopService");
const getPlanningStop = async (req, res) => {
    const { page = 1, pageSize = 20 } = req.query;
    try {
        const response = await planningStopService_1.planningStopService.getPlanningStop(Number(page), Number(pageSize));
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningStop = getPlanningStop;
//# sourceMappingURL=planningStopController.js.map