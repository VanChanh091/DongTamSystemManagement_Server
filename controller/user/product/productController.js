import Redis from "ioredis";
import Product from "../../../models/product/product.js";
import { Op, fn, col, where, Sequelize } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId.js";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../../../utils/image/converToWebp.js";
import cloudinary from "../../../configs/connectCloudinary.js";
import { filterProductsFromCache } from "../../../utils/helper/orderHelpers.js";

const redisCache = new Redis();

//get all product
export const getAllProduct = async (req, res) => {
  const { page = 1, pageSize = 20, refresh = false, noPaging = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const noPagingMode = noPaging === "true";

  const cacheKey = noPaging === "true" ? "product:all" : `product:all:page:${currentPage}`;

  try {
    if (refresh === "true") {
      if (noPaging === "true") {
        await redisCache.del(cacheKey);
      } else {
        const keys = await redisCache.keys("product:all:page:*");
        if (keys.length > 0) {
          await redisCache.del(...keys);
        }
      }
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Product from Redis");
      const parsed = JSON.parse(cachedData);
      return res.status(200).json({ ...parsed, message: "Get all products from cache" });
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
          [Sequelize.literal(`CAST(RIGHT(\`Product\`.\`productId\`, 4) AS UNSIGNED)`), "ASC"],
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

//get product by id
export const getProductById = async (req, res) => {
  const { productId, page, pageSize } = req.query;

  try {
    const result = await filterProductsFromCache({
      keyword: productId,
      getFieldValue: (product) => product.productId,
      page,
      pageSize,
      message: "get all productId from cache",
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to get product by productId:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//get product by name
export const getProductByName = async (req, res) => {
  const { productName, page, pageSize } = req.query;

  try {
    const result = await filterProductsFromCache({
      keyword: productName,
      getFieldValue: (product) => product?.productName,
      page,
      pageSize,
      message: "get all productName from cache",
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to get product by productName:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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
    await redisCache.del("products:all");

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
    await redisCache.del("products:all");

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
    await redisCache.del("products:all");

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
