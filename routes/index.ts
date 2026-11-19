import adminRoutes from "./adminRouter/adminRoutes";
import authRoutes from "./authRouter/authRoutes";
import customerRoutes from "./userRouter/customerRoutes";
import orderRoutes from "./userRouter/orderRoutes";
import planningRoutes from "./productionRouter/planningRoutes";
import productRoutes from "./userRouter/productRoutes";
import usersRoutes from "./userRouter/usersRoutes";
import manufactureRoutes from "./productionRouter/manufactureRoutes";
import reportRoutes from "./productionRouter/reportRoutes";
import syntheticRoutes from "./userRouter/syntheticRoutes";
import employeeRoutes from "./userRouter/employeeRoutes";
import warehouseRoutes from "./userRouter/warehouseRoutes";
import qcRoutes from "./productionRouter/qualityControlRoutes";
import deliveryRoutes from "./userRouter/deliveryRoutes";
import scrapRoutes from "./productionRouter/scrapReportRoutes";
import badgeRoutes from "./badgeRouter/badgeRoutes";
import systemRoutes from "./systemRouter/systemRoutes";
import meilisearchRoutes from "./meilisearchRouter/meilisearchRoutes";
import notificationRoutes from "./notification/notificationRoutes";
import debtManagementRoutes from "./userRouter/debtManagementRoutes";

export {
  customerRoutes,
  orderRoutes,
  planningRoutes,
  productRoutes,
  adminRoutes,
  authRoutes,
  usersRoutes,
  manufactureRoutes,
  reportRoutes,
  syntheticRoutes,
  employeeRoutes,
  warehouseRoutes,
  qcRoutes,
  deliveryRoutes,
  badgeRoutes,
  scrapRoutes,
  debtManagementRoutes,

  //system
  systemRoutes,

  //meilisearch
  meilisearchRoutes,

  //notification
  notificationRoutes,
};
