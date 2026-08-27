import { Op, Transaction } from "sequelize";
import { Suppliers } from "../../../models/admin/paperClassifications/suppliers";
import { PaperTypes } from "../../../models/admin/paperClassifications/paperTypes";
import { PaperBasisWeights } from "../../../models/admin/paperClassifications/paperBasisWeights";
import { SupplierPaperCodes } from "../../../models/admin/paperClassifications/supplierPaperCodes";

//helper function to get supplier and paper type maps
export const getSupplierAndPaperTypeMaps = async ({
  supplierIds,
  paperTypeIds,
  transaction,
}: {
  supplierIds: number[];
  paperTypeIds: number[];
  transaction?: Transaction;
}) => {
  const uniqueSupplierIds = [...new Set(supplierIds.filter(Boolean))];
  const uniquePaperTypeIds = [...new Set(paperTypeIds.filter(Boolean))];

  const [suppliers, paperTypes] = await Promise.all([
    uniqueSupplierIds.length > 0
      ? Suppliers.findAll({
          where: { supplierId: { [Op.in]: uniqueSupplierIds } },
          attributes: ["supplierId", "transferCode"],
          transaction,
        })
      : [],
    uniquePaperTypeIds.length > 0
      ? PaperTypes.findAll({
          where: { paperTypeId: { [Op.in]: uniquePaperTypeIds } },
          attributes: ["paperTypeId", "paperCode"],
          transaction,
        })
      : [],
  ]);

  const supplierMap = new Map<number, string>(
    suppliers.map((s) => [s.supplierId, s.transferCode || ""]),
  );
  const paperTypeMap = new Map<number, string>(
    paperTypes.map((pt) => [pt.paperTypeId, pt.paperCode || ""]),
  );

  return { supplierMap, paperTypeMap };
};

export const getClassificationDependencyMaps = async ({
  supplierPaperIds,
  basisWeightIds,
  transaction,
}: {
  supplierPaperIds: number[];
  basisWeightIds: number[];
  transaction?: Transaction;
}) => {
  const uniqueSupplierPaperIds = [...new Set(supplierPaperIds.filter(Boolean))];
  const uniqueBasisWeightIds = [...new Set(basisWeightIds.filter(Boolean))];

  const [supplierPapers, basisWeights] = await Promise.all([
    uniqueSupplierPaperIds.length > 0
      ? SupplierPaperCodes.findAll({
          where: { supplierPaperId: { [Op.in]: uniqueSupplierPaperIds } },
          attributes: ["supplierPaperId", "companyCode"],
          include: [
            {
              model: PaperTypes,
              attributes: ["paperCode"],
            },
          ],
          transaction,
        })
      : [],
    uniqueBasisWeightIds.length > 0
      ? PaperBasisWeights.findAll({
          where: { basisWeightId: { [Op.in]: uniqueBasisWeightIds } },
          attributes: ["basisWeightId", "basisWeight"],
          transaction,
        })
      : [],
  ]);

  // Map supplierPaperId và basisWeightId
  const supplierPaperMap = new Map<number, { companyCode: string; paperTypeCode: string }>();

  supplierPapers.forEach((spc: SupplierPaperCodes) => {
    supplierPaperMap.set(spc.supplierPaperId, {
      companyCode: spc.companyCode || "",
      paperTypeCode: spc.PaperType?.paperCode || "",
    });
  });

  const basisWeightMap = new Map<number, number>(
    basisWeights.map((bw) => [bw.basisWeightId, bw.basisWeight]),
  );

  return { supplierPaperMap, basisWeightMap };
};
