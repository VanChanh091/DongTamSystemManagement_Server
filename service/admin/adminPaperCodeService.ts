import { AppError } from "../../utils/appError";
import {
  Suppliers,
  SuppliersCreationAttributes,
} from "../../models/admin/paperClassifications/suppliers";
import {
  PaperTypes,
  PaperTypesCreationAttributes,
} from "../../models/admin/paperClassifications/paperTypes";
import {
  PaperBasisWeights,
  PaperBasisWeightsCreationAttributes,
} from "../../models/admin/paperClassifications/paperBasisWeights";
import {
  SupplierPaperCodes,
  SupplierPaperCodesCreationAttributes,
} from "../../models/admin/paperClassifications/supplierPaperCodes";
import {
  PaperClassifications,
  PaperClassificationsCreationAttributes,
} from "../../models/admin/paperClassifications/paperClassifications";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const adminPaperCodeService = {
  // =========================== SUPPLIERS =================================

  getAllSuppliers: async () => {
    try {
      const allSuppliers = await Suppliers.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      return { message: `get all Suppliers successfully`, data: allSuppliers };
    } catch (error) {
      console.error("get all Suppliers failed:", error);
      throw AppError.ServerError();
    }
  },

  createSupplier: async ({ data }: { data: SuppliersCreationAttributes }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newSupplier = await Suppliers.create({ ...data }, { transaction: transaction });

        return { message: "Create Supplier successfully", data: newSupplier };
      });
    } catch (error) {
      console.error("create Supplier failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateSupplier: async ({
    supplierId,
    data,
  }: {
    supplierId: number;
    data: SuppliersCreationAttributes;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const [affectedCount] = await Suppliers.update(
          { ...data },
          { where: { supplierId }, transaction: transaction },
        );

        if (affectedCount === 0) {
          throw AppError.NotFound("Supplier not found", "SUPPLIER_NOT_FOUND");
        }

        return { message: "Update Supplier successfully", data: { supplierId, ...data } };
      });
    } catch (error) {
      console.error("update Supplier failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // ========================== PAPER TYPES ================================

  getAllPaperTypes: async () => {
    try {
      const allPaperTypes = await PaperTypes.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      return { message: `get all Paper Types successfully`, data: allPaperTypes };
    } catch (error) {
      console.error("get all Paper Types failed:", error);
      throw AppError.ServerError();
    }
  },

  createPaperType: async ({ data }: { data: PaperTypesCreationAttributes }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newPaperType = await PaperTypes.create({ ...data }, { transaction: transaction });

        return { message: "Create Paper Type successfully", data: newPaperType };
      });
    } catch (error) {
      console.error("create Paper Type failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatePaperType: async ({
    paperTypeId,
    data,
  }: {
    paperTypeId: number;
    data: PaperTypesCreationAttributes;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const [affectedCount] = await PaperTypes.update(
          { ...data },
          { where: { paperTypeId }, transaction: transaction },
        );

        if (affectedCount === 0) {
          throw AppError.NotFound("Paper Type not found", "PAPER_TYPE_NOT_FOUND");
        }

        return {
          message: "Update Paper Type successfully",
          data: { paperTypeId, ...data },
        };
      });
    } catch (error) {
      console.error("update Paper Type failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // ====================== PAPER BASIS WEIGHTS ============================

  getAllBasisWeights: async () => {
    try {
      const allBasisWeights = await PaperBasisWeights.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      return { message: `get all Paper Basis Weights successfully`, data: allBasisWeights };
    } catch (error) {
      console.error("get all paper basis weights failed:", error);
      throw AppError.ServerError();
    }
  },

  createBasisWeight: async ({ data }: { data: PaperBasisWeightsCreationAttributes }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newBasisWeight = await PaperBasisWeights.create(
          { ...data },
          { transaction: transaction },
        );

        return { message: "Create Basis Weight successfully", data: newBasisWeight };
      });
    } catch (error) {
      console.error("create Basis Weight failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateBasisWeight: async ({
    basisWeightId,
    data,
  }: {
    basisWeightId: number;
    data: PaperBasisWeightsCreationAttributes;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const [affectedCount] = await PaperBasisWeights.update(
          { ...data },
          { where: { basisWeightId }, transaction: transaction },
        );

        if (affectedCount === 0) {
          throw AppError.NotFound("Basis Weight not found", "BASIS_WEIGHT_NOT_FOUND");
        }

        return {
          message: "Update Basis Weight successfully",
          data: { basisWeightId, ...data },
        };
      });
    } catch (error) {
      console.error("update Basis Weight failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // ====================== SUPPLIER PAPER CODES ===========================

  getAllSupplierPaperCodes: async () => {
    try {
      const allSupplierPaper = await SupplierPaperCodes.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          { model: Suppliers, attributes: ["supplierName", "supplierCode"] },
          { model: PaperTypes, attributes: ["paperName", "paperCode"] },
        ],
      });
      return { message: `get all Supplier Paper Codes successfully`, data: allSupplierPaper };
    } catch (error) {
      console.error("get all Supplier Paper Codes failed:", error);
      throw AppError.ServerError();
    }
  },

  createSupplierPaperCode: async ({ data }: { data: SupplierPaperCodesCreationAttributes }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newSupplierPaperCode = await SupplierPaperCodes.create(
          { ...data },
          { transaction: transaction },
        );

        return {
          message: "Create Supplier Paper Code successfully",
          data: newSupplierPaperCode,
        };
      });
    } catch (error) {
      console.error("create Supplier Paper Code failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateSupplierPaperCode: async ({
    supplierPaperId,
    supplierId,
    paperTypeId,
    data,
  }: {
    supplierPaperId: number;
    supplierId: number;
    paperTypeId: number;
    data: SupplierPaperCodesCreationAttributes;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const [affectedCount] = await SupplierPaperCodes.update(
          { ...data, supplierId, paperTypeId },
          { where: { supplierPaperId }, transaction: transaction },
        );
        if (affectedCount === 0) {
          throw AppError.NotFound("Supplier Paper Code not found", "SUPPLIER_PAPER_CODE_NOT_FOUND");
        }

        return {
          message: "Update Supplier Paper Code successfully",
          data: { ...data, supplierPaperId, supplierId, paperTypeId },
        };
      });
    } catch (error) {
      console.error("update Supplier Paper Code failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // ====================== PAPER CLASSIFICATIONS ==========================

  getAllPaperClassifications: async () => {
    try {
      const allClassifications = await PaperClassifications.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          { model: PaperBasisWeights, attributes: ["basisWeight"], as: "basisWeight" },
          {
            model: SupplierPaperCodes,
            attributes: ["layerType", "supplierCode", "companyCode"],
            as: "supplierPaper",
            include: [
              {
                model: Suppliers,
                attributes: ["supplierName", "supplierCode"],
                required: false,
                where: { isActive: true },
              },
              { model: PaperTypes, attributes: ["paperName", "paperCode"] },
            ],
          },
        ],
      });
      return { message: `get all Paper Classifications successfully`, data: allClassifications };
    } catch (error) {
      console.error("get all Paper Classifications failed:", error);
      throw AppError.ServerError();
    }
  },

  createPaperClassification: async ({ data }: { data: PaperClassificationsCreationAttributes }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newClassification = await PaperClassifications.create(
          { ...data },
          { transaction: transaction },
        );

        return {
          message: "Create Paper Classification successfully",
          data: newClassification,
        };
      });
    } catch (error) {
      console.error("create Paper Classification failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatePaperClassification: async ({
    classificationId,
    supplierPaperId,
    basisWeightId,
    data,
  }: {
    classificationId: number;
    supplierPaperId: number;
    basisWeightId: number;
    data: PaperClassificationsCreationAttributes;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const [affectedCount] = await PaperClassifications.update(
          { ...data, supplierPaperId, basisWeightId },
          { where: { classificationId }, transaction: transaction },
        );

        if (affectedCount === 0) {
          throw AppError.NotFound(
            "Paper Classification not found",
            "PAPER_CLASSIFICATION_NOT_FOUND",
          );
        }

        return {
          message: "Update Paper Classification successfully",
          data: { ...data, classificationId, supplierPaperId, basisWeightId },
        };
      });
    } catch (error) {
      console.error("update Paper Classification failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
