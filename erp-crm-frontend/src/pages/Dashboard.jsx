import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Link } from "react-router-dom";

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    setLoading(true);
    setError("");
    try {
      const result = await api.dashboard.getStats();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center", fontWeight: "600" }}>Loading portal statistics...</div>;
  }

  if (error) {
    return (
      <div className="badge danger" style={{ display: "block", padding: "15px", margin: "20px", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  const { stats, recentChallans, recentMovements, lowStockProducts } = data;

  return (
    <>
      {/* Hero Banner Section Inspired by India.gov.in */}
      <div className="hero-banner">
        <h1 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>
          National Business Operations & ERP Portal
        </h1>
        <p style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>
          Where Business Operations, Stock Logistics & Customer Management Converge
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>Quick Actions:</span>
          <Link to="/challans" style={{ color: "#ffffff", fontSize: "11px", textDecoration: "none", background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: "3px" }}>
            + Create Sales Challan
          </Link>
          <Link to="/customers" style={{ color: "#ffffff", fontSize: "11px", textDecoration: "none", background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: "3px" }}>
            + Add New Customer
          </Link>
          <Link to="/products" style={{ color: "#ffffff", fontSize: "11px", textDecoration: "none", background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: "3px" }}>
            + Manage Inventory
          </Link>
        </div>
      </div>

      {/* Metrics Card Banner Row */}
      <div className="cards">
        <Card title="Active Customers" value={stats.customers} sub="Registered CRM Accounts" icon="👥" link="/customers" />
        <Card title="Product Items" value={stats.products} sub="Active SKU Inventory" icon="📦" link="/products" />
        <Card 
          title="Low Stock Alerts" 
          value={stats.lowStockAlerts} 
          sub={stats.lowStockAlerts > 0 ? "Requires Reorder" : "Stock Levels Healthy"}
          icon="⚠️" 
          link="/products?lowStock=true"
          isDanger={stats.lowStockAlerts > 0}
        />
        <Card title="Sales Revenue" value={`₹${stats.totalSales.toLocaleString("en-IN")}`} sub="Confirmed Challans" icon="💰" link="/challans" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
        
        {/* Recent Sales Challans */}
        <div className="panel">
          <div className="page-header">
            <div>
              <h2>Recent Sales Challans</h2>
              <p>Latest draft and confirmed invoices</p>
            </div>
            <Link to="/challans" style={{ fontSize: "12px", color: "#d9252a", textDecoration: "none", fontWeight: "700" }}>
              View All →
            </Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Challan No</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentChallans.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>No recent challans.</td>
                </tr>
              ) : (
                recentChallans.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/challans?id=${c.id}`} style={{ fontWeight: "700", color: "#0f172a", textDecoration: "underline" }}>
                        {c.challan_number}
                      </Link>
                    </td>
                    <td>{c.customer_name}</td>
                    <td>₹{parseFloat(c.total_amount).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`badge ${
                        c.status === "Confirmed" ? "success" : c.status === "Draft" ? "warning" : "danger"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div className="panel">
          <div className="page-header">
            <div>
              <h2>Stock Reorder Checklist ({stats.lowStockAlerts})</h2>
              <p>Products at or below minimum threshold</p>
            </div>
          </div>
          <div style={{ padding: "20px" }}>
            {lowStockProducts.length === 0 ? (
              <p style={{ color: "#166534", fontSize: "13px", fontWeight: "700" }}>
                ✓ All products are fully stocked above minimum thresholds!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {lowStockProducts.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "4px" }}>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#991b1b" }}>{p.name}</strong>
                      <div style={{ fontSize: "11px", color: "#7f1d1d" }}>SKU: {p.sku} | Loc: {p.warehouse_location || "N/A"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge danger">
                        Stock: {p.stock_level} (Min: {p.min_stock_level})
                      </span>
                    </div>
                  </div>
                ))}
                <Link to="/products" style={{ display: "block", textAlign: "center", fontSize: "12px", color: "#d9252a", fontWeight: "700", textDecoration: "none", marginTop: "10px" }}>
                  Manage Inventory & Stock Movement →
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Stock Movements */}
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Recent Inventory Logs</h2>
            <p>Real-time stock IN and stock OUT auditing</p>
          </div>
          <Link to="/stock" style={{ fontSize: "12px", color: "#d9252a", textDecoration: "none", fontWeight: "700" }}>
            View Movement Audit Logs →
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Movement Type</th>
              <th>Reference / Activity</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {recentMovements.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "#64748b" }}>No recent stock movements.</td>
              </tr>
            ) : (
              recentMovements.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: "700" }}>{m.product_name}</td>
                  <td>{Math.abs(m.quantity)}</td>
                  <td>
                    <span className={`badge ${m.type === "IN" ? "success" : "danger"}`}>{m.type}</span>
                  </td>
                  <td>{m.reference}</td>
                  <td style={{ color: "#64748b" }}>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Card({ title, value, sub, icon, link, isDanger }) {
  return (
    <Link to={link} className="card" style={{ textDecoration: "none", borderTopColor: isDanger ? "#dc2626" : "#d9252a" }}>
      <div>
        <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{value}</div>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginTop: "2px" }}>{title}</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{sub}</div>
      </div>
      <div style={{ fontSize: "32px", opacity: 0.8 }}>
        {icon}
      </div>
    </Link>
  );
}

export default Dashboard;
