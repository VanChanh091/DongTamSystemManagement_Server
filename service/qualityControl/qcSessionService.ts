import { processTypeQC } from "../../models/qualityControl/qcCriteria";
import { QcSession, statusQcSession } from "../../models/qualityControl/qcSession";
import { User } from "../../models/user/user";
import { AppError } from "../../utils/appError";

export const qcSessionService = {
  getAllQcSession: async () => {
    try {
      const allSession = await QcSession.findAll({
        order: [["createdAt", "DESC"]],
      });

      return { message: `get Qc allCriteria successfully`, data: allSession };
    } catch (error) {
      console.error("get all QC session failed:", error);
      throw AppError.ServerError();
    }
  },

  // getQcSessionById: async (isPaper: boolean) => {
  //   try {
  //     const whereCondition = isPaper ? planningId : planningBoxId;

  //     const allSession = await QcSession.findOne({
  //       where: {},
  //     });

  //     return { message: `get Qc allCriteria successfully`, data: allSession };
  //   } catch (error) {
  //     console.error("get all QC session failed:", error);
  //     throw AppError.ServerError();
  //   }
  // },

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
    user,
  }: {
    processType: processTypeQC;
    planningId?: number;
    planningBoxId?: number;
    totalSample?: number;
    user: any;
  }) => {
    const transaction = await QcSession.sequelize?.transaction();

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

      // check session đã tồn tại chưa
      const existed = await QcSession.findOne({
        where:
          processType === "paper" ? { processType, planningId } : { processType, planningBoxId },
        transaction,
      });
      if (existed) {
        throw AppError.NotFound("QcSession is existed", "QC_SESSION_IS_EXISTED");
      }

      if (totalSample !== undefined && totalSample < 1) {
        throw AppError.BadRequest(
          "totalSample must be greater than 0",
          "TOTAL_SAMPLE_MUST_BE_GREATER_THAN_0"
        );
      }

      const existedUser = await User.findOne({ where: { userId } });
      if (!existedUser) {
        throw AppError.BadRequest("user not found", "USER_NOT_FOUND");
      }

      const session = await QcSession.create(
        {
          processType,
          planningId: processType === "paper" ? planningId! : (null as any),
          planningBoxId: processType === "box" ? planningBoxId! : (null as any),
          totalSample,
          checkedBy: existedUser.fullName,
          status: "checking",
        },
        { transaction }
      );

      await transaction?.commit();

      return { message: "create QC Session successfully", data: session };
    } catch (error) {
      await transaction?.rollback();
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
    const transaction = await QcSession.sequelize?.transaction();

    try {
      const session = await QcSession.findByPk(qcSessionId);
      if (!session) {
        throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
      }

      // đã chốt thì không cho sửa
      // if (session.status !== "checking") {
      //   throw AppError.BadRequest("QC session has been finalized");
      // }

      if (totalSample !== undefined && totalSample < 1) {
        throw AppError.BadRequest("totalSample must be greater than 0");
      }

      await session.update({
        status: status ?? session.status,
        totalSample: totalSample ?? session.totalSample,
      });

      await transaction?.commit();

      return { message: `update QC Session id=${qcSessionId} successfully`, data: session };
    } catch (error) {
      console.error("update QC session failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
