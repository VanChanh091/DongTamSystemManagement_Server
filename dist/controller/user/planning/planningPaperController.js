"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndex_TimeRunning = exports.pauseOrAcceptLackQtyPLanning = exports.changeMachinePlanning = exports.getPlanningPaperByfield = exports.getPlanningByMachine = exports.planningOrder = exports.getOrderAccept = void 0;
const planningPaperService_1 = require("../../../service/planning/planningPaperService");
//===============================PLANNING ORDER=====================================
//getOrderAccept
const getOrderAccept = async (req, res) => {
    try {
        const response = await planningPaperService_1.planningPaperService.getOrderAccept();
        return res.status(200).json({
            ...response,
            message: response.fromCache
                ? "get all order have status:accept from cache"
                : "get all order have status:accept",
        });
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getOrderAccept = getOrderAccept;
//planning order
const planningOrder = async (req, res) => {
    const { orderId } = req.query;
    const planningData = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.planningOrder(orderId, planningData);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.planningOrder = planningOrder;
//===============================PRODUCTION QUEUE=====================================
//get planning by machine
const getPlanningByMachine = async (req, res) => {
    const { machine } = req.query;
    try {
        const response = await planningPaperService_1.planningPaperService.getPlanningByMachine(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningByMachine = getPlanningByMachine;
//get planning paper by field
const getPlanningPaperByfield = async (req, res) => {
    const { machine, field, keyword } = req.query;
    try {
        const response = await planningPaperService_1.planningPaperService.getPlanningByField(machine, field, keyword);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningPaperByfield = getPlanningPaperByfield;
//change planning machine
const changeMachinePlanning = async (req, res) => {
    const { planningIds, newMachine } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.changeMachinePlanning(planningIds, newMachine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.changeMachinePlanning = changeMachinePlanning;
//pause or accept lack of qty
const pauseOrAcceptLackQtyPLanning = async (req, res) => {
    const { planningIds, newStatus, rejectReason } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning(planningIds, newStatus, rejectReason);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.pauseOrAcceptLackQtyPLanning = pauseOrAcceptLackQtyPLanning;
//update index & time running
const updateIndex_TimeRunning = async (req, res) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.updateIndex_TimeRunning({
            req,
            machine: machine,
            updateIndex: updateIndex,
            dayStart: dayStart,
            timeStart: timeStart,
            totalTimeWorking: totalTimeWorking,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateIndex_TimeRunning = updateIndex_TimeRunning;
//# sourceMappingURL=planningPaperController.js.map