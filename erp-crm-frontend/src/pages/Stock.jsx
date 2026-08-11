import { useState, useEffect } from "react";
import { api } from "../utils/api";

function Stock() {
  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMovements();
  }, [page]);

  async function fetchMovements() {
    setLoading(true);
    setError("");
    try {
      const result = await api.products.movements(page);
      if (result.success) {
        setMovements(result.movements);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load stock movements.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="page-header">
        <div>
          <h2>Stock Movements Log</h2>
          <p>Historical audit trail of all inventory IN/OUT adjustments and challan fulfillments.</p>
        </div>
        <button 
          className="primary" 
          onClick={fetchMovements}
          style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
        >
          🔄 Refresh Log
        </button>
      </div>

      {error && (
        <div className="badge danger" style={{ margin: "10px 20px", display: "block", textAlign: "center" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>Loading audit logs...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Type</th>
                <th>Activity / Reference Reason</th>
                <th>Logged By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>
                    No inventory movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: "600", color: "#111827" }}>{item.product_name || "—"}</td>
                    <td style={{ fontFamily: "monospace" }}>{item.product_sku || "—"}</td>
                    <td style={{ fontWeight: "bold" }}>{Math.abs(item.quantity)}</td>
                    <td>
                      <span className={`badge ${item.type === "IN" ? "success" : "danger"}`}>
                        {item.type}
                      </span>
                    </td>
                    <td>{item.reference || "Manual Adjustment"}</td>
                    <td>👤 {item.created_by_username || "System"}</td>
                    <td style={{ color: "#6b7280" }}>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "15px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>Page {page} of {totalPages}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  disabled={page <= 1} 
                  onClick={() => setPage(page - 1)}
                  style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "4px", background: "white" }}
                >
                  Previous
                </button>
                <button 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page + 1)}
                  style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "4px", background: "white" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Stock;
