"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
const admin_association_1 = __importDefault(require("./admin.association"));
const customerOrder_association_1 = __importDefault(require("./customerOrder.association"));
const deliveryOthers_association_1 = __importDefault(require("./deliveryOthers.association"));
const notification_association_1 = __importDefault(require("./notification.association"));
const planning_association_1 = __importDefault(require("./planning.association"));
const qc_association_1 = __importDefault(require("./qc.association"));
const warehouse_association_1 = __importDefault(require("./warehouse.association"));
function setupAssociations(models) {
    (0, qc_association_1.default)(models);
    (0, planning_association_1.default)(models);
    (0, notification_association_1.default)(models);
    (0, customerOrder_association_1.default)(models);
    (0, deliveryOthers_association_1.default)(models);
    (0, warehouse_association_1.default)(models);
    (0, admin_association_1.default)(models);
}
//# sourceMappingURL=index.js.map