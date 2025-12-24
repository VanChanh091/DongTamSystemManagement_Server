import { processTypeQC } from "../../models/qualityControl/qcCriteria";
import { qcChecklistData } from "../../models/qualityControl/qcSampleResult";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { inboundService } from "../warehouse/inboundService";
import { qcSampleService } from "./qcSampleService";
import { qcSessionService } from "./qcSessionService";

export const qcSubmitService = {
  submitQC: async ({
    inboundQty,
    processType,
    planningId,
    planningBoxId,
    totalSample = 3,
    samples,
    user,
  }: {
    inboundQty: number;
    processType: processTypeQC;
    planningId?: number;
    planningBoxId?: number;
    totalSample?: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
    user: any;
  }) => {
    try {
      // console.log("submitQC called with:", {
      //   inboundQty,
      //   processType,
      //   planningId,
      //   planningBoxId,
      //   totalSample,
      // });

      return await runInTransaction(async (transaction) => {
        // tạo session
        const { data: session } = await qcSessionService.createNewSession({
          processType,
          planningId,
          planningBoxId,
          totalSample,
          transaction,
          user,
        });

        // tạo / upsert checklist
        const { sessionStatus } = await qcSampleService.createNewResult({
          qcSessionId: session.qcSessionId,
          samples,
          transaction,
        });

        if (sessionStatus === "pass") {
          planningId
            ? await inboundService.inboundQtyPaper({
                planningId,
                inboundQty,
                qcSessionId: session.qcSessionId,
                transaction,
              })
            : await inboundService.inboundQtyBox({
                planningBoxId: planningBoxId!,
                inboundQty,
                qcSessionId: session.qcSessionId,
                transaction,
              });
        }

        return { message: "submit QC dialog successfully" };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
