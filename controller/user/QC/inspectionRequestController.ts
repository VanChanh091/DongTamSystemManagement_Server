import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../utils/appError";
import { inspectionRequestService } from "../../../service/manufacture/inspectionRequestService";

// 1. Tạo yêu cầu kiểm tra mới từ xưởng sản xuất
export const createInspectionRequest = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId } = req.body as { planningId: number };

  try {
    if (!planningId || isNaN(planningId)) {
      throw AppError.BadRequest(
        "Mã kế hoạch planningId không hợp lệ hoặc bị thiếu",
        "MISSING_PARAMETERS",
      );
    }

    const response = await inspectionRequestService.createInspectionRequest({
      planningId,
      requestedBy: req.user.fullName,
      user: req.user,
      data: req.body,
    });

    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// 2. QC tiếp nhận yêu cầu kiểm tra
export const qcReceivedRequest = async (req: Request, res: Response, next: NextFunction) => {
  const { inspectionId } = req.query as { inspectionId: string };

  try {
    const response = await inspectionRequestService.qcReceivedRequest({
      inspectionId: Number(inspectionId),
      userName: req.user.fullName,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// 3. QC cập nhật kết quả kiểm tra (passed / failed)
export const updateInspectionRequest = async (req: Request, res: Response, next: NextFunction) => {
  const { inspectionId, status } = req.query as {
    inspectionId: string;
    status: "passed" | "failed";
  };

  try {
    const response = await inspectionRequestService.updateInspectionRequest({
      inspectionId: Number(inspectionId),
      status,
      completedBy: req.user?.fullName || req.body?.completedBy || "QC",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// 4. Lấy lịch sử yêu cầu kiểm tra theo planningId
export const getInspectionRequestByPlanningId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await inspectionRequestService.getInspectionRequestByPlanningId(
      Number(planningId),
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// 5. Lấy danh sách các yêu cầu đang chờ QC tiếp nhận (pending)
export const getPendingInspectionRequests = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await inspectionRequestService.getPendingInspectionRequests();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
