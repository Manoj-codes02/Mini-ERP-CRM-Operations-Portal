import { useState, useEffect } from "react";
import { api } from "../utils/api";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Product Add/Edit Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  // Product form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [location, setLocation] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Stock Adjustment Modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("IN"); // "IN" or "OUT"
  const [adjustRef, setAdjustRef] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [adjustSuccess, setAdjustSuccess] = useState("");

  // Logged-in user information
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, lowStockFilter, page]);

  async function fetchProducts() {
    setLoading(true);
    setError("");
    try {
      const result = await api.products.list(search, lowStockFilter, page);
      if (result.success) {
        setProducts(result.products);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  function openAddProduct() {
    setModalMode("add");
    setSelectedProductId(null);
    setName("");
    setSku("");
    setCategory("General");
    setDescription("");
    setPrice("");
    setMinStock("5");
    setLocation("");
    setModalError("");
    setModalSuccess("");
    setShowProductModal(true);
  }

  function openEditProduct(product) {
    setModalMode("edit");
    setSelectedProductId(product.id);
    setName(product.name);
    setSku(product.sku);
    setCategory(product.category || "General");
    setDescription(product.description || "");
    setPrice(product.price);
    setMinStock(product.min_stock_level);
    setLocation(product.warehouse_location || "");
    setModalError("");
    setModalSuccess("");
    setShowProductModal(true);
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!name.trim() || !sku.trim() || price === "") {
      setModalError("Product Name, SKU, and Price are required.");
      return;
    }

    if (parseFloat(price) < 0) {
      setModalError("Price cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        category: category.trim(),
        description: description.trim(),
        price: parseFloat(price),
        min_stock_level: parseInt(minStock) || 0,
        warehouse_location: location.trim(),
      };

      let result;
      if (modalMode === "add") {
        result = await api.products.create(payload);
      } else {
        result = await api.products.update(selectedProductId, payload);
      }

      if (result.success) {
        setModalSuccess(modalMode === "add" ? "Product created successfully!" : "Product updated successfully!");
        fetchProducts();
        setTimeout(() => {
          setShowProductModal(false);
        }, 1200);
      }
    } catch (err) {
      setModalError(err.message || "Failed to save product details.");
    } finally {
      setSubmitting(false);
    }
  }

  function openStockAdjustment(product) {
    setAdjustProduct(product);
    setAdjustQty("");
    setAdjustType("IN");
    setAdjustRef("Manual Adjustment");
    setAdjustError("");
    setAdjustSuccess("");
    setShowStockModal(true);
  }

  async function handleStockSubmit(e) {
    e.preventDefault();
    setAdjustError("");
    setAdjustSuccess("");

    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError("Quantity must be a positive number.");
      return;
    }

    if (!adjustRef.trim()) {
      setAdjustError("Reference / Reason is required.");
      return;
    }

    try {
      const result = await api.products.adjustStock(
        adjustProduct.id,
        qty,
        adjustType,
        adjustRef.trim()
      );

      if (result.success) {
        setAdjustSuccess(result.message);
        fetchProducts();
        setTimeout(() => {
          setShowStockModal(false);
        }, 1500);
      }
    } catch (err) {
      setAdjustError(err.message || "Failed to update stock.");
    }
  }

  const isWarehouseOrAdmin = user?.role === "Admin" || user?.role === "Warehouse";

  return (
    <div className="panel">
      <div className="page-header">
        <div>
          <h2>Products & Inventory Catalog</h2>
          <p>Track product price, minimum inventory levels, locations, and manual stock logs.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Low stock checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", marginRight: "10px" }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => {
                setLowStockFilter(e.target.checked);
                setPage(1);
              }}
            />
            ⚠️ Low Stock Alert Only
          </label>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search Product / SKU / Category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", width: "200px" }}
          />

          {isWarehouseOrAdmin && (
            <button className="primary" onClick={openAddProduct}>
              📦 New Product
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="badge danger" style={{ margin: "10px 20px", display: "block", textAlign: "center" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>Loading inventory data...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Product Details</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th>Warehouse Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock_level <= p.min_stock_level;
                  return (
                    <tr 
                      key={p.id} 
                      style={{ background: isLow ? "#fff5f5" : "transparent" }}
                    >
                      <td>
                        <strong style={{ color: "#111827" }}>{p.name}</strong>
                        {p.description && <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>{p.description}</div>}
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: "600" }}>{p.sku}</td>
                      <td>
                        <span className="badge secondary">{p.category || "General"}</span>
                      </td>
                      <td>₹{parseFloat(p.price).toLocaleString("en-IN")}</td>
                      <td>
                        <span style={{ fontWeight: "bold", color: isLow ? "#dc2626" : "inherit" }}>
                          {p.stock_level}
                        </span>
                        <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "4px" }}>
                          (Min: {p.min_stock_level})
                        </span>
                      </td>
                      <td>📍 {p.warehouse_location || "Not assigned"}</td>
                      <td>
                        <span className={`badge ${isLow ? "danger" : "success"}`}>
                          {isLow ? "Low Stock Alert" : "Good Stock"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {isWarehouseOrAdmin && (
                            <>
                              <button 
                                onClick={() => openStockAdjustment(p)}
                                style={{ padding: "4px 8px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600" }}
                              >
                                🔄 Stock IN/OUT
                              </button>
                              <button 
                                onClick={() => openEditProduct(p)}
                                style={{ padding: "4px 8px", background: "none", border: "none", color: "#2563eb", fontSize: "10px", textDecoration: "underline" }}
                              >
                                Edit
                              </button>
                            </>
                          )}
                          {!isWarehouseOrAdmin && (
                            <span style={{ fontSize: "10px", color: "#9ca3af" }}>Read-Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Product Add/Edit Dialog */}
      {showProductModal && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: "1000" }}>
          <div className="login-card" style={{ width: "480px", background: "white", borderRadius: "10px", padding: "25px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
                {modalMode === "add" ? "Register New Product" : "Edit Product Catalog"}
              </h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}>✕</button>
            </div>

            {modalError && <div className="badge danger" style={{ display: "block", marginBottom: "15px", padding: "8px", textAlign: "center" }}>{modalError}</div>}
            {modalSuccess && <div className="badge success" style={{ display: "block", marginBottom: "15px", padding: "8px", textAlign: "center" }}>{modalSuccess}</div>}

            <form onSubmit={handleProductSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Mouse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>SKU Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. MS-WRLSS-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontFamily: "monospace" }}
                    required
                    disabled={modalMode === "edit"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Peripherals / Audio"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Min. Stock Alert Threshold</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Warehouse Location</label>
                <input
                  type="text"
                  placeholder="e.g. Aisle A1 / Shelf B3"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Description</label>
                <textarea
                  placeholder="Brief product notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%", height: "50px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", resize: "none", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" className="primary" style={{ flex: "1", padding: "10px" }} disabled={submitting}>
                  {submitting ? "Saving..." : "Save Product"}
                </button>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: "1", padding: "10px", border: "1px solid #d1d5db", background: "white", borderRadius: "6px" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      {showStockModal && adjustProduct && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: "1000" }}>
          <div className="login-card" style={{ width: "450px", background: "white", borderRadius: "10px", padding: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: "0", fontSize: "15px", fontWeight: "bold" }}>Stock IN / OUT Log</h3>
              <button onClick={() => setShowStockModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}>✕</button>
            </div>

            <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "6px", fontSize: "11px", marginBottom: "15px" }}>
              <div><strong>Product:</strong> {adjustProduct.name}</div>
              <div><strong>SKU:</strong> {adjustProduct.sku}</div>
              <div><strong>Current Stock:</strong> <span style={{ fontWeight: "bold" }}>{adjustProduct.stock_level}</span></div>
            </div>

            {adjustError && <div className="badge danger" style={{ display: "block", marginBottom: "15px", padding: "8px", textAlign: "center" }}>{adjustError}</div>}
            {adjustSuccess && <div className="badge success" style={{ display: "block", marginBottom: "15px", padding: "8px", textAlign: "center" }}>{adjustSuccess}</div>}

            <form onSubmit={handleStockSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>Adjustment Type</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    type="button" 
                    onClick={() => setAdjustType("IN")}
                    style={{ flex: 1, padding: "8px", border: "1px solid #10b981", borderRadius: "6px", background: adjustType === "IN" ? "#dcfce7" : "white", color: "#15803d", fontWeight: "bold" }}
                  >
                    📥 Stock IN (Increase)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAdjustType("OUT")}
                    style={{ flex: 1, padding: "8px", border: "1px solid #ef4444", borderRadius: "6px", background: adjustType === "OUT" ? "#fee2e2" : "white", color: "#dc2626", fontWeight: "bold" }}
                  >
                    📤 Stock OUT (Decrease)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>Reference / Reason for Change</label>
                <input
                  type="text"
                  placeholder="e.g. Manual count correction / Damaged items"
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button type="submit" className="primary" style={{ flex: "1", padding: "10px" }}>
                  Submit Log
                </button>
                <button type="button" onClick={() => setShowStockModal(false)} style={{ flex: "1", padding: "10px", border: "1px solid #d1d5db", background: "white", borderRadius: "6px" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Products;
