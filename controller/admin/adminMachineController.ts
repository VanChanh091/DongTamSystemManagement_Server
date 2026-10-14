import { NextFunction, Request, Response } from "express";
import { MachinePaper, MachinePaperCreationAttributes } from "../../models/admin/machinePaper";
import { MachineBox, MachineBoxCreationAttributes } from "../../models/admin/machineBox";
import { adminService } from "../../service/admin/adminService";

//===============================PAPER=====================================

export const getMachinePapers = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    let response;

    if (machineId) {
      response = await adminService.getItemById({
        model: MachinePaper,
        itemId: Number(machineId),
      });
    } else {
      response = await adminService.getAllItems({ model: MachinePaper });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getRawMachinePapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await MachinePaper.findAll({
      attributes: ["machineId", "machineName"],
      raw: true,
    });

    // Lọc trùng tên máy (chỉ giữ 1 bản ghi duy nhất cho mỗi machineName)
    const uniqueMap = new Map<string, (typeof response)[0]>();
    for (const item of response) {
      if (item.machineName && !uniqueMap.has(item.machineName)) {
        uniqueMap.set(item.machineName, item);
      }
    }
    const uniqueList = Array.from(uniqueMap.values());

    // Định nghĩa hàm xác định độ ưu tiên sắp xếp
    const getPriority = (name: string | null | undefined) => {
      const lower = (name ?? "").toLowerCase();

      // Nhóm máy có số lớn (1350, 1800, 1900...) -> ưu tiên hàng đầu, xếp theo giá trị số
      const matchNumber = lower.match(/\d{3,4}/);
      if (matchNumber) {
        return { group: 1, val: parseInt(matchNumber[0], 10) };
      }

      // Nhóm "máy 2 lớp"
      if (lower.includes("2 lớp")) {
        return { group: 2, val: 0 };
      }

      // Nhóm "máy quấn cuồn"
      if (lower.includes("quấn cuồn")) {
        return { group: 3, val: 0 };
      }

      // Các trường hợp khác (nếu có phát sinh)
      return { group: 4, val: 0 };
    };

    // Tiến hành sắp xếp danh sách
    const sortedList = uniqueList.sort((a, b) => {
      const pA = getPriority(a.machineName);
      const pB = getPriority(b.machineName);

      if (pA.group !== pB.group) {
        return pA.group - pB.group;
      }
      if (pA.group === 1) {
        return pA.val - pB.val; // Xếp từ bé đến lớn: 1350 -> 1800 -> 1900
      }
      return (a.machineName ?? "").localeCompare(b.machineName ?? "", "vi");
    });

    return res.status(200).json({ message: "get raw machine successfully", data: sortedList });
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: MachinePaper,
      data: req.body as MachinePaperCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update machine
export const updateMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.updateItem({
      model: MachinePaper,
      itemId: Number(machineId),
      dataUpdated: req.body,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.deleteItem({
      model: MachinePaper,
      itemId: Number(machineId),
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================BOX=====================================

export const getMachineBoxes = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    let response;

    if (machineId) {
      response = await adminService.getItemById({ model: MachineBox, itemId: Number(machineId) });
    } else {
      response = await adminService.getAllItems({ model: MachineBox });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: MachineBox,
      data: req.body as MachineBoxCreationAttributes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update machine
export const updateMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };
  const { ...machineUpdated } = req.body;

  try {
    const response = await adminService.updateItem({
      model: MachineBox,
      itemId: Number(machineId),
      dataUpdated: machineUpdated,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.deleteItem({
      model: MachineBox,
      itemId: Number(machineId),
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
