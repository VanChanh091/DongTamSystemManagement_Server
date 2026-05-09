import { meiliClient } from "../../connect/meilisearch.connect";
import {
  customersSettings,
  dashboardSettings,
  deliveryRequestSettings,
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
    meiliClient.index("orders").updateSettings(ordersSettings),
    meiliClient.index("employees").updateSettings(employeesSettings),
    meiliClient.index("planningPapers").updateSettings(planningPaperSettings),
    meiliClient.index("planningBoxes").updateSettings(planningBoxSettings),
    meiliClient.index("inboundHistories").updateSettings(inboundSettings),
    meiliClient.index("outbounds").updateSettings(outboundSettings),
    meiliClient.index("inventories").updateSettings(inventorySettings),
    meiliClient.index("reportPapers").updateSettings(reportPaperSettings),
    meiliClient.index("reportBoxes").updateSettings(reportBoxSettings),
    meiliClient.index("deliveryRequest").updateSettings(deliveryRequestSettings),
    meiliClient.index("dashboard").updateSettings(dashboardSettings),
  ]);
};
