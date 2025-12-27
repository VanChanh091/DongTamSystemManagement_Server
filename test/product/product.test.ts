import cloudinary from "../../assest/configs/connectCloudinary";
import redisCache from "../../assest/configs/redisCache";
import { Product } from "../../models/product/product";
import { productRepository } from "../../repository/productRepository";
import { productService } from "../../service/productService";
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { generateNextId } from "../../utils/helper/generateNextId";
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
      })
    ).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 3. createProduct
  // ============================================================================
  test("createProduct - tạo sp không có ảnh", async () => {
    (productRepository.checkPrefixProduct as jest.Mock).mockResolvedValue(false);
    (productRepository.findAllById as jest.Mock).mockResolvedValue([{ productId: "ABC0001" }]);
    (generateNextId as jest.Mock).mockReturnValue("ABC0002");

    (productRepository.createProduct as jest.Mock).mockResolvedValue({ productId: "ABC0002" });

    const req: any = { file: null };

    const result = await productService.createProduct(req, {
      prefix: "ABC",
      product: { productName: "Name" },
    });

    expect(result.data.productId).toBe("ABC0002");
    expect(commit).toHaveBeenCalled();
  });

  test("createProduct - có upload ảnh", async () => {
    (productRepository.checkPrefixProduct as jest.Mock).mockResolvedValue(false);
    (productRepository.findAllById as jest.Mock).mockResolvedValue([{ productId: "PRD0001" }]);
    (generateNextId as jest.Mock).mockReturnValue("PRD0002");

    (convertToWebp as jest.Mock).mockResolvedValue("webp-buffer");
    (uploadImageToCloudinary as jest.Mock).mockResolvedValue({ secure_url: "cloud.com/img.webp" });

    (productRepository.createProduct as jest.Mock).mockResolvedValue({
      productId: "PRD0002",
      productImage: "cloud.com/img.webp",
    });

    const req: any = {
      file: { buffer: Buffer.from("img") },
    };

    const result = await productService.createProduct(req, {
      prefix: "PRD",
      product: { productName: "Test" },
    });

    expect(result.data.productImage).toBe("cloud.com/img.webp");
    expect(commit).toHaveBeenCalled();
  });

  test("createProduct - prefix trùng → Conflict", async () => {
    (productRepository.checkPrefixProduct as jest.Mock).mockResolvedValue(true);

    const req: any = { file: null };

    await expect(
      productService.createProduct(req, {
        prefix: "PRD",
        product: {},
      })
    ).rejects.toThrow(AppError);
  });

  test("createProduct - lỗi DB → rollback", async () => {
    (productRepository.checkPrefixProduct as jest.Mock).mockResolvedValue(false);
    (productRepository.findAllById as jest.Mock).mockResolvedValue([{ productId: "AA0001" }]);
    (generateNextId as jest.Mock).mockReturnValue("AA0002");

    (productRepository.createProduct as jest.Mock).mockRejectedValue(new Error("DB failed"));

    const req: any = { file: null };

    await expect(productService.createProduct(req, { prefix: "AA", product: {} })).rejects.toThrow(
      AppError
    );

    expect(rollback).toHaveBeenCalled();
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
  // 5. deletedProduct
  // ============================================================================
  test("deletedProduct - xoá thành công không ảnh", async () => {
    (productRepository.findProductByPk as jest.Mock).mockResolvedValue({
      productId: "DEL1",
      productImage: null,
      destroy: jest.fn(),
    });

    const result = await productService.deletedProduct("DEL1");
    expect(result.message).toBe("Product deleted successfully");
    expect(commit).toHaveBeenCalled();
  });

  test("deletedProduct - có ảnh Cloudinary", async () => {
    (getCloudinaryPublicId as jest.Mock).mockReturnValue("public-id");

    (productRepository.findProductByPk as jest.Mock).mockResolvedValue({
      productId: "DEL2",
      productImage: "cloudinary.com/123",
      destroy: jest.fn(),
    });

    await productService.deletedProduct("DEL2");

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("public-id");
  });

  test("deletedProduct - không tồn tại", async () => {
    (productRepository.findProductByPk as jest.Mock).mockResolvedValue(null);

    await expect(productService.deletedProduct("404")).rejects.toThrow(AppError);
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
