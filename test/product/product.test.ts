import cloudinary from "../../assest/configs/connectCloudinary";
import redisCache from "../../assest/configs/redisCache";
import { Product } from "../../models/product/product";
import { productRepository } from "../../repository/productRepository";
import { productService } from "../../service/productService";
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { filterDataFromCache } from "../../utils/helper/modelHelper/orderHelpers";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../../utils/image/converToWebp";

jest.mock("../../repository/productRepository");
jest.mock("../../configs/redisCache", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock("../../utils/helper/cacheManager");
jest.mock("../../utils/helper/modelHelper/orderHelpers");
jest.mock("../../utils/helper/generateNextId");
jest.mock("../../utils/image/converToWebp");
jest.mock("../../utils/helper/excelExporter");

cloudinary.uploader = { destroy: jest.fn() } as any;

const commit = jest.fn();
const rollback = jest.fn();

(Product.sequelize as any) = {
  transaction: jest.fn().mockResolvedValue({ commit, rollback }),
} as any;

// helper for mocking cache check
(CacheManager.check as jest.Mock) = jest.fn();
(CacheManager.clearProduct as jest.Mock) = jest.fn();

// mock redis
(redisCache.get as jest.Mock) = jest.fn();
(redisCache.set as jest.Mock) = jest.fn();

describe("productService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ============================================================================
  // 1. getAllProducts
  // ============================================================================
  test("getAllProducts - lấy từ cache", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: false });
    redisCache.get.mockResolvedValue(JSON.stringify({ data: ["P001"] }));

    const result = await productService.getAllProducts({});
    expect(result.data[0]).toBe("P001");
  });

  test("getAllProducts - cache đổi → lấy DB", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });
    CacheManager.clearProduct = jest.fn().mockResolvedValue(true);

    (productRepository.productCount as jest.Mock).mockResolvedValue(1);
    (productRepository.findProductByPage as jest.Mock).mockResolvedValue(["SP01"]);

    const result = await productService.getAllProducts({});
    expect(result.data[0]).toBe("SP01");
    expect(redisCache.set).toHaveBeenCalled();
  });

  test("getAllProducts - DB error → throw ServerError", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });
    (productRepository.productCount as jest.Mock).mockRejectedValue(new Error("DB failed"));

    await expect(productService.getAllProducts({})).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 2. getProductByField
  // ============================================================================
  test("getProductByField - valid field", async () => {
    (filterDataFromCache as jest.Mock).mockResolvedValue({ data: ["ABC"] });

    const result = await productService.getProductByField({
      field: "productName",
      keyword: "test",
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0]).toBe("ABC");
  });

  test("getProductByField - invalid field → throw BadRequest", async () => {
    await expect(
      productService.getProductByField({
        field: "zzz",
        keyword: "x",
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 4. updatedProduct
  // ============================================================================
  test("updatedProduct - update thành công", async () => {
    (productRepository.findProductByPk as jest.Mock).mockResolvedValue({ productId: "X1" });
    (productRepository.updateProduct as jest.Mock).mockResolvedValue({ ok: true });

    const req: any = { file: null };

    const result = await productService.updatedProduct(req, "X1", { productName: "New" });
    expect(result.data.ok).toBe(true);
    expect(commit).toHaveBeenCalled();
  });

  test("updatedProduct - product không tồn tại", async () => {
    (productRepository.findProductByPk as jest.Mock).mockResolvedValue(null);

    const req: any = { file: null };

    await expect(productService.updatedProduct(req, "ZZZ", {})).rejects.toThrow(AppError);
  });

  test("updatedProduct - upload ảnh mới", async () => {
    (productRepository.findProductByPk as jest.Mock).mockResolvedValue({ productId: "P3" });

    (convertToWebp as jest.Mock).mockResolvedValue("w-buf");
    (uploadImageToCloudinary as jest.Mock).mockResolvedValue({ secure_url: "cloud.com/new.webp" });

    (productRepository.updateProduct as jest.Mock).mockResolvedValue({
      productImage: "cloud.com/new.webp",
    });

    const req: any = { file: { buffer: Buffer.from("new-img") } };

    const result = await productService.updatedProduct(req, "P3", {});
    expect(result.data.productImage).toBe("cloud.com/new.webp");
  });

  // ============================================================================
  // 6. exportExcelProducts
  // ============================================================================
  test("exportExcelProducts - export thành công", async () => {
    (productRepository.exportExcelProducts as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    await productService.exportExcelProducts(res, { typeProduct: "BOX", all: false });
    expect(exportExcelResponse).toHaveBeenCalled();
  });
});
