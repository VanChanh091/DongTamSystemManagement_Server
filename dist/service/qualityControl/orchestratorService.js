"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcSubmitService = void 0;
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const inboundService_1 = require("../warehouse/inboundService");
const qcSampleService_1 = require("./qcSampleService");
const qcSessionService_1 = require("./qcSessionService");
exports.qcSubmitService = {
    submitQC: async ({ inboundQty, processType, planningId, planningBoxId, totalSample = 3, samples, user, }) => {
        try {
            // console.log("submitQC called with:", {
            //   inboundQty,
            //   processType,
            //   planningId,
            //   planningBoxId,
            //   totalSample,
            // });
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // tạo session
                const { data: session } = await qcSessionService_1.qcSessionService.createNewSession({
                    processType,
                    planningId,
                    planningBoxId,
                    totalSample,
                    transaction,
                    user,
                });
                // tạo / upsert checklist
                const { sessionStatus } = await qcSampleService_1.qcSampleService.createNewResult({
                    qcSessionId: session.qcSessionId,
                    samples,
                    transaction,
                });
                if (sessionStatus === "pass") {
                    planningId
                        ? await inboundService_1.inboundService.inboundQtyPaper({
                            planningId,
                            inboundQty,
                            qcSessionId: session.qcSessionId,
                            transaction,
                        })
                        : await inboundService_1.inboundService.inboundQtyBox({
                            planningBoxId: planningBoxId,
                            inboundQty,
                            qcSessionId: session.qcSessionId,
                            transaction,
                        });
                }
                return { message: "submit QC dialog successfully" };
            });
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=orchestratorService.js.map