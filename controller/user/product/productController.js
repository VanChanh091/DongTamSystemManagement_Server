import Product from "../../../models/product/product.js";
import cloudinary from "../../../configs/connectCloudinary.js";
import { Op, Sequelize } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId.js";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../../../utils/image/converToWebp.js";
import { exportExcelResponse } from "../../../utils/helper/excelExporter.js";
import { filterDataFromCache } from "../../../utils/helper/modelHelper/orderHelpers.js";
import { mappingProductRow, productColumns } from "../../../utils/mapping/productRowAndColumn.js";
import { CacheManager } from "../../../utils/helper/cacheManager.js";
import redisCache from "../../../configs/redisCache.js";

//get all product
export const getAllProduct = async (req, res) => {
  const { page = 1, pageSize = 20, noPaging = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const noPagingMode = noPaging === "true";

  const { product } = CacheManager.keys;
  const cacheKey = noPaging === "true" ? product.all : product.page(currentPage);

  try {
    const { isChanged } = await CacheManager.check(Product, "product");

    if (isChanged) {
      await CacheManager.clearProduct();
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Product from Redis");
        const parsed = JSON.parse(cachedData);
        return res.status(200).json({ ...parsed, message: "Get all products from cache" });
      }
    }

    let data, totalPages;
    const totalProducts = await Product.count();

    if (noPagingMode) {
      totalPages = 1;
      data = await Product.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
    } else {
      totalPages = Math.ceil(totalProducts / currentPageSize);
      data = await Product.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        offset: (currentPage - 1) * currentPageSize,
        limit: currentPageSize,
        order: [
          //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
          [Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
        ],
      });
    }

    const responseData = {
      message: "get all products successfully",
      data,
      totalProducts,
      totalPages,
      currentPage: noPagingMode ? 1 : currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("get all product failed:", error);
    res.status(500).json({ message: "get all product failed", error });
  }
};

//get product by fied
export const getProductByField = async (req, res) => {
  const { field, keyword, page, pageSize } = req.query;

  const fieldMap = {
    productId: (product) => product.productId,
    productName: (product) => product?.productName,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  const { product } = CacheManager.keys;

  try {
    const result = await filterDataFromCache({
      model: Product,
      cacheKey: product.search,
      keyword: keyword,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
      totalKey: "totalProducts",
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get product by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//add product
export const addProduct = async (req, res) => {
  const { prefix = "CUSTOM", product } = req.body;
  const parsedProduct = typeof product === "string" ? JSON.parse(product) : product;

  const transaction = await Product.sequelize.transaction();

  try {
    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();

    // 🔍 Check prefix đã tồn tại chưa
    const prefixExists = await Product.findOne({
      where: {
        productId: {
          [Op.like]: `${sanitizedPrefix}%`,
        },
      },
      transaction,
    });

    if (prefixExists) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
      });
    }

    const products = await Product.findAll({
      attributes: ["productId"],
      transaction,
    });

    //custom productId
    const allProductIds = products.map((p) => p.productId);
    const newProductId = generateNextId(allProductIds, sanitizedPrefix, 4);

    if (req.file) {
      const webpBuffer = await convertToWebp(req.file.buffer);
      const result = await uploadImageToCloudinary(
        webpBuffer,
        "products",
        newProductId.replace(/\s+/g, "_")
      );
      parsedProduct.productImage = result.secure_url;
    }

    const newProduct = await Product.create(
      {
        productId: newProductId,
        ...parsedProduct,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("add product failed:", err);
    return res.status(500).json({ message: "add product failed", err });
  }
};

//update product
export const updateProduct = async (req, res) => {
  const { id } = req.query;
  const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  try {
    const existingProduct = await Product.findByPk(id);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Nếu có ảnh mới được upload
    if (req.file) {
      if (req.file) {
        const webpBuffer = await convertToWebp(req.file.buffer);
        const result = await uploadImageToCloudinary(webpBuffer, "products", id);
        productData.productImage = result.secure_url;
      }
    }

    await existingProduct.update(productData);

    return res.status(200).json({
      message: "Product updated successfully",
      data: existingProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: error.message });
  }
};

//delete product
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const imageName = product.productImage;

    await product.destroy();

    if (imageName && imageName.includes("cloudinary.com")) {
      const publicId = getCloudinaryPublicId(imageName);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Delete product failed", err });
  }
};

//export excel
export const exportExcelProduct = async (req, res) => {
  const { typeProduct, all = false } = req.body;

  try {
    let whereCondition = {};

    if (all === "true") {
      // xuất toàn bộ -> để whereCondition = {}
    } else if (typeProduct) {
      whereCondition.typeProduct = typeProduct;
    }

    const data = await Product.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
      ],
    });

    await exportExcelResponse(res, {
      data: data,
      sheetName: "Danh sách sản phẩm",
      fileName: "product",
      columns: productColumns,
      rows: mappingProductRow,
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};
