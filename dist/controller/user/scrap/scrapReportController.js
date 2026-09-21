"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelScrapReports = exports.deleteScrapReport = exports.handleUpdateScrapReport = exports.updateScrapReport = exports.createScrapReport = exports.getAllScrapReports = void 0;
const scrapReportService_1 = require("../../../service/scrapReportService");
const getAllScrapReports = async (req, res, next) => {
    const { page, pageSize, field, keyword, startDate, endDate, status, machine } = req.query;
    try {
        let response;
        if (field && keyword) {
            response = await scrapReportService_1.scrapReportService.getScrapReportByField({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
                startDate,
                endDate,
                status,
                machine: machine,
            });
        }
        else if (page && pageSize) {
            response = await scrapReportService_1.scrapReportService.getScrapReportByStatus({
                page: Number(page),
                pageSize: Number(pageSize),
                status,
                machine: machine,
            });
        }
        else {
            response = await scrapReportService_1.scrapReportService.getScrapReportWaitingCheck();
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllScrapReports = getAllScrapReports;
const createScrapReport = async (req, res, next) => {
    const { wasteNormField } = req.body;
    try {
        const response = await scrapReportService_1.scrapReportService.createScrapReport({
            scrapData: req.body,
            wasteNormField,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createScrapReport = createScrapReport;
const updateScrapReport = async (req, res, next) => {
    const { scrapId, wasteNormField } = req.body;
    try {
        const response = await scrapReportService_1.scrapReportService.updateScrapReport({
            scrapId,
            updateData: req.body,
            wasteNormField,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateScrapReport = updateScrapReport;
const handleUpdateScrapReport = async (req, res, next) => {
    const { scrapId, status, rejectReason, machine, dayCompleted, shiftProduction, action } = req.body;
    try {
        let response;
        switch (action) {
            case "CONFIRM_OR_REJECT":
                response = await scrapReportService_1.scrapReportService.confirmOrRejectScrapReport({
                    scrapId,
                    status: status,
                    rejectReason,
                });
                break;
            case "ALLOCATE_SCRAP_REPORT":
                response = await scrapReportService_1.scrapReportService.allocateScrapReport({
                    scrapId,
                    machine: machine,
                    dayCompleted: dayCompleted,
                    shiftProduction: shiftProduction,
                });
                break;
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handleUpdateScrapReport = handleUpdateScrapReport;
const deleteScrapReport = async (req, res, next) => {
    const { scrapId } = req.query;
    try {
        const response = await scrapReportService_1.scrapReportService.deleteScrapReport({ scrapId: Number(scrapId) });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteScrapReport = deleteScrapReport;
//export excel
const exportExcelScrapReports = async (req, res, next) => {
    const { fromDate, toDate } = req.body;
    try {
        await scrapReportService_1.scrapReportService.exportExcelScrapReports(res, { fromDate, toDate }, req.user.email);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelScrapReports = exportExcelScrapReports;
//# sourceMappingURL=scrapReportController.js.map