import { adminRepository } from "../../repository/adminRepository";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { WaveCrestCoefficient } from "../../models/admin/waveCrestCoefficient";

export const adminMachineService = {
  //===============================ADMIN MACHINE=====================================

  getAllMachine: async (model: any) => {
    try {
      const result = await adminRepository.getAllMachine(model);
      return { message: "get all machine successfully", data: result };
    } catch (error) {
      console.error("failed to get all machine: ", error);
      throw AppError.ServerError();
    }
  },

  getMachineById: async (model: any, machineId: number) => {
    try {
      const machine = await adminRepository.getMachineByPk(model, machineId);
      if (!machine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      return { message: `get machine by id: ${machineId}`, data: machine };
    } catch (error) {
      console.error(`failed to get machine by id: ${machineId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createMachine: async (model: any, data: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newMachine = await adminRepository.createMachine(model, data, transaction);

        return { message: "Create machine successfully", data: newMachine };
      });
    } catch (error) {
      console.error("❌ Failed to create machine:", error);
      throw AppError.ServerError();
    }
  },

  updateMachineById: async (model: any, machineId: number, machineUpdated: any) => {
    try {
      const existingMachine = await adminRepository.getMachineByPk(model, machineId);
      if (!existingMachine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      await existingMachine.update({ ...machineUpdated });

      return { message: "update machine successfully", data: existingMachine };
    } catch (error) {
      console.error("failed to update machine", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteMachineById: async (model: any, machineId: number) => {
    try {
      const machine = await adminRepository.getMachineByPk(model, machineId);
      if (!machine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      await machine.destroy();

      return { message: `delete machineId: ${machineId} successfully` };
    } catch (error) {
      console.error("failed to delete machine", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN WASTE NORM=====================================

  getAllWaste: async (model: any) => {
    try {
      const data = await adminRepository.getAllWaste(model);
      return { message: "get all waste successfully", data };
    } catch (error) {
      console.error("failed to get all waste", error);
      throw AppError.ServerError();
    }
  },

  getWasteById: async (model: any, wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wasteId not found", "WASTE_NOT_FOUND");
      }

      return { message: `get waste by wasteId: ${wasteId}`, data: wasteNorm };
    } catch (error) {
      console.error(`failed to get wasteId: ${wasteId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createWaste: async (model: any, data: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newWasteNorm = await adminRepository.createWaste(model, data, transaction);

        return { message: "create waste successfully", data: newWasteNorm };
      });
    } catch (error) {
      console.error("failed to create waste", error);
      throw AppError.ServerError();
    }
  },

  updateWaste: async (model: any, wasteId: number, wasteNormUpdated: any) => {
    try {
      const existingWasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!existingWasteNorm) {
        throw AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
      }

      await adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });

      return { message: "update waste norm successfully", data: existingWasteNorm };
    } catch (error) {
      console.error("failed to update waste norm", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteWaste: async (model: any, wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
      }

      await wasteNorm.destroy();

      return { message: `delete wasteNormId: ${wasteId} successfully` };
    } catch (error) {
      console.error("failed to delete waste norm", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN WASTE CREST=====================================

  getAllWaveCrestCoefficient: async () => {
    try {
      const data = await adminRepository.getAllWaste(WaveCrestCoefficient);
      return { message: "get all wave crest coefficient successfully", data };
    } catch (error) {
      console.error("failed to get all wave crest coefficient", error);
      throw AppError.ServerError();
    }
  },

  getWaveCrestById: async (wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wave crest not found", "WAVE_CREST_NOT_FOUND");
      }

      return { message: `get wave crest by waveCrestId: ${wasteId}`, data: wasteNorm };
    } catch (error) {
      console.error(`failed to get wave crest by waveCrestId: ${wasteId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createWaveCrestCoefficient: async (data: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newWasteNorm = await adminRepository.createWaste(
          WaveCrestCoefficient,
          data,
          transaction
        );

        return { message: "create wave crest coefficient successfully", data: newWasteNorm };
      });
    } catch (error) {
      console.error("failed to create wave crest coefficient", error);
      throw AppError.ServerError();
    }
  },

  updateWaveCrestById: async (wasteId: number, wasteNormUpdated: any) => {
    try {
      const existingWasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!existingWasteNorm) {
        throw AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
      }

      await adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });

      return { message: "update wave crest coefficient successfully", data: existingWasteNorm };
    } catch (error) {
      console.error("failed to update wave crest coefficient", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteWaveCrestById: async (wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
      }

      await wasteNorm.destroy();

      return { message: `delete waveCrestCoefficientId: ${wasteId} successfully` };
    } catch (error) {
      console.error("failed to delete wave crest coefficient", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
