"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPaperCodeService = void 0;
const sequelize_1 = require("sequelize");
const supplierPaperCodes_1 = require("../../models/admin/paperClassifications/supplierPaperCodes");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const suppliers_1 = require("../../models/admin/paperClassifications/suppliers");
const paperClassifications_1 = require("../../models/admin/paperClassifications/paperClassifications");
const paperTypes_1 = require("../../models/admin/paperClassifications/paperTypes");
const paperBasisWeights_1 = require("../../models/admin/paperClassifications/paperBasisWeights");
const paperCodeHelper_1 = require("../../utils/helper/modelHelper/paperCodeHelper");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const adminRepository_1 = require("../../repository/adminRepository");
exports.adminPaperCodeService = {
    //=============================== SUPPLIERS =================================
    updateSupplier: async ({ supplierId, data, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existingSupplier = await suppliers_1.Suppliers.findByPk(supplierId, { transaction });
                if (!existingSupplier) {
                    throw appError_1.AppError.NotFound("Supplier not found", "ITEM_NOT_FOUND");
                }
                const isTransferCodeChanged = data.transferCode !== undefined &&
                    data.transferCode.trim().toUpperCase() !==
                        existingSupplier.transferCode.trim().toUpperCase();
                // Cập nhật bảng Suppliers
                await existingSupplier.update(data, { transaction });
                // Nếu transferCode thay đổi
                if (isTransferCodeChanged) {
                    const newTransferCode = data.transferCode.trim().toUpperCase();
                    const supplierPapers = await supplierPaperCodes_1.SupplierPaperCodes.findAll({
                        where: { supplierId },
                        include: [{ model: paperTypes_1.PaperTypes, attributes: ["paperCode"] }],
                        transaction,
                    });
                    if (supplierPapers.length > 0) {
                        const supplierPaperMap = new Map(); // supplierPaperId -> newCompanyCode
                        // Cập nhật companyCode trong SupplierPaperCodes
                        const spcUpdatePromises = supplierPapers.map((spc) => {
                            const paperCode = spc.PaperType?.paperCode || "";
                            const newCompanyCode = `${paperCode}${newTransferCode}`.toUpperCase();
                            supplierPaperMap.set(spc.supplierPaperId, newCompanyCode);
                            return spc.update({ companyCode: newCompanyCode }, { transaction });
                        });
                        await Promise.all(spcUpdatePromises);
                        const supplierPaperIds = supplierPapers.map((spc) => spc.supplierPaperId);
                        // Lấy tất cả PaperClassifications liên kết với các supplierPaperIds kèm PaperBasisWeights
                        const classifications = await paperClassifications_1.PaperClassifications.findAll({
                            where: { supplierPaperId: { [sequelize_1.Op.in]: supplierPaperIds } },
                            include: [
                                { model: paperBasisWeights_1.PaperBasisWeights, as: "basisWeight", attributes: ["basisWeight"] },
                            ],
                            transaction,
                        });
                        if (classifications.length > 0) {
                            // Cập nhật paperCode trong PaperClassifications
                            const classUpdatePromises = classifications.map((classification) => {
                                const companyCode = supplierPaperMap.get(classification.supplierPaperId) || "";
                                const basisWeight = classification.basisWeight?.basisWeight ?? 0;
                                const formattedBasisWeight = String(basisWeight).padStart(3, "0");
                                const newPaperCode = `${companyCode}${formattedBasisWeight}`.toUpperCase();
                                return classification.update({ paperCode: newPaperCode }, { transaction });
                            });
                            await Promise.all(classUpdatePromises);
                        }
                    }
                }
                return {
                    message: "Update supplier successfully",
                    data: { supplierId, ...data },
                };
            });
        }
        catch (error) {
            console.error("Update supplier failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    toggleActiveSupplier: async ({ supplierId }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const supplier = await suppliers_1.Suppliers.findByPk(supplierId, { transaction });
                if (!supplier) {
                    throw appError_1.AppError.NotFound("Supplier not found", "ITEM_NOT_FOUND");
                }
                const nextActiveState = !supplier.isActive;
                await crud_helper_repository_1.CrudHelper.updateData({
                    model: suppliers_1.Suppliers,
                    data: { isActive: nextActiveState },
                    options: { where: { supplierId }, transaction },
                });
                return { message: `Successfully toggled supplier status ` };
            });
        }
        catch (error) {
            console.error("Toggle active supplier failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //=============================== SUPPLIER PAPER CODES =================================
    getAllSupplierPaperCodes: async () => {
        try {
            const supplierPaperCodes = await adminRepository_1.adminRepository.getAllSupplierPaperCode();
            return { message: "Successfully retrieved supplier paper codes", data: supplierPaperCodes };
        }
        catch (error) {
            console.error("get all supplier paper codes failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createSupplierPaperCode: async (items) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const { supplierMap, paperTypeMap } = await (0, paperCodeHelper_1.getSupplierAndPaperTypeMaps)({
                    supplierIds: items.map((i) => i.supplierId),
                    paperTypeIds: items.map((i) => i.paperTypeId),
                    transaction,
                });
                const payload = items.map((item) => {
                    if (!supplierMap.has(item.supplierId)) {
                        throw appError_1.AppError.NotFound(`Supplier ID ${item.supplierId} not found`, "SUPPLIER_NOT_FOUND");
                    }
                    if (!paperTypeMap.has(item.paperTypeId)) {
                        throw appError_1.AppError.NotFound(`Paper Type ID ${item.paperTypeId} not found`, "PAPER_TYPE_NOT_FOUND");
                    }
                    const paperCode = paperTypeMap.get(item.paperTypeId);
                    const transferCode = supplierMap.get(item.supplierId);
                    const generatedCompanyCode = `${paperCode}${transferCode}`.toUpperCase();
                    return { ...item, companyCode: generatedCompanyCode };
                });
                const newSupplierPaperCodes = await supplierPaperCodes_1.SupplierPaperCodes.bulkCreate(payload, { transaction });
                return {
                    message: "Supplier paper codes created successfully",
                    data: newSupplierPaperCodes,
                };
            });
        }
        catch (error) {
            console.error("create supplier paper codes failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateSupplierPaperCode: async (items) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const targetIds = items.map((i) => i.supplierPaperId);
                const existingRecords = await supplierPaperCodes_1.SupplierPaperCodes.findAll({
                    where: { supplierPaperId: { [sequelize_1.Op.in]: targetIds } },
                    transaction,
                });
                if (existingRecords.length !== targetIds.length) {
                    throw appError_1.AppError.NotFound("One or more Supplier Paper Codes not found", "SOME_RECORDS_NOT_FOUND");
                }
                const existingRecordMap = new Map(existingRecords.map((r) => [r.supplierPaperId, r]));
                // Gom tất cả paperTypeId và paperTypeId cần dùng để query
                const neededSupplierIds = [];
                const neededPaperTypeIds = [];
                items.forEach((item) => {
                    const current = existingRecordMap.get(item.supplierPaperId);
                    neededSupplierIds.push(item.supplierId || current.supplierId);
                    neededPaperTypeIds.push(item.paperTypeId || current.paperTypeId);
                });
                const { supplierMap, paperTypeMap } = await (0, paperCodeHelper_1.getSupplierAndPaperTypeMaps)({
                    supplierIds: neededSupplierIds,
                    paperTypeIds: neededPaperTypeIds,
                    transaction,
                });
                const updatePromises = items.map((item) => {
                    const current = existingRecordMap.get(item.supplierPaperId);
                    const targetSupplierId = item.supplierId || current.supplierId;
                    const targetPaperTypeId = item.paperTypeId || current.paperTypeId;
                    const transferCode = supplierMap.get(targetSupplierId);
                    const paperCode = paperTypeMap.get(targetPaperTypeId);
                    if (!transferCode) {
                        throw appError_1.AppError.NotFound(`Supplier ID ${targetSupplierId} not found`, "SUPPLIER_NOT_FOUND");
                    }
                    else if (!paperCode) {
                        throw appError_1.AppError.NotFound(`Paper Type ID ${targetPaperTypeId} not found`, "PAPER_TYPE_NOT_FOUND");
                    }
                    const updateData = { ...item };
                    // Nếu có thay đổi paperTypeId hoặc companyCode -> Tạo lại companyCode
                    if (item.supplierId !== undefined || item.paperTypeId !== undefined) {
                        updateData.companyCode = `${paperCode}${transferCode}`.toUpperCase();
                    }
                    return supplierPaperCodes_1.SupplierPaperCodes.update(updateData, {
                        where: { supplierPaperId: item.supplierPaperId },
                        transaction,
                    });
                });
                await Promise.all(updatePromises);
                return { message: `Successfully updated ${items.length} records` };
            });
        }
        catch (error) {
            console.error("update supplier paper codes failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //=============================== PAPER CLASSIFICATIONS =================================
    getAllPaperClassifications: async ({ page, pageSize }) => {
        try {
            const { rows, count } = await adminRepository_1.adminRepository.getPaperClassification({ page, pageSize });
            const responseData = {
                message: "Successfully retrieved paper classifications",
                data: rows,
                totalOrders: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            return responseData;
        }
        catch (error) {
            console.error("get all paper classifications failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createPaperClassification: async (items) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const { supplierPaperMap, basisWeightMap } = await (0, paperCodeHelper_1.getClassificationDependencyMaps)({
                    supplierPaperIds: items.map((i) => i.supplierPaperId),
                    basisWeightIds: items.map((i) => i.basisWeightId),
                    transaction,
                });
                const payload = items.map((item) => {
                    const supplierPaper = supplierPaperMap.get(item.supplierPaperId);
                    const basisWeight = basisWeightMap.get(item.basisWeightId);
                    if (!supplierPaper) {
                        throw appError_1.AppError.NotFound(`Supplier Paper ID ${item.supplierPaperId} not found`, "SUPPLIER_PAPER_NOT_FOUND");
                    }
                    else if (!basisWeight) {
                        throw appError_1.AppError.NotFound(`Basis Weight ID ${item.basisWeightId} not found`, "BASIS_WEIGHT_NOT_FOUND");
                    }
                    const formattedBasisWeight = String(basisWeight).padStart(3, "0");
                    const generatedPaperCode = `${supplierPaper.companyCode}${formattedBasisWeight}`.toUpperCase();
                    const generatedWeightCategory = `${supplierPaper.paperTypeCode}${formattedBasisWeight}`.toUpperCase();
                    return {
                        ...item,
                        paperCode: generatedPaperCode,
                        weightCategory: generatedWeightCategory,
                    };
                });
                const newClassifications = await paperClassifications_1.PaperClassifications.bulkCreate(payload, { transaction });
                return { message: "Successfully created paper classifications", data: newClassifications };
            });
        }
        catch (error) {
            console.error("create paper classification failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updatePaperClassification: async (items) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const targetIds = items.map((i) => i.classificationId);
                const existingRecords = await paperClassifications_1.PaperClassifications.findAll({
                    where: { classificationId: { [sequelize_1.Op.in]: targetIds } },
                    transaction,
                });
                if (existingRecords.length !== targetIds.length) {
                    throw appError_1.AppError.NotFound("One or more Paper Classifications not found", "SOME_RECORDS_NOT_FOUND");
                }
                const existingRecordMap = new Map(existingRecords.map((r) => [r.classificationId, r]));
                // Gom tất cả supplierPaperId và basisWeightId cần dùng để query
                const neededSupplierPaperIds = [];
                const neededBasisWeightIds = [];
                items.forEach((item) => {
                    const existingRecord = existingRecordMap.get(item.classificationId);
                    if (existingRecord) {
                        neededSupplierPaperIds.push(item.supplierPaperId);
                        neededBasisWeightIds.push(item.basisWeightId);
                    }
                });
                const { supplierPaperMap, basisWeightMap } = await (0, paperCodeHelper_1.getClassificationDependencyMaps)({
                    supplierPaperIds: neededSupplierPaperIds,
                    basisWeightIds: neededBasisWeightIds,
                    transaction,
                });
                const updatePromises = items.map((item) => {
                    const current = existingRecordMap.get(item.classificationId);
                    const targetSupplierPaperId = item.supplierPaperId || current.supplierPaperId;
                    const targetBasisWeightId = item.basisWeightId || current.basisWeightId;
                    const supplierPaper = supplierPaperMap.get(targetSupplierPaperId);
                    const basisWeight = basisWeightMap.get(targetBasisWeightId);
                    if (!supplierPaper) {
                        throw appError_1.AppError.NotFound(`Supplier Paper ID ${targetSupplierPaperId} not found`, "SUPPLIER_PAPER_NOT_FOUND");
                    }
                    else if (!basisWeight) {
                        throw appError_1.AppError.NotFound(`Basis Weight ID ${targetBasisWeightId} not found`, "BASIS_WEIGHT_NOT_FOUND");
                    }
                    const updateData = { ...item };
                    // Nếu có thay đổi supplierPaperId hoặc basisWeightId
                    // Tạo lại paperCode và weightCategory
                    if (item.supplierPaperId !== undefined || item.basisWeightId !== undefined) {
                        const formattedBasisWeight = String(basisWeight).padStart(3, "0");
                        updateData.paperCode =
                            `${supplierPaper.companyCode}${formattedBasisWeight}`.toUpperCase();
                        updateData.weightCategory =
                            `${supplierPaper.paperTypeCode}${formattedBasisWeight}`.toUpperCase();
                    }
                    return paperClassifications_1.PaperClassifications.update(updateData, {
                        where: { classificationId: item.classificationId },
                        transaction,
                    });
                });
                await Promise.all(updatePromises);
                return { message: `Successfully updated ${items.length} records` };
            });
        }
        catch (error) {
            console.error("update paper classification failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=adminPaperCodeService.js.map