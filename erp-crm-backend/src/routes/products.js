const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// GET /api/products - List all products with search, pagination, and stock alert filter
router.get("/", authenticateToken, async (req, res) => {
  const search = req.query.search || "";
  const lowStock = req.query.lowStock === "true"; // filter products running low
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = "SELECT * FROM products WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as count FROM products WHERE 1=1";
    const queryParams = [];

    if (search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchClause = " AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)";
      query += searchClause;
      countQuery += searchClause;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (lowStock) {
      const alertClause = " AND stock_level <= min_stock_level";
      query += alertClause;
      countQuery += alertClause;
    }

    query += " ORDER BY name ASC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    const [products] = await pool.query(query, queryParams);

    res.json({
      success: true,
      products,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching products.",
    });
  }
});

// GET /api/products/:id - Get product details
router.get("/:id", authenticateToken, async (req, res) => {
  const productId = req.params.id;
  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [productId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const [movements] = await pool.query(
      `SELECT m.id, m.quantity, m.type, m.reference, m.created_at, u.username as created_by_username 
       FROM stock_movements m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.product_id = ?
       ORDER BY m.created_at DESC LIMIT 15`,
      [productId]
    );

    const product = rows[0];
    product.movements = movements;

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Fetch product details error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching product details.",
    });
  }
});

// POST /api/products - Add product (restricted to Admin, Warehouse)
router.post("/", authenticateToken, authorizeRoles("Admin", "Warehouse"), async (req, res) => {
  const { name, sku, category, description, price, min_stock_level, warehouse_location } = req.body;

  if (!name || !sku || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "Name, SKU, and Price are required.",
    });
  }

  const numericPrice = parseFloat(price);
  const minStock = parseInt(min_stock_level) || 0;

  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a valid positive number.",
    });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM products WHERE sku = ?", [sku.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, sku, category, description, price, stock_level, min_stock_level, warehouse_location) 
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [name.trim(), sku.trim(), category?.trim() || "General", description?.trim() || null, numericPrice, minStock, warehouse_location?.trim() || null]
    );

    await pool.query(
      "INSERT INTO stock_movements (product_id, quantity, type, reference, created_by) VALUES (?, 0, 'IN', 'Product Registered', ?)",
      [result.insertId, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      productId: result.insertId,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the product.",
    });
  }
});

// PUT /api/products/:id - Edit product (restricted to Admin, Warehouse)
router.put("/:id", authenticateToken, authorizeRoles("Admin", "Warehouse"), async (req, res) => {
  const productId = req.params.id;
  const { name, sku, category, description, price, min_stock_level, warehouse_location } = req.body;

  if (!name || !sku || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "Name, SKU, and Price are required.",
    });
  }

  const numericPrice = parseFloat(price);
  const minStock = parseInt(min_stock_level) || 0;

  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a valid positive number.",
    });
  }

  try {
    const [rows] = await pool.query("SELECT id FROM products WHERE id = ?", [productId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const [existing] = await pool.query("SELECT id FROM products WHERE sku = ? AND id != ?", [sku.trim(), productId]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Another product with this SKU already exists.",
      });
    }

    await pool.query(
      `UPDATE products 
       SET name = ?, sku = ?, category = ?, description = ?, price = ?, min_stock_level = ?, warehouse_location = ? 
       WHERE id = ?`,
      [name.trim(), sku.trim(), category?.trim() || "General", description?.trim() || null, numericPrice, minStock, warehouse_location?.trim() || null, productId]
    );

    res.json({
      success: true,
      message: "Product updated successfully.",
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the product.",
    });
  }
});

// POST /api/products/:id/stock - Manual Stock Adjustment (restricted to Admin, Warehouse)
router.post("/:id/stock", authenticateToken, authorizeRoles("Admin", "Warehouse"), async (req, res) => {
  const productId = req.params.id;
  const { quantity, type, reference } = req.body;

  if (!quantity || !type || !["IN", "OUT"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Quantity, type ('IN' or 'OUT'), and reference are required.",
    });
  }

  const changeQty = parseInt(quantity);
  if (isNaN(changeQty) || changeQty <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a positive integer.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query("SELECT * FROM products WHERE id = ? FOR UPDATE", [productId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = rows[0];
    let newStockLevel = product.stock_level;

    if (type === "IN") {
      newStockLevel += changeQty;
    } else if (type === "OUT") {
      if (product.stock_level < changeQty) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Requested: ${changeQty}, Available: ${product.stock_level}. Stock level cannot go negative.`,
        });
      }
      newStockLevel -= changeQty;
    }

    await connection.query("UPDATE products SET stock_level = ? WHERE id = ?", [newStockLevel, productId]);

    await connection.query(
      `INSERT INTO stock_movements (product_id, quantity, type, reference, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [productId, type === "IN" ? changeQty : -changeQty, type, reference?.trim() || "Manual Adjustment", req.user.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Stock successfully adjusted ${type}. New stock level: ${newStockLevel}`,
      newStockLevel,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Stock adjustment error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adjusting stock level.",
    });
  } finally {
    connection.release();
  }
});

// GET /api/products/movements - Global stock movements log (restricted to Admin, Warehouse, Accounts)
router.get("/movements", authenticateToken, authorizeRoles("Admin", "Warehouse", "Accounts"), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const countQuery = "SELECT COUNT(*) as count FROM stock_movements";
    const [countResult] = await pool.query(countQuery);
    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    const [movements] = await pool.query(
      `SELECT m.id, m.quantity, m.type, m.reference, m.created_at, 
              p.name as product_name, p.sku as product_sku, 
              u.username as created_by_username 
       FROM stock_movements m
       LEFT JOIN products p ON m.product_id = p.id
       LEFT JOIN users u ON m.created_by = u.id
       ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      movements,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Fetch movements error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching stock movements.",
    });
  }
});

module.exports = router;
