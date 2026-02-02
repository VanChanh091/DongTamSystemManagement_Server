"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connectCloudinary_1 = __importDefault(require("../../assest/configs/connectCloudinary"));
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const product_1 = require("../../models/product/product");
const productRepository_1 = require("../../repository/productRepository");
const productService_1 = require("../../service/productService");
const appError_1 = require("../../utils/appError");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const orderHelpers_1 = require("../../utils/helper/modelHelper/orderHelpers");
const converToWebp_1 = require("../../utils/image/converToWebp");
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
connectCloudinary_1.default.uploader = { destroy: jest.fn() };
const commit = jest.fn();
const rollback = jest.fn();
product_1.Product.sequelize = {
    transaction: jest.fn().mockResolvedValue({ commit, rollback }),
};
// helper for mocking cache check
cacheManager_1.CacheManager.check = jest.fn();
cacheManager_1.CacheManager.clearProduct = jest.fn();
// mock redis
redisCache_1.default.get = jest.fn();
redisCache_1.default.set = jest.fn();
describe("productService", () => {
    beforeEach(() => jest.clearAllMocks());
    // ============================================================================
    // 1. getAllProducts
    // ============================================================================
    test("getAllProducts - lấy từ cache", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: false });
        redisCache_1.default.get.mockResolvedValue(JSON.stringify({ data: ["P001"] }));
        const result = await productService_1.productService.getAllProducts({});
        expect(result.data[0]).toBe("P001");
    });
    test("getAllProducts - cache đổi → lấy DB", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        cacheManager_1.CacheManager.clearProduct = jest.fn().mockResolvedValue(true);
        productRepository_1.productRepository.productCount.mockResolvedValue(1);
        productRepository_1.productRepository.findProductByPage.mockResolvedValue(["SP01"]);
        const result = await productService_1.productService.getAllProducts({});
        expect(result.data[0]).toBe("SP01");
        expect(redisCache_1.default.set).toHaveBeenCalled();
    });
    test("getAllProducts - DB error → throw ServerError", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        productRepository_1.productRepository.productCount.mockRejectedValue(new Error("DB failed"));
        await expect(productService_1.productService.getAllProducts({})).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 2. getProductByField
    // ============================================================================
    test("getProductByField - valid field", async () => {
        orderHelpers_1.filterDataFromCache.mockResolvedValue({ data: ["ABC"] });
        const result = await productService_1.productService.getProductByField({
            field: "productName",
            keyword: "test",
            page: 1,
            pageSize: 20,
        });
        expect(result.data[0]).toBe("ABC");
    });
    test("getProductByField - invalid field → throw BadRequest", async () => {
        await expect(productService_1.productService.getProductByField({
            field: "zzz",
            keyword: "x",
            page: 1,
            pageSize: 20,
        })).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 4. updatedProduct
    // ============================================================================
    test("updatedProduct - update thành công", async () => {
        productRepository_1.productRepository.findProductByPk.mockResolvedValue({ productId: "X1" });
        productRepository_1.productRepository.updateProduct.mockResolvedValue({ ok: true });
        const req = { file: null };
        const result = await productService_1.productService.updatedProduct(req, "X1", { productName: "New" });
        expect(result.data.ok).toBe(true);
        expect(commit).toHaveBeenCalled();
    });
    test("updatedProduct - product không tồn tại", async () => {
        productRepository_1.productRepository.findProductByPk.mockResolvedValue(null);
        const req = { file: null };
        await expect(productService_1.productService.updatedProduct(req, "ZZZ", {})).rejects.toThrow(appError_1.AppError);
    });
    test("updatedProduct - upload ảnh mới", async () => {
        productRepository_1.productRepository.findProductByPk.mockResolvedValue({ productId: "P3" });
        converToWebp_1.convertToWebp.mockResolvedValue("w-buf");
        converToWebp_1.uploadImageToCloudinary.mockResolvedValue({ secure_url: "cloud.com/new.webp" });
        productRepository_1.productRepository.updateProduct.mockResolvedValue({
            productImage: "cloud.com/new.webp",
        });
        const req = { file: { buffer: Buffer.from("new-img") } };
        const result = await productService_1.productService.updatedProduct(req, "P3", {});
        expect(result.data.productImage).toBe("cloud.com/new.webp");
    });
    // ============================================================================
    // 6. exportExcelProducts
    // ============================================================================
    test("exportExcelProducts - export thành công", async () => {
        productRepository_1.productRepository.exportExcelProducts.mockResolvedValue([{ id: 1 }]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await productService_1.productService.exportExcelProducts(res, { typeProduct: "BOX", all: false });
        expect(excelExporter_1.exportExcelResponse).toHaveBeenCalled();
    });
});
//# sourceMappingURL=product.test.js.map