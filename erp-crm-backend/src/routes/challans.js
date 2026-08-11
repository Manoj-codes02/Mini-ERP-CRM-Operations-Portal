const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// Helper function to generate Challan Number: CH-YYYYMMDD-XXXX
async function generateChallanNumber(connection) {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const prefix = `CH-${year}${month}${day}-`;

  // Get the last challan created today
  const [rows] = await connection.query(
    "SELECT challan_number FROM sales_challans WHERE challan_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastNumStr = rows[0].challan_number.split("-")[2];
    nextNum = parseInt(lastNumStr, 10) + 1;
  }

  const paddedNum = String(nextNum).padStart(4, "0");
  return `${prefix}${paddedNum}`;
}

// GET /api/challans - List all challans with search and pagination
router.get("/", authenticateToken, async (req, res) => {
  const status = req.query.status || "";
  const search = req.query.search || ""; // Search by customer name or challan number
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT sc.*, c.name as customer_name, c.company as customer_company, u.username as created_by_username 
      FROM sales_challans sc
      LEFT JOIN customers c ON sc.customer_id = c.id
      LEFT JOIN users u ON sc.created_by = u.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM sales_challans sc
      LEFT JOIN customers c ON sc.customer_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (status) {
      query += " AND sc.status = ?";
      countQuery += " AND sc.status = ?";
      queryParams.push(status);
    }

    if (search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchClause = " AND (sc.challan_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)";
      query += searchClause;
      countQuery += searchClause;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += " ORDER BY sc.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    // Get count
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    // Get items
    const [challans] = await pool.query(query, queryParams);

    res.json({
      success: true,
      challans,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Fetch challans error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching sales challans.",
    });
  }
});

// GET /api/challans/:id - Get detailed challan with customer details and item snapshots
router.get("/:id", authenticateToken, async (req, res) => {
  const challanId = req.params.id;

  try {
    // Get main challan details
    const [challanRows] = await pool.query(
      `SELECT sc.*, c.name as customer_name, c.email as customer_email, 
              c.phone as customer_phone, c.company as customer_company, c.address as customer_address,
              u.username as created_by_username
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       LEFT JOIN users u ON sc.created_by = u.id
       WHERE sc.id = ?`,
      [challanId]
    );

    if (challanRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Challan not found.",
      });
    }

    const challan = challanRows[0];

    // Get items of the challan
    const [items] = await pool.query(
      `SELECT ci.*, p.warehouse_location
       FROM challan_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.challan_id = ?`,
      [challanId]
    );

    challan.items = items;

    res.json({
      success: true,
      challan,
    });
  } catch (error) {
    console.error("Fetch challan details error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching challan details.",
    });
  }
});

// POST /api/challans - Create a new challan in Draft state (restricted to Admin, Sales)
router.post("/", authenticateToken, authorizeRoles("Admin", "Sales"), async (req, res) => {
  const { customer_id, items } = req.body; // items: [{product_id, quantity}]

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Customer ID and a non-empty list of items are required.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify customer exists
    const [customerRows] = await connection.query("SELECT id FROM customers WHERE id = ?", [customer_id]);
    if (customerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Selected customer does not exist.",
      });
    }

    // Auto-generate challan number
    const challanNumber = await generateChallanNumber(connection);

    // Create the challan with status Draft and total 0 first
    const [challanResult] = await connection.query(
      "INSERT INTO sales_challans (challan_number, customer_id, status, total_amount, created_by) VALUES (?, ?, 'Draft', 0, ?)",
      [challanNumber, customer_id, req.user.id]
    );
    const challanId = challanResult.insertId;

    let totalAmount = 0.0;

    // Process and insert items
    for (const item of items) {
      const { product_id, quantity } = item;
      const parsedQty = parseInt(quantity);

      if (!product_id || isNaN(parsedQty) || parsedQty <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid product ID or quantity. Quantities must be positive integers.",
        });
      }

      // Fetch product info to get price, SKU, name snapshots
      const [prodRows] = await connection.query(
        "SELECT name, sku, price FROM products WHERE id = ?",
        [product_id]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Product with ID ${product_id} not found.`,
        });
      }

      const product = prodRows[0];
      const itemSubtotal = product.price * parsedQty;
      totalAmount += itemSubtotal;

      // Insert item and save name/SKU snapshot (Critical Business Rule!)
      await connection.query(
        `INSERT INTO challan_items (challan_id, product_id, quantity, price, product_name_snapshot, product_sku_snapshot) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [challanId, product_id, parsedQty, product.price, product.name, product.sku]
      );
    }

    // Update total amount in challan header
    await connection.query(
      "UPDATE sales_challans SET total_amount = ? WHERE id = ?",
      [totalAmount, challanId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Draft sales challan created successfully.",
      challanId,
      challanNumber,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create challan error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the sales challan.",
    });
  } finally {
    connection.release();
  }
});

// PUT /api/challans/:id - Edit draft challan (restricted to Admin, Sales)
router.put("/:id", authenticateToken, authorizeRoles("Admin", "Sales"), async (req, res) => {
  const challanId = req.params.id;
  const { customer_id, items } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Customer ID and a non-empty list of items are required.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify challan exists and is in Draft state
    const [challanRows] = await connection.query("SELECT status FROM sales_challans WHERE id = ? FOR UPDATE", [challanId]);
    if (challanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Challan not found.",
      });
    }

    if (challanRows[0].status !== "Draft") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot edit a challan with status "${challanRows[0].status}". Only Draft challans can be edited.`,
      });
    }

    // Verify customer exists
    const [customerRows] = await connection.query("SELECT id FROM customers WHERE id = ?", [customer_id]);
    if (customerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Selected customer does not exist.",
      });
    }

    // Delete existing items
    await connection.query("DELETE FROM challan_items WHERE challan_id = ?", [challanId]);

    let totalAmount = 0.0;

    // Process and insert new items
    for (const item of items) {
      const { product_id, quantity } = item;
      const parsedQty = parseInt(quantity);

      if (!product_id || isNaN(parsedQty) || parsedQty <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid product ID or quantity. Quantities must be positive integers.",
        });
      }

      const [prodRows] = await connection.query(
        "SELECT name, sku, price FROM products WHERE id = ?",
        [product_id]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Product with ID ${product_id} not found.`,
        });
      }

      const product = prodRows[0];
      const itemSubtotal = product.price * parsedQty;
      totalAmount += itemSubtotal;

      await connection.query(
        `INSERT INTO challan_items (challan_id, product_id, quantity, price, product_name_snapshot, product_sku_snapshot) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [challanId, product_id, parsedQty, product.price, product.name, product.sku]
      );
    }

    // Update challan header
    await connection.query(
      "UPDATE sales_challans SET customer_id = ?, total_amount = ? WHERE id = ?",
      [customer_id, totalAmount, challanId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Sales challan updated successfully.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update challan error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the sales challan.",
    });
  } finally {
    connection.release();
  }
});

// POST /api/challans/:id/confirm - Confirm challan (reduces stock, checks limits) (restricted to Admin, Sales, Accounts)
router.post("/:id/confirm", authenticateToken, authorizeRoles("Admin", "Sales", "Accounts"), async (req, res) => {
  const challanId = req.params.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock and get challan status
    const [challanRows] = await connection.query(
      "SELECT id, challan_number, status FROM sales_challans WHERE id = ? FOR UPDATE",
      [challanId]
    );

    if (challanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Challan not found.",
      });
    }

    const challan = challanRows[0];
    if (challan.status !== "Draft") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Challan is already in "${challan.status}" status. Only Draft challans can be confirmed.`,
      });
    }

    // Get challan items
    const [items] = await connection.query(
      "SELECT product_id, quantity, product_name_snapshot FROM challan_items WHERE challan_id = ?",
      [challanId]
    );

    // Business Rules: Check stock levels for all items first
    for (const item of items) {
      const [prodRows] = await connection.query(
        "SELECT id, name, stock_level FROM products WHERE id = ? FOR UPDATE",
        [item.product_id]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Product "${item.product_name_snapshot}" (ID: ${item.product_id}) no longer exists.`,
        });
      }

      const product = prodRows[0];
      if (product.stock_level < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product "${product.name}". Available: ${product.stock_level}, Required: ${item.quantity}. Stock cannot go negative. Confirmation aborted.`,
        });
      }
    }

    // All stock checks passed! Deduct stock and log movements
    for (const item of items) {
      // Deduct stock level
      await connection.query(
        "UPDATE products SET stock_level = stock_level - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );

      // Log stock movement OUT
      await connection.query(
        `INSERT INTO stock_movements (product_id, quantity, type, reference, created_by) 
         VALUES (?, ?, 'OUT', ?, ?)`,
        [item.product_id, -item.quantity, `Sales Challan Confirmation: ${challan.challan_number}`, req.user.id]
      );
    }

    // Set challan status to Confirmed
    await connection.query(
      "UPDATE sales_challans SET status = 'Confirmed' WHERE id = ?",
      [challanId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Challan ${challan.challan_number} confirmed successfully. Inventory has been updated.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Confirm challan error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while confirming the challan.",
    });
  } finally {
    connection.release();
  }
});

// POST /api/challans/:id/cancel - Cancel challan (restricted to Admin, Sales, Accounts)
router.post("/:id/cancel", authenticateToken, authorizeRoles("Admin", "Sales", "Accounts"), async (req, res) => {
  const challanId = req.params.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock and get challan status
    const [challanRows] = await connection.query(
      "SELECT id, challan_number, status FROM sales_challans WHERE id = ? FOR UPDATE",
      [challanId]
    );

    if (challanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Challan not found.",
      });
    }

    const challan = challanRows[0];
    if (challan.status === "Cancelled") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Challan is already Cancelled.",
      });
    }

    // If challan was Confirmed, we MUST return stock to inventory (revert)
    if (challan.status === "Confirmed") {
      // Get items
      const [items] = await connection.query(
        "SELECT product_id, quantity FROM challan_items WHERE challan_id = ?",
        [challanId]
      );

      for (const item of items) {
        // Return stock
        await connection.query(
          "UPDATE products SET stock_level = stock_level + ? WHERE id = ?",
          [item.quantity, item.product_id]
        );

        // Log stock movement IN
        await connection.query(
          `INSERT INTO stock_movements (product_id, quantity, type, reference, created_by) 
           VALUES (?, ?, 'IN', ?, ?)`,
          [item.product_id, item.quantity, `Cancelled Challan Stock Return: ${challan.challan_number}`, req.user.id]
        );
      }
    }

    // Set challan status to Cancelled
    await connection.query(
      "UPDATE sales_challans SET status = 'Cancelled' WHERE id = ?",
      [challanId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Challan ${challan.challan_number} has been cancelled. Any confirmed stock has been returned to inventory.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel challan error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while cancelling the challan.",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
