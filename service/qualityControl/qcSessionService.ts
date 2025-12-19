import { processTypeQC } from "../../models/qualityControl/qcCriteria";
import { QcSession, statusQcSession } from "../../models/qualityControl/qcSession";
import { User } from "../../models/user/user";
import { planningRepository } from "../../repository/planningRepository";
import { qcRepository } from "../../repository/qcRepository";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const qcSessionService = {
  getAllQcSession: async () => {
    try {
      const allSession = await qcRepository.getAllQcSession();

      return { message: `get Qc allCriteria successfully`, data: allSession };
    } catch (error) {
      console.error("get all QC session failed:", error);
      throw AppError.ServerError();
    }
  },

  getSessionByFk: async ({
    planningId,
    planningBoxId,
  }: {
    planningId?: number;
    planningBoxId?: number;
  }) => {
    try {
      if (!planningId && !planningBoxId) {
        throw AppError.BadRequest("planningId or planningBoxId is required", "MISSING_FK");
      }

      if (planningId && planningBoxId) {
        throw AppError.BadRequest(
          "Only one of planningId or planningBoxId is allowed",
          "INVALID_FK"
        );
      }

      const whereCondition = planningId ? { planningId } : { planningBoxId };

      const session = await qcRepository.findOneSession(whereCondition);

      return { message: "get QC session successfully", data: session };
    } catch (error) {
      console.error("get all QC session failed:", error);
      throw AppError.ServerError();
    }
  },

  getSessionByField: async (field: string) => {
    try {
    } catch (error) {
      console.error(`get all QC session by ${field} failed:`, error);
      throw AppError.ServerError();
    }
  },

  createNewSession: async ({
    processType,
    planningId,
    planningBoxId,
    totalSample = 3,
    transaction,
    user,
  }: {
    processType: processTypeQC;
    planningId?: number;
    planningBoxId?: number;
    totalSample?: number;
    transaction?: any;
    user: any;
  }) => {
    const { userId } = user;

    try {
      // validate FK
      if (processType === "paper" && !planningId) {
        throw AppError.BadRequest("planningId is required for paper QC", "PLANNINGID_IS_REQUIRED");
      }

      if (processType === "box" && !planningBoxId) {
        throw AppError.BadRequest(
          "planningBoxId is required for box QC",
          "PLANNINGBOXID_IS_REQUIRED"
        );
      }

      if (totalSample !== undefined && totalSample < 1) {
        throw AppError.BadRequest(
          "totalSample must be greater than 0",
          "TOTAL_SAMPLE_MUST_BE_GREATER_THAN_0"
        );
      }

      const existedUser = await planningRepository.getModelById({ model: User, where: { userId } });
      if (!existedUser) {
        throw AppError.BadRequest("user not found", "USER_NOT_FOUND");
      }

      //create session
      const session = await qcRepository.createNewSession(
        {
          processType,
          planningId: processType === "paper" ? planningId! : (null as any),
          planningBoxId: processType === "box" ? planningBoxId! : (null as any),
          totalSample,
          checkedBy: existedUser.fullName,
          status: "checking",
        },
        transaction
      );

      return { message: "create QC Session successfully", data: session };
    } catch (error) {
      console.error("create QC session failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateSession: async ({
    qcSessionId,
    status,
    totalSample,
  }: {
    qcSessionId: number;
    status?: statusQcSession;
    totalSample?: number;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const session = await qcRepository.findByPk(QcSession, qcSessionId, transaction);
        if (!session) {
          throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
        }

        if (totalSample !== undefined && totalSample < 1) {
          throw AppError.BadRequest("totalSample must be greater than 0");
        }

        await session.update({
          status: status ?? session.status,
          totalSample: totalSample ?? session.totalSample,
        });

        return { message: `update QC Session id=${qcSessionId} successfully`, data: session };
      });
    } catch (error) {
      console.error("update QC session failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
