"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassificationDependencyMaps = exports.getSupplierAndPaperTypeMaps = void 0;
const sequelize_1 = require("sequelize");
const suppliers_1 = require("../../../models/admin/paperClassifications/suppliers");
const paperTypes_1 = require("../../../models/admin/paperClassifications/paperTypes");
const paperBasisWeights_1 = require("../../../models/admin/paperClassifications/paperBasisWeights");
const supplierPaperCodes_1 = require("../../../models/admin/paperClassifications/supplierPaperCodes");
//helper function to get supplier and paper type maps
const getSupplierAndPaperTypeMaps = async ({ supplierIds, paperTypeIds, transaction, }) => {
    const uniqueSupplierIds = [...new Set(supplierIds.filter(Boolean))];
    const uniquePaperTypeIds = [...new Set(paperTypeIds.filter(Boolean))];
    const [suppliers, paperTypes] = await Promise.all([
        uniqueSupplierIds.length > 0
            ? suppliers_1.Suppliers.findAll({
                where: { supplierId: { [sequelize_1.Op.in]: uniqueSupplierIds } },
                attributes: ["supplierId", "transferCode"],
                transaction,
            })
            : [],
        uniquePaperTypeIds.length > 0
            ? paperTypes_1.PaperTypes.findAll({
                where: { paperTypeId: { [sequelize_1.Op.in]: uniquePaperTypeIds } },
                attributes: ["paperTypeId", "paperCode"],
                transaction,
            })
            : [],
    ]);
    const supplierMap = new Map(suppliers.map((s) => [s.supplierId, s.transferCode || ""]));
    const paperTypeMap = new Map(paperTypes.map((pt) => [pt.paperTypeId, pt.paperCode || ""]));
    return { supplierMap, paperTypeMap };
};
exports.getSupplierAndPaperTypeMaps = getSupplierAndPaperTypeMaps;
const getClassificationDependencyMaps = async ({ supplierPaperIds, basisWeightIds, transaction, }) => {
    const uniqueSupplierPaperIds = [...new Set(supplierPaperIds.filter(Boolean))];
    const uniqueBasisWeightIds = [...new Set(basisWeightIds.filter(Boolean))];
    const [supplierPapers, basisWeights] = await Promise.all([
        uniqueSupplierPaperIds.length > 0
            ? supplierPaperCodes_1.SupplierPaperCodes.findAll({
                where: { supplierPaperId: { [sequelize_1.Op.in]: uniqueSupplierPaperIds } },
                attributes: ["supplierPaperId", "companyCode"],
                include: [
                    {
                        model: paperTypes_1.PaperTypes,
                        attributes: ["paperCode"],
                    },
                ],
                transaction,
            })
            : [],
        uniqueBasisWeightIds.length > 0
            ? paperBasisWeights_1.PaperBasisWeights.findAll({
                where: { basisWeightId: { [sequelize_1.Op.in]: uniqueBasisWeightIds } },
                attributes: ["basisWeightId", "basisWeight"],
                transaction,
            })
            : [],
    ]);
    // Map supplierPaperId và basisWeightId
    const supplierPaperMap = new Map();
    supplierPapers.forEach((spc) => {
        supplierPaperMap.set(spc.supplierPaperId, {
            companyCode: spc.companyCode || "",
            paperTypeCode: spc.PaperType?.paperCode || "",
        });
    });
    const basisWeightMap = new Map(basisWeights.map((bw) => [bw.basisWeightId, bw.basisWeight]));
    return { supplierPaperMap, basisWeightMap };
};
exports.getClassificationDependencyMaps = getClassificationDependencyMaps;
//# sourceMappingURL=paperCodeHelper.js.map