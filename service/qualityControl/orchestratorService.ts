import { processTypeQC } from "../../models/qualityControl/qcCriteria";
import { qcChecklistData } from "../../models/qualityControl/qcSampleResult";
import { AppError } from "../../utils/appError";
import { qcSampleService } from "./qcSampleService";
import { qcSessionService } from "./qcSessionService";

export const qcSubmitService = {
  submitQC: async ({
    user,
    processType,
    planningId,
    planningBoxId,
    totalSample = 3,
    samples,
  }: {
    user: any;
    processType: processTypeQC;
    planningId?: number;
    planningBoxId?: number;
    totalSample?: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
  }) => {
    try {
      // tạo session
      const { data: session } = await qcSessionService.createNewSession({
        processType,
        planningId,
        planningBoxId,
        totalSample,
        user,
      });

      // tạo / upsert checklist
      const sampleResults = await qcSampleService.createNewResult({
        qcSessionId: session.qcSessionId,
        samples,
      });

      return {
        message: "submit QC dialog successfully",
        data: sampleResults,
      };
    } catch (error) {
      console.error("submit QC dialog failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
