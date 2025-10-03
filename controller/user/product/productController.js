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
import { sequelize } from "../../../configs/connectDB.js";

const redisCache = new Redis();

const cacheRedis = async (colData, params) => {
  const cacheKey = "products:all";
  const cachedData = await redisCache.get(cacheKey);

  if (cachedData) {
    const parsedData = JSON.parse(cachedData);

    const product = parsedData.filter((item) =>
      item[colData]?.toLowerCase().includes(params.toLowerCase())
    );

    if (product.length > 0) {
      return product;
    }
  }

  return null;
};

//get all product
export const getAllProduct = async (req, res) => {
  const { refresh = false } = req.query;
  try {
    const cacheKey = "products:all";

    if (refresh == "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Data Product from Redis");
      return res.status(200).json({
        message: "Get all products from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Product.findAll({
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal(`CAST(RIGHT(\`Product\`.\`productId\`, 4) AS UNSIGNED)`), "ASC"],
      ],
    });

    await redisCache.del(cacheKey);
    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    return res.status(200).json({ message: "Get all orders successfully", data });
  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({ error: error.message });
  }
};

//get product by id
export const getProductById = async (req, res) => {
  const { id } = req.query;

  try {
    const cachedResult = await cacheRedis("productId", id);

    if (cachedResult) {
      console.log("✅ Get product from cache");
      return res.status(200).json({
        message: "Get product from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const product = await Product.findAll({
      where: where(fn("LOWER", col("productId")), {
        [Op.like]: `%${id.toUpperCase()}%`,
      }),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(201).json({ message: "Get product successfully", data: product });
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};

//get product by name
export const getProductByName = async (req, res) => {
  const { name } = req.query;

  try {
    const cachedResult = await cacheRedis("productName", name);

    if (cachedResult) {
      console.log("✅ Get product from cache");
      return res.status(200).json({
        message: "Get product from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const products = await Product.findAll({
      where: { productName: { [Op.like]: `%${name}%` } },
    });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Get product successfully", data: products });
  } catch (error) {
    console.error("Get product by name error:", error);
    res.status(500).json({ error: error.message });
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
