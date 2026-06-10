import { FindOptions, Op, Transaction } from "sequelize";
import { ScrapReport } from "../models/scrap/scrapReport";

export const scrapReportRepository = {
  buildScrapReportOptions: ({
    page,
    pageSize,
    whereCondition,
    isExport = false,
    optionsField,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
    optionsField?: FindOptions;
  }): FindOptions => {
    const options: FindOptions = {
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
  buildMeiliSearchOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const options: FindOptions = {
      where: whereCondition,
      attributes: ["scrapId", "reportedBy", "reportedAt", "status"],
      transaction,
    };

    return options;
  },

  syncScrapReportToMeili: async ({
    scrapId,
    transaction,
  }: {
    scrapId: number;
    transaction?: Transaction;
  }) => {
    return await ScrapReport.findOne(
      scrapReportRepository.buildMeiliSearchOptions({ whereCondition: { scrapId }, transaction }),
    );
  },

  syncAllScrapReportForMeili: async ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }) => {
    return await ScrapReport.findAll(
      scrapReportRepository.buildMeiliSearchOptions({ whereCondition, transaction }),
    );
  },
};
