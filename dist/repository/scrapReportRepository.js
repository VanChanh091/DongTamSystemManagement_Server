"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapReportRepository = void 0;
const scrapReport_1 = require("../models/scrap/scrapReport");
exports.scrapReportRepository = {
    buildScrapReportOptions: ({ page, pageSize, whereCondition, isExport = false, optionsField, }) => {
        const options = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            ...optionsField,
        };
        if (page && pageSize) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
            options.order = [["scrapId", "DESC"]];
        }
        if (isExport) {
            options.raw = true;
            options.nest = true;
        }
        return options;
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliSearchOptions: ({ whereCondition, transaction, }) => {
        const options = {
            where: whereCondition,
            attributes: ["scrapId", "reportedBy", "reportedAt", "status"],
            transaction,
        };
        return options;
    },
    syncScrapReportToMeili: async ({ scrapId, transaction, }) => {
        return await scrapReport_1.ScrapReport.findOne(exports.scrapReportRepository.buildMeiliSearchOptions({ whereCondition: { scrapId }, transaction }));
    },
    syncAllScrapReportForMeili: async ({ whereCondition, transaction, }) => {
        return await scrapReport_1.ScrapReport.findAll(exports.scrapReportRepository.buildMeiliSearchOptions({ whereCondition, transaction }));
    },
};
//# sourceMappingURL=scrapReportRepository.js.map