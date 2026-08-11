const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// GET /api/customers - List customers with search/filter and pagination
router.get("/", authenticateToken, async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = "SELECT * FROM customers";
    let countQuery = "SELECT COUNT(*) as count FROM customers";
    const queryParams = [];

    if (search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchClause = " WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ? OR gst_number LIKE ?";
      query += searchClause;
      countQuery += searchClause;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    const [customers] = await pool.query(query, queryParams);

    res.json({
      success: true,
      customers,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Fetch customers error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching customers.",
    });
  }
});

// GET /api/customers/:id - Get customer details including follow-up notes
router.get("/:id", authenticateToken, async (req, res) => {
  const customerId = req.params.id;

  try {
    const [customerRows] = await pool.query("SELECT * FROM customers WHERE id = ?", [customerId]);
    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const customer = customerRows[0];

    const [notes] = await pool.query(
      `SELECT n.id, n.note, n.created_at, u.username as created_by_username 
       FROM follow_up_notes n 
       LEFT JOIN users u ON n.created_by = u.id 
       WHERE n.customer_id = ? 
       ORDER BY n.created_at DESC`,
      [customerId]
    );

    customer.notes = notes;

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Fetch customer details error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching customer details.",
    });
  }
});

// POST /api/customers - Add customer (restricted to Admin, Sales)
router.post("/", authenticateToken, authorizeRoles("Admin", "Sales"), async (req, res) => {
  const { name, email, phone, company, gst_number, customer_type, status, follow_up_date, address } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and Email are required.",
    });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM customers WHERE email = ?", [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A customer with this email already exists.",
      });
    }

    const typeValue = ["Retail", "Wholesale", "Distributor"].includes(customer_type) ? customer_type : "Wholesale";
    const statusValue = ["Lead", "Active", "Inactive"].includes(status) ? status : "Active";

    const [result] = await pool.query(
      "INSERT INTO customers (name, email, phone, company, gst_number, customer_type, status, follow_up_date, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name.trim(),
        email.trim(),
        phone?.trim() || null,
        company?.trim() || null,
        gst_number?.trim() || null,
        typeValue,
        statusValue,
        follow_up_date || null,
        address?.trim() || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer added successfully.",
      customerId: result.insertId,
    });
  } catch (error) {
    console.error("Add customer error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the customer.",
    });
  }
});

// PUT /api/customers/:id - Edit customer details (restricted to Admin, Sales)
router.put("/:id", authenticateToken, authorizeRoles("Admin", "Sales"), async (req, res) => {
  const customerId = req.params.id;
  const { name, email, phone, company, gst_number, customer_type, status, follow_up_date, address } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and Email are required.",
    });
  }

  try {
    const [customerRows] = await pool.query("SELECT id FROM customers WHERE id = ?", [customerId]);
    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const [existing] = await pool.query("SELECT id FROM customers WHERE email = ? AND id != ?", [email.trim(), customerId]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Another customer with this email already exists.",
      });
    }

    const typeValue = ["Retail", "Wholesale", "Distributor"].includes(customer_type) ? customer_type : "Wholesale";
    const statusValue = ["Lead", "Active", "Inactive"].includes(status) ? status : "Active";

    await pool.query(
      "UPDATE customers SET name = ?, email = ?, phone = ?, company = ?, gst_number = ?, customer_type = ?, status = ?, follow_up_date = ?, address = ? WHERE id = ?",
      [
        name.trim(),
        email.trim(),
        phone?.trim() || null,
        company?.trim() || null,
        gst_number?.trim() || null,
        typeValue,
        statusValue,
        follow_up_date || null,
        address?.trim() || null,
        customerId
      ]
    );

    res.json({
      success: true,
      message: "Customer updated successfully.",
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the customer.",
    });
  }
});

// POST /api/customers/:id/notes - Add follow-up note (restricted to Admin, Sales)
router.post("/:id/notes", authenticateToken, authorizeRoles("Admin", "Sales"), async (req, res) => {
  const customerId = req.params.id;
  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({
      success: false,
      message: "Note content cannot be empty.",
    });
  }

  try {
    const [customerRows] = await pool.query("SELECT id FROM customers WHERE id = ?", [customerId]);
    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    await pool.query(
      "INSERT INTO follow_up_notes (customer_id, note, created_by) VALUES (?, ?, ?)",
      [customerId, note.trim(), req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Follow-up note added successfully.",
    });
  } catch (error) {
    console.error("Add note error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the follow-up note.",
    });
  }
});

module.exports = router;
