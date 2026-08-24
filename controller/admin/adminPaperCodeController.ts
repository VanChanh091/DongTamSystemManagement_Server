import { NextFunction, Request, Response } from "express";
import { adminPaperCodeService } from "../../service/admin/adminPaperCodeService";
import { SuppliersCreationAttributes } from "../../models/admin/paperClassifications/suppliers";
import { PaperTypesCreationAttributes } from "../../models/admin/paperClassifications/paperTypes";
import { PaperBasisWeightsCreationAttributes } from "../../models/admin/paperClassifications/paperBasisWeights";
import { SupplierPaperCodesCreationAttributes } from "../../models/admin/paperClassifications/supplierPaperCodes";
import { PaperClassificationsCreationAttributes } from "../../models/admin/paperClassifications/paperClassifications";

// ============================= SUPPLIERS =================================

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.getAllSuppliers();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.createSupplier({
      data: req.body as SuppliersCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  const { supplierId } = req.query as { supplierId: string };

  try {
    const response = await adminPaperCodeService.updateSupplier({
      supplierId: Number(supplierId),
      data: req.body as SuppliersCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ========================== PAPER TYPES ================================

export const getAllPaperTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.getAllPaperTypes();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createPaperType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.createPaperType({
      data: req.body as PaperTypesCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePaperType = async (req: Request, res: Response, next: NextFunction) => {
  const { paperTypeId } = req.query as { paperTypeId: string };

  try {
    const response = await adminPaperCodeService.updatePaperType({
      paperTypeId: Number(paperTypeId),
      data: req.body as PaperTypesCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ====================== PAPER BASIS WEIGHTS ============================

export const getAllBasisWeights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.getAllBasisWeights();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createBasisWeight = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.createBasisWeight({
      data: req.body as PaperBasisWeightsCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateBasisWeight = async (req: Request, res: Response, next: NextFunction) => {
  const { basisWeightId } = req.query as { basisWeightId: string };

  try {
    const response = await adminPaperCodeService.updateBasisWeight({
      basisWeightId: Number(basisWeightId),
      data: req.body as PaperBasisWeightsCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ====================== SUPPLIER PAPER CODES ===========================
export const getAllSupplierPaperCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.getAllSupplierPaperCodes();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createSupplierPaperCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.createSupplierPaperCode({
      data: req.body as SupplierPaperCodesCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateSupplierPaperCode = async (req: Request, res: Response, next: NextFunction) => {
  const { supplierPaperId, supplierId, paperTypeId } = req.query as {
    supplierPaperId: string;
    supplierId: string;
    paperTypeId: string;
  };

  try {
    const response = await adminPaperCodeService.updateSupplierPaperCode({
      supplierPaperId: Number(supplierPaperId),
      supplierId: Number(supplierId),
      paperTypeId: Number(paperTypeId),
      data: req.body as SupplierPaperCodesCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ====================== PAPER CLASSIFICATIONS ==========================

export const getAllPaperClassifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await adminPaperCodeService.getAllPaperClassifications();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createPaperClassification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await adminPaperCodeService.createPaperClassification({
      data: req.body as PaperClassificationsCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePaperClassification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { classificationId, supplierPaperId, basisWeightId } = req.query as {
    classificationId: string;
    supplierPaperId: string;
    basisWeightId: string;
  };

  try {
    const response = await adminPaperCodeService.updatePaperClassification({
      classificationId: Number(classificationId),
      supplierPaperId: Number(supplierPaperId),
      basisWeightId: Number(basisWeightId),
      data: req.body as PaperClassificationsCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
