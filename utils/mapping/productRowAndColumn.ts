import ExcelJS from "exceljs";
import { Product } from "../../models/product/product";

export const productColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã Sản Phẩm", key: "productId" },
  { header: "Loại Sản Phẩm", key: "typeProduct" },
  { header: "Tên Sản Phẩm", key: "productName" },
  { header: "Mã Khuôn", key: "maKhuon" },
  { header: "Hình Ảnh", key: "productImage" },
];

export const mappingProductRow = (item: Product, index: number) => {
  return {
    index: index + 1,
    productId: item.productId,
    typeProduct: item.typeProduct,
    productName: item.productName,
    maKhuon: item.maKhuon,
    productImage: item.productImage,
  };
};
