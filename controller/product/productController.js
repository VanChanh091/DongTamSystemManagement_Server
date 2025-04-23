import Redis from "ioredis";
import Product from "../../models/product/product.js";
import { Op, fn, col, where } from "sequelize";

const redisCache = new Redis();

//get all product
export const getAllProduct = async (req, res) => {
  try {
    const cacheKey = "products:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Data Product from Redis");
      return res.status(200).json({
        message: "Get all products from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Product.findAll();

    // Cache redis in 1 hour
    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    return res
      .status(201)
      .json({ message: "Get all orders successfully", data });
  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({ error: error.message });
  }
};

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

    return res
      .status(201)
      .json({ message: "Get product successfully", data: product });
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

    return res
      .status(200)
      .json({ message: "Get product successfully", data: products });
  } catch (error) {
    console.error("Get product by name error:", error);
    res.status(500).json({ error: error.message });
  }
};

//add product
export const addProduct = async (req, res) => {
  const { prefix = "CUSTOM", ...productData } = req.body;

  try {
    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");

    const lastProduct = await Product.findOne({
      where: {
        productId: {
          [Op.like]: `${sanitizedPrefix}%`,
        },
      },
      order: [["productId", "DESC"]],
    });

    let number = 1;
    if (lastProduct && lastProduct.productId) {
      const lastNumber = parseInt(
        lastProduct.productId.slice(sanitizedPrefix.length),
        10
      );
      if (!isNaN(lastNumber)) {
        number = lastNumber + 1;
      }
    }

    const formattedNumber = number.toString().padStart(4, "0");
    const newProductId = `${sanitizedPrefix}${formattedNumber}`;

    const newProduct = await Product.create({
      productId: newProductId.toUpperCase(),
      ...productData,
    });

    await redisCache.del("products:all");

    return res.status(201).json({
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(404).json({ error: error.message });
  }
};

//update product
export const updateProduct = async (req, res) => {
  const { id } = req.query;
  const { ...productData } = req.body;

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.update(productData);

    await redisCache.del("products:all");

    return res.status(200).json({
      message: "Product updated successfully",
      data: product,
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

    await product.destroy();
    await redisCache.del("products:all");

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: error.message });
  }
};
