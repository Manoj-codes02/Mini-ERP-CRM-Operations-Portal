const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const { authenticateToken } = require("../middleware/auth");

router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const [[{ customer_count }]] = await pool.query(
      "SELECT COUNT(*) as customer_count FROM customers",
    );
    const [[{ product_count }]] = await pool.query(
      "SELECT COUNT(*) as product_count FROM products",
    );
    const [[{ low_stock_count }]] = await pool.query(
      "SELECT COUNT(*) as low_stock_count FROM products WHERE stock_level <= min_stock_level",
    );
    const [challanStats] = await pool.query(
      `SELECT status, COUNT(*) as count, SUM(total_amount) as total_value 
       FROM sales_challans 
       GROUP BY status`,
    );

    let draftCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let totalSalesValue = 0.0;

    challanStats.forEach((stat) => {
      if (stat.status === "Draft") draftCount = stat.count;
      else if (stat.status === "Confirmed") {
        confirmedCount = stat.count;
        totalSalesValue = parseFloat(stat.total_value) || 0.0;
      } else if (stat.status === "Cancelled") {
        cancelledCount = stat.count;
      }
    });
    const [recentChallans] = await pool.query(
      `SELECT sc.id, sc.challan_number, sc.status, sc.total_amount, sc.created_at, c.name as customer_name
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       ORDER BY sc.created_at DESC LIMIT 5`,
    );

    const [recentMovements] = await pool.query(
      `SELECT sm.id, sm.quantity, sm.type, sm.reference, sm.created_at, p.name as product_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       ORDER BY sm.created_at DESC LIMIT 5`,
    );
    const [lowStockProducts] = await pool.query(
      `SELECT id, name, sku, stock_level, min_stock_level, warehouse_location 
       FROM products 
       WHERE stock_level <= min_stock_level 
       ORDER BY stock_level ASC LIMIT 5`,
    );

    res.json({
      success: true,
      stats: {
        customers: customer_count,
        products: product_count,
        lowStockAlerts: low_stock_count,
        totalSales: totalSalesValue,
        challans: {
          draft: draftCount,
          confirmed: confirmedCount,
          cancelled: cancelledCount,
          total: draftCount + confirmedCount + cancelledCount,
        },
      },
      recentChallans,
      recentMovements,
      lowStockProducts,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while loading dashboard statistics.",
    });
  }
});

module.exports = router;
