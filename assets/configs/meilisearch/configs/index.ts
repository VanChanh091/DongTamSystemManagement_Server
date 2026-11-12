import { meiliClient } from "../../connect/meilisearch.connect";
import {
  customersSettings,
  dashboardSettings,
  deliveryRequestSettings,
  employeesSettings,
  inboundSettings,
  inspectionBoxSettings,
  inspectionPaperSettings,
  inventorySettings,
  invWipSheetSettings,
  ordersSettings,
  outboundSettings,
  planningBoxSettings,
  planningPaperSettings,
  productsSettings,
  reportBoxSettings,
  reportPaperSettings,
  scrapReportSettings,
} from "./meilisearch.config";

export const setupMeilisearch = async () => {
  await Promise.all([
    meiliClient.index("customers").updateSettings(customersSettings),
    meiliClient.index("products").updateSettings(productsSettings),
    meiliClient.index("orders").updateSettings(ordersSettings),
    meiliClient.index("employees").updateSettings(employeesSettings),

    //planning
    meiliClient.index("planningPapers").updateSettings(planningPaperSettings),
    meiliClient.index("planningBoxes").updateSettings(planningBoxSettings),
    meiliClient.index("scrapReports").updateSettings(scrapReportSettings),

    //inbound & outbound
    meiliClient.index("inboundHistories").updateSettings(inboundSettings),
    meiliClient.index("outbounds").updateSettings(outboundSettings),

    //inventory
    meiliClient.index("inventories").updateSettings(inventorySettings),
    meiliClient.index("invWipSheets").updateSettings(invWipSheetSettings),

    //report
    meiliClient.index("reportPapers").updateSettings(reportPaperSettings),
    meiliClient.index("reportBoxes").updateSettings(reportBoxSettings),

    //delivery
    meiliClient.index("deliveryRequest").updateSettings(deliveryRequestSettings),

    //inspection
    meiliClient.index("inspection_papers").updateSettings(inspectionPaperSettings),
    meiliClient.index("inspection_boxes").updateSettings(inspectionBoxSettings),
    meiliClient.index("dashboard").updateSettings(dashboardSettings),
  ]);
};
