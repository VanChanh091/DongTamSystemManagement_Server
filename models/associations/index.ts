import customerOrderAssociations from "./customerOrder.association";
import deliveryOthersAssociations from "./deliveryOthers.association";
import notificationAssociations from "./notification.association";
import planningAssociations from "./planning.association";
import qcAssociations from "./qc.association";
import warehouseInventoryAssociations from "./warehouse.association";

export function setupAssociations(models: any) {
  qcAssociations(models);
  planningAssociations(models);
  notificationAssociations(models);
  customerOrderAssociations(models);
  deliveryOthersAssociations(models);
  warehouseInventoryAssociations(models);
}
