import { Op, Transaction } from "sequelize";
import { PaperTypes } from "../../models/admin/paperClassifications/paperTypes";
import {
  SupplierPaperCodes,
  SupplierPaperCodesAttributes,
  SupplierPaperCodesCreationAttributes,
} from "../../models/admin/paperClassifications/supplierPaperCodes";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { Suppliers } from "../../models/admin/paperClassifications/suppliers";
import {
  PaperClassifications,
  PaperClassificationsAttributes,
  PaperClassificationsCreationAttributes,
} from "../../models/admin/paperClassifications/paperClassifications";
import { PaperBasisWeights } from "../../models/admin/paperClassifications/paperBasisWeights";
import {
  getClassificationDependencyMaps,
  getSupplierAndPaperTypeMaps,
} from "../../utils/helper/modelHelper/paperCodeHelper";

export const adminPaperCodeService = {
  //=============================== SUPPLIERS =================================
  updateActiveSupplier: async ({
    supplierId,
    isActive,
  }: {
    supplierId: number;
    isActive: boolean;
  }) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const supplier = await Suppliers.findByPk(supplierId, { transaction });
        if (!supplier) {
          throw AppError.NotFound(`Supplier ID ${supplierId} not found`, "SUPPLIER_NOT_FOUND");
        }

        await supplier.update({ isActive }, { transaction });

        return { message: `Successfully updated active for supplier` };
      });
    } catch (error) {
      console.error("update active supplier failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=============================== SUPPLIER PAPER CODES =================================
  getAllSupplierPaperCodes: async () => {
    try {
      const supplierPaperCodes = await SupplierPaperCodes.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: Suppliers,
            attributes: ["supplierName", "supplierCode"],
            where: { isActive: true },
          },
          { model: PaperTypes, attributes: ["paperName", "paperCode", "grade"] },
        ],
      });

      return { message: "Successfully retrieved supplier paper codes", data: supplierPaperCodes };
    } catch (error) {
      console.error("get all supplier paper codes failed:", error);
      throw AppError.ServerError();
    }
  },

  createSupplierPaperCode: async (items: SupplierPaperCodesCreationAttributes[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        const { supplierMap, paperTypeMap } = await getSupplierAndPaperTypeMaps({
          supplierIds: items.map((i) => i.supplierId),
          paperTypeIds: items.map((i) => i.paperTypeId),
          transaction,
        });

        const payload = items.map((item) => {
          if (!supplierMap.has(item.supplierId)) {
            throw AppError.NotFound(
              `Supplier ID ${item.supplierId} not found`,
              "SUPPLIER_NOT_FOUND",
            );
          }
          if (!paperTypeMap.has(item.paperTypeId)) {
            throw AppError.NotFound(
              `Paper Type ID ${item.paperTypeId} not found`,
              "PAPER_TYPE_NOT_FOUND",
            );
          }

          const paperCode = paperTypeMap.get(item.paperTypeId)!;
          const transferCode = supplierMap.get(item.supplierId)!;
          const generatedCompanyCode = `${paperCode}${transferCode}`.toUpperCase();

          return { ...item, companyCode: generatedCompanyCode };
        });

        const newSupplierPaperCodes = await SupplierPaperCodes.bulkCreate(payload, {
          transaction,
        });

        return {
          message: "Supplier paper codes created successfully",
          data: newSupplierPaperCodes,
        };
      });
    } catch (error) {
      console.error("create supplier paper codes failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateSupplierPaperCode: async (items: SupplierPaperCodesAttributes[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        const targetIds = items.map((i) => i.supplierPaperId);
        const existingRecords = await SupplierPaperCodes.findAll({
          where: { supplierPaperId: { [Op.in]: targetIds } },
          transaction,
        });

        if (existingRecords.length !== targetIds.length) {
          throw AppError.NotFound(
            "One or more Supplier Paper Codes not found",
            "SOME_RECORDS_NOT_FOUND",
          );
        }

        const existingRecordMap = new Map(existingRecords.map((r) => [r.supplierPaperId, r]));

        // Gom tất cả paperTypeId và paperTypeId cần dùng để query
        const neededSupplierIds: number[] = [];
        const neededPaperTypeIds: number[] = [];

        items.forEach((item) => {
          const current = existingRecordMap.get(item.supplierPaperId)!;
          neededSupplierIds.push(item.supplierId || current.supplierId);
          neededPaperTypeIds.push(item.paperTypeId || current.paperTypeId);
        });

        const { supplierMap, paperTypeMap } = await getSupplierAndPaperTypeMaps({
          supplierIds: neededSupplierIds,
          paperTypeIds: neededPaperTypeIds,
          transaction,
        });

        const updatePromises = items.map((item) => {
          const current = existingRecordMap.get(item.supplierPaperId)!;
          const targetSupplierId = item.supplierId || current.supplierId;
          const targetPaperTypeId = item.paperTypeId || current.paperTypeId;

          const transferCode = supplierMap.get(targetSupplierId);
          const paperCode = paperTypeMap.get(targetPaperTypeId);

          if (!transferCode) {
            throw AppError.NotFound(
              `Supplier ID ${targetSupplierId} not found`,
              "SUPPLIER_NOT_FOUND",
            );
          } else if (!paperCode) {
            throw AppError.NotFound(
              `Paper Type ID ${targetPaperTypeId} not found`,
              "PAPER_TYPE_NOT_FOUND",
            );
          }

          const updateData: Record<string, any> = { ...item };

          // Nếu có thay đổi paperTypeId hoặc companyCode -> Tạo lại companyCode
          if (item.supplierId !== undefined || item.paperTypeId !== undefined) {
            updateData.companyCode = `${paperCode}${transferCode}`.toUpperCase();
          }

          return SupplierPaperCodes.update(updateData, {
            where: { supplierPaperId: item.supplierPaperId },
            transaction,
          });
        });

        await Promise.all(updatePromises);

        return { message: `Successfully updated ${items.length} records` };
      });
    } catch (error) {
      console.error("update supplier paper codes failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=============================== PAPER CLASSIFICATIONS =================================
  getAllPaperClassifications: async ({ page, pageSize }: { page: number; pageSize: number }) => {
    try {
      const { rows, count } = await PaperClassifications.findAndCountAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          { model: PaperBasisWeights, attributes: ["basisWeight"], as: "basisWeight" },
          {
            model: SupplierPaperCodes,
            attributes: ["companyCode"],
            as: "supplierPaper",
            include: [
              {
                model: Suppliers,
                attributes: ["supplierName", "supplierCode"],
                required: false,
                where: { isActive: true },
              },
              { model: PaperTypes, attributes: ["paperName", "paperCode", "grade"] },
            ],
          },
        ],

        offset: (page - 1) * pageSize,
        limit: pageSize,
        order: [
          [{ model: SupplierPaperCodes, as: "supplierPaper" }, Suppliers, "supplierName", "ASC"],
          [{ model: PaperBasisWeights, as: "basisWeight" }, "basisWeight", "ASC"],
        ],
      });

      const responseData = {
        message: "Successfully retrieved paper classifications",
        data: rows,
        totalOrders: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      return responseData;
    } catch (error) {
      console.error("get all paper classifications failed:", error);
      throw AppError.ServerError();
    }
  },

  createPaperClassification: async (items: PaperClassificationsCreationAttributes[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        const { supplierPaperMap, basisWeightMap } = await getClassificationDependencyMaps({
          supplierPaperIds: items.map((i) => i.supplierPaperId),
          basisWeightIds: items.map((i) => i.basisWeightId),
          transaction,
        });

        const payload = items.map((item) => {
          const supplierPaper = supplierPaperMap.get(item.supplierPaperId);
          const basisWeight = basisWeightMap.get(item.basisWeightId);

          if (!supplierPaper) {
            throw AppError.NotFound(
              `Supplier Paper ID ${item.supplierPaperId} not found`,
              "SUPPLIER_PAPER_NOT_FOUND",
            );
          } else if (!basisWeight) {
            throw AppError.NotFound(
              `Basis Weight ID ${item.basisWeightId} not found`,
              "BASIS_WEIGHT_NOT_FOUND",
            );
          }

          const generatedPaperCode = `${supplierPaper.companyCode}${basisWeight}`.toUpperCase();
          const generatedWeightCategory =
            `${supplierPaper.paperTypeCode}${basisWeight}`.toUpperCase();

          return {
            ...item,
            paperCode: generatedPaperCode,
            weightCategory: generatedWeightCategory,
          };
        });

        const newClassifications = await PaperClassifications.bulkCreate(payload, {
          transaction,
        });

        return { message: "Successfully created paper classifications", data: newClassifications };
      });
    } catch (error) {
      console.error("create paper classification failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatePaperClassification: async (items: PaperClassificationsAttributes[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        const targetIds = items.map((i) => i.classificationId);
        const existingRecords = await PaperClassifications.findAll({
          where: { classificationId: { [Op.in]: targetIds } },
          transaction,
        });

        if (existingRecords.length !== targetIds.length) {
          throw AppError.NotFound(
            "One or more Paper Classifications not found",
            "SOME_RECORDS_NOT_FOUND",
          );
        }

        const existingRecordMap = new Map(existingRecords.map((r) => [r.classificationId, r]));

        // Gom tất cả supplierPaperId và basisWeightId cần dùng để query
        const neededSupplierPaperIds: number[] = [];
        const neededBasisWeightIds: number[] = [];

        items.forEach((item) => {
          const existingRecord = existingRecordMap.get(item.classificationId);
          if (existingRecord) {
            neededSupplierPaperIds.push(item.supplierPaperId);
            neededBasisWeightIds.push(item.basisWeightId);
          }
        });

        const { supplierPaperMap, basisWeightMap } = await getClassificationDependencyMaps({
          supplierPaperIds: neededSupplierPaperIds,
          basisWeightIds: neededBasisWeightIds,
          transaction,
        });

        const updatePromises = items.map((item) => {
          const current = existingRecordMap.get(item.classificationId)!;
          const targetSupplierPaperId = item.supplierPaperId || current.supplierPaperId;
          const targetBasisWeightId = item.basisWeightId || current.basisWeightId;

          const supplierPaper = supplierPaperMap.get(targetSupplierPaperId);
          const basisWeight = basisWeightMap.get(targetBasisWeightId);

          if (!supplierPaper) {
            throw AppError.NotFound(
              `Supplier Paper ID ${targetSupplierPaperId} not found`,
              "SUPPLIER_PAPER_NOT_FOUND",
            );
          } else if (!basisWeight) {
            throw AppError.NotFound(
              `Basis Weight ID ${targetBasisWeightId} not found`,
              "BASIS_WEIGHT_NOT_FOUND",
            );
          }

          const updateData: Record<string, any> = { ...item };

          // Nếu có thay đổi supplierPaperId hoặc basisWeightId
          // Tạo lại paperCode và weightCategory
          if (item.supplierPaperId !== undefined || item.basisWeightId !== undefined) {
            updateData.paperCode = `${supplierPaper.companyCode}${basisWeight}`.toUpperCase();
            updateData.weightCategory =
              `${supplierPaper.paperTypeCode}${basisWeight}`.toUpperCase();
          }

          return PaperClassifications.update(updateData, {
            where: { classificationId: item.classificationId },
            transaction,
          });
        });

        await Promise.all(updatePromises);

        return { message: `Successfully updated ${items.length} records` };
      });
    } catch (error) {
      console.error("update paper classification failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //using for auto complete and dropdown
};
