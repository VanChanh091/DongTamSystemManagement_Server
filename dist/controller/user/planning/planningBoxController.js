"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndex_TimeRunningBox = exports.acceptLackQtyBox = exports.getPlanningBoxByfield = exports.getPlanningBox = void 0;
const planningBoxService_1 = require("../../../service/planning/planningBoxService");
//get all planning box
const getPlanningBox = async (req, res) => {
    const { machine } = req.query;
    try {
        const response = await planningBoxService_1.planningBoxService.getPlanningBox(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningBox = getPlanningBox;
//get by field
const getPlanningBoxByfield = async (req, res) => {
    const { machine, field, keyword } = req.query;
    try {
        const response = await planningBoxService_1.planningBoxService.getPlanningBoxByField(machine, field, keyword);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningBoxByfield = getPlanningBoxByfield;
const acceptLackQtyBox = async (req, res) => {
    const { planningBoxIds, newStatus, machine } = req.body;
    try {
        const response = await planningBoxService_1.planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.acceptLackQtyBox = acceptLackQtyBox;
//update index planning
const updateIndex_TimeRunningBox = async (req, res) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;
    try {
        const response = await planningBoxService_1.planningBoxService.updateIndex_TimeRunningBox({
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
exports.updateIndex_TimeRunningBox = updateIndex_TimeRunningBox;
//# sourceMappingURL=planningBoxController.js.map