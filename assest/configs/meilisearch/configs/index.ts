import { meiliClient } from "../../connect/melisearch.config";
import {
  customersSettings,
  dashboardSettings,
  employeesSettings,
  inboundSettings,
  inventorySettings,
  ordersSettings,
  outboundSettings,
  planningBoxSettings,
  planningPaperSettings,
  productsSettings,
  reportBoxSettings,
  reportPaperSettings,
} from "./meilisearch.config";

export const setupMeilisearch = async () => {
  await Promise.all([
    meiliClient.index("customers").updateSettings(customersSettings),
    meiliClient.index("products").updateSettings(productsSettings),
    meiliClient.index("employees").updateSettings(employeesSettings),
    meiliClient.index("orders").updateSettings(ordersSettings),
    meiliClient.index("planningPapers").updateSettings(planningPaperSettings),
    meiliClient.index("planningBoxes").updateSettings(planningBoxSettings),
    meiliClient.index("outbounds").updateSettings(outboundSettings),
    meiliClient.index("inventories").updateSettings(inventorySettings),
    meiliClient.index("inboundHistories").updateSettings(inboundSettings),
    meiliClient.index("reportPapers").updateSettings(reportPaperSettings),
    meiliClient.index("reportBoxes").updateSettings(reportBoxSettings),
    meiliClient.index("dashboard").updateSettings(dashboardSettings),
  ]);
};
