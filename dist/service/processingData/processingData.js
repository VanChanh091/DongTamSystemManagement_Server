"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProductData = exports.parseCustomerData = exports.parseOrderData = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const toTitleCase = (str) => {
    if (!str)
        return "";
    return String(str)
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};
const parseOrderData = (buffer) => {
    const workbook = xlsx_1.default.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx_1.default.utils.sheet_to_json(sheet, { defval: null });
    // console.log(rawData[0]);
    // Nó sẽ xóa \n và trim khoảng trắng để "Số \nĐơn Hàng" thành "Số Đơn Hàng"
    const cleanData = rawData.map((row) => {
        const newRow = {};
        for (let key in row) {
            const cleanKey = key
                .replace(/\r?\n|\r/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            newRow[cleanKey] = row[key];
        }
        return newRow;
    });
    let totalAccept = 0;
    let totalPlanning = 0;
    const result = cleanData.map((row) => {
        // 1. Xử lý VAT (8% -> 8)
        let rawVat = row["VAT"];
        let vatValue = 0;
        if (rawVat !== null && rawVat !== undefined) {
            // Nếu là chuỗi "8%", loại bỏ dấu % rồi parse
            if (typeof rawVat === "string") {
                vatValue = parseFloat(rawVat.replace("%", ""));
            }
            else {
                vatValue = parseFloat(rawVat);
            }
            // CƠ CHẾ TỰ ĐỘNG CHUYỂN ĐỔI:
            // Nếu giá trị nhỏ hơn 1 (ví dụ 0.08), ta nhân với 100 để lấy số nguyên (8)
            if (vatValue > 0 && vatValue < 1) {
                vatValue = vatValue * 100;
            }
        }
        vatValue = Math.round(vatValue);
        // 2. Xử lý QC_box (Chỉ lấy dạng 20x20x10)
        const qcRaw = String(row["QC THÙNG"] || "");
        const qcMatch = qcRaw.match(/\d+x\d+x\d+/i);
        const qcBox = qcMatch ? qcMatch[0] : null;
        // 3. Xử lý Kết cấu (Ví dụ: TC120/BM2A95/TC110)
        const ketCau = String(row["Kết Cấu Đặt Hàng"] || "");
        const parts = ketCau.split("/").map((p) => p.trim());
        let structure = {
            day: parts[0] || null,
            songB: null,
            matB: null,
            songC: null,
            matC: null,
            songE: null,
            matE: null,
        };
        if (parts.length >= 2) {
            const fluteInfo = parts[1];
            const fluteType = fluteInfo.charAt(0).toUpperCase();
            const nextLayer = parts[2] ? parts[2].split(" ")[0] : null;
            if (fluteType === "B") {
                structure.songB = fluteInfo;
                structure.matB = nextLayer;
            }
            else if (fluteType === "C") {
                structure.songC = fluteInfo;
                structure.matC = nextLayer;
            }
            else if (fluteType === "E") {
                structure.songE = fluteInfo;
                structure.matE = nextLayer;
            }
        }
        const formattedDaoXa = toTitleCase(row["Tề Biên"]);
        const formattedDVT = toTitleCase(row["dvt"]);
        const rawDoanhSo = parseFloat(row["Doanh Số"]) || 0;
        const quantityCustomer = parseInt(row["Số Lượng ĐH"]) || 0;
        const totalQtyInbound = parseInt(row["Số Lượng Sản Xuất carton"]) || 0;
        // Áp dụng công thức của bạn
        const diffValue = totalQtyInbound - quantityCustomer;
        const calculatedStatus = diffValue >= 0 ? "planning" : "accept";
        // console.log(
        //   `quantity: ${quantityCustomer} - inbound: ${totalQtyInbound} => diff: ${diffValue} & status: ${calculatedStatus}`,
        // );
        if (calculatedStatus === "accept") {
            totalAccept++;
        }
        else {
            totalPlanning++;
        }
        return {
            orderId: row["Số Đơn Hàng"],
            dayReceiveOrder: row["Ngày nhận đơn"],
            dateRequestShipping: row["Ngày YC Giao"],
            flute: row["Sóng"],
            QC_box: qcBox,
            daoXa: formattedDaoXa,
            // Kết cấu đã bóc tách
            day: structure.day,
            matB: structure.matB,
            matC: structure.matC,
            matE: structure.matE,
            songE: structure.songE,
            songB: structure.songB,
            songC: structure.songC,
            songE2: "",
            vat: vatValue,
            dvt: formattedDVT,
            lengthPaperCustomer: parseFloat(row["Cắt"]),
            lengthPaperManufacture: parseFloat(row["Cắt"]),
            paperSizeCustomer: parseFloat(row["khỗ"]),
            paperSizeManufacture: parseFloat(row["khỗ"]),
            quantityCustomer: parseInt(row["Số Lượng ĐH"]) || 0,
            quantityManufacture: parseInt(row["Số Lượng ĐH"]) || 0,
            numberChild: parseInt(row["Số Con"]) || 1,
            acreage: Math.round(parseFloat(row["Diện Tích"]) || 0),
            price: Math.round(parseFloat(row["Đơn Giá"]) || 0),
            pricePaper: Math.round(parseFloat(row["Gía Tấm"]) || 0),
            totalPrice: Math.round(rawDoanhSo),
            totalPriceVAT: Math.round(rawDoanhSo * (1 + vatValue / 100)),
            volume: 0,
            instructSpecial: row["Hướng dẫn đặc biệt"],
            isBox: !!qcBox,
            status: calculatedStatus,
            rejectReason: "",
            orderIdCustomer: "",
            // Dữ liệu thô để bạn dùng đối chiếu ID trong DB
            _rawCustomerName: row["Mã Khách Hàng"],
            _rawCompanyName: row["Khách Hàng"],
            _rawProductName: row["Tên Sản Phẩm"],
            boxFields: {
            // inMatTruoc:,
            // inMatSau:,
            // chongTham:,
            // canLan:,
            // canMang:,
            // Xa:,
            // catKhe:,
            // be:,
            // maKhuon:,
            // dan_1_Manh:,
            // dan_2_Manh:,
            // dongGhim1Manh:,
            // dongGhim2Manh:,
            // dongGoi:,
            },
            inventoryFields: {
                totalQtyInbound: parseInt(row["Số Lượng Sản Xuất carton"]) || 0,
                totalQtyOutbound: parseInt(row["Số lượng Giao hàng"]) || 0,
                qtyInventory: parseInt(row["Số lượng tồn"]) || 0,
                valueInventory: parseInt(row["Giá trị tồn"]) || 0,
            },
        };
    });
    // console.log(`Accept: ${totalAccept}, Planning: ${totalPlanning}`);
    return result;
};
exports.parseOrderData = parseOrderData;
const parseCustomerData = (buffer) => {
    const workbook = xlsx_1.default.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx_1.default.utils.sheet_to_json(sheet, { defval: null });
    console.log(rawData[0]);
    return rawData.map((row, index) => {
        return {
            customerId: row["Mã Khách Hàng"],
            customerName: row["Tên Khách Hàng"],
            companyName: row["Tên Công Ty"],
            companyAddress: row["Địa Chỉ Công Ty"],
            shippingAddress: row["Địa Chỉ Giao Hàng"],
            distance: row["Khoảng Cách"],
            mst: row["MST"],
            phone: row["Số Điện Thoại"],
            contactPerson: row["Người Liên Hệ"],
            dayCreated: row["Ngày Tạo"],
            rateCustomer: row["Đánh Giá"],
            customerSource: "",
            cskh: row["CSKH"],
            customerSeq: index + 1,
            payments: {
                debtCurrent: row["Công Nợ Hiện Tại"],
                debtLimit: row["Hạn Mức Công Nợ"],
                timePayment: row["Hạn Thanh Toán"],
                paymentType: "monthly",
                closingDate: 1,
            },
        };
    });
};
exports.parseCustomerData = parseCustomerData;
const parseProductData = (buffer) => {
    const workbook = xlsx_1.default.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx_1.default.utils.sheet_to_json(sheet, { defval: null });
    console.log(rawData[0]);
    return rawData.map((row, index) => {
        return {
            productId: row["Mã Sản Phẩm"],
            typeProduct: row["Loại Sản Phẩm"],
            productName: row["Tên Sản Phẩm"],
            maKhuon: row["Mã Khuôn"],
            productImage: row["Hình Ảnh"],
            productSeq: index + 1,
        };
    });
};
exports.parseProductData = parseProductData;
//# sourceMappingURL=processingData.js.map