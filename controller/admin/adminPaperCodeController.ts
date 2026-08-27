import { NextFunction, Request, Response } from "express";
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
  SupplierPaperCodesAttributes,
  SupplierPaperCodesCreationAttributes,
} from "../../models/admin/paperClassifications/supplierPaperCodes";
import {
  PaperClassifications,
  PaperClassificationsAttributes,
  PaperClassificationsCreationAttributes,
} from "../../models/admin/paperClassifications/paperClassifications";
import { adminService } from "../../service/admin/adminService";
import { adminPaperCodeService } from "../../service/admin/adminPaperCodeService";

// ============================= SUPPLIERS =================================

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({ model: Suppliers });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: Suppliers,
      data: req.body as SuppliersCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleUpdateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  const { supplierId } = req.query as { supplierId: string };
  const { isActive } = req.body as { isActive?: boolean };

  try {
    let response;

    if (isActive) {
      response = await adminPaperCodeService.updateActiveSupplier({
        supplierId: Number(supplierId),
        isActive,
      });
    } else {
      response = await adminService.updateItem({
        model: Suppliers,
        itemId: Number(supplierId),
        dataUpdated: req.body as SuppliersCreationAttributes,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ========================== PAPER TYPES ================================

export const getAllPaperTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({ model: PaperTypes });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createPaperType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: PaperTypes,
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
    const response = await adminService.updateItem({
      model: PaperTypes,
      itemId: Number(paperTypeId),
      dataUpdated: req.body as PaperTypesCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ====================== PAPER BASIS WEIGHTS ============================

export const getAllBasisWeights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({ model: PaperBasisWeights });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createBasisWeight = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: PaperBasisWeights,
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
    const response = await adminService.updateItem({
      model: PaperBasisWeights,
      itemId: Number(basisWeightId),
      dataUpdated: req.body as PaperBasisWeightsCreationAttributes,
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
    const response = await adminPaperCodeService.createSupplierPaperCode(
      req.body as SupplierPaperCodesCreationAttributes[],
    );

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateSupplierPaperCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminPaperCodeService.updateSupplierPaperCode(
      req.body as SupplierPaperCodesAttributes[],
    );

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
  const { page, pageSize } = req.query as { page: string; pageSize: string };

  try {
    const response = await adminPaperCodeService.getAllPaperClassifications({
      page: Number(page),
      pageSize: Number(pageSize),
    });
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
    const response = await adminPaperCodeService.createPaperClassification(
      req.body as PaperClassificationsCreationAttributes[],
    );

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
  try {
    const response = await adminPaperCodeService.updatePaperClassification(
      req.body as PaperClassificationsAttributes[],
    );

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
