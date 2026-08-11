import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

function Challans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [challans, setChallans] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detailed Challan drawer state
  const [selectedChallanId, setSelectedChallanId] = useState(null);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Create/Edit Challan Mode state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" or "edit"
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formItems, setFormItems] = useState([{ product_id: "", quantity: 1 }]);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // User state
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
    fetchChallans();
  }, [search, statusFilter, page]);

  useEffect(() => {
    const queryId = searchParams.get("id");
    if (queryId) {
      handleSelectChallan(parseInt(queryId));
      setSearchParams({});
    }
  }, [searchParams]);

  async function fetchChallans() {
    setLoading(true);
    setError("");
    try {
      const result = await api.challans.list(search, statusFilter, page);
      if (result.success) {
        setChallans(result.challans);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load challans.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectChallan(id) {
    setSelectedChallanId(id);
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await api.challans.get(id);
      if (result.success) {
        setSelectedChallan(result.challan);
      }
    } catch (err) {
      setDetailError(err.message || "Failed to load challan details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadCatalogs() {
    try {
      const custData = await api.customers.list("", 1, 100);
      if (custData.success) {
        setCustomersList(custData.customers);
      }
      const prodData = await api.products.list("", false, 1, 100);
      if (prodData.success) {
        setProductsList(prodData.products);
      }
    } catch (err) {
      console.error("Failed to load customer/product catalog listings", err);
    }
  }

  function handleOpenCreate() {
    setFormMode("create");
    setFormCustomerId("");
    setFormItems([{ product_id: "", quantity: 1 }]);
    setFormError("");
    setFormSuccess("");
    setShowCreateForm(true);
    loadCatalogs();
  }

  function handleOpenEdit() {
    if (!selectedChallan || selectedChallan.status !== "Draft") return;
    setFormMode("edit");
    setFormCustomerId(selectedChallan.customer_id);
    
    const mapped = selectedChallan.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
    }));
    setFormItems(mapped);
    
    setFormError("");
    setFormSuccess("");
    setShowCreateForm(true);
    loadCatalogs();
  }

  function handleItemChange(index, field, value) {
    const updated = [...formItems];
    updated[index][field] = value;
    setFormItems(updated);
  }

  function handleAddItemRow() {
    setFormItems([...formItems, { product_id: "", quantity: 1 }]);
  }

  function handleRemoveItemRow(index) {
    if (formItems.length === 1) return;
    const updated = formItems.filter((_, i) => i !== index);
    setFormItems(updated);
  }

  async function handleChallanSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formCustomerId) {
      setFormError("Please select a customer.");
      return;
    }

    for (const item of formItems) {
      if (!item.product_id) {
        setFormError("Please select a product for all rows.");
        return;
      }
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        setFormError("Quantity must be a positive integer.");
        return;
      }
    }

    setFormSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(formCustomerId),
        items: formItems.map((i) => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity),
        })),
      };

      let result;
      if (formMode === "create") {
        result = await api.challans.create(payload);
      } else {
        result = await api.challans.update(selectedChallan.id, payload);
      }

      if (result.success) {
        setFormSuccess(formMode === "create" ? "Draft challan created successfully!" : "Draft challan updated successfully!");
        fetchChallans();
        if (formMode === "edit") {
          handleSelectChallan(selectedChallan.id);
        }
        setTimeout(() => {
          setShowCreateForm(false);
        }, 1200);
      }
    } catch (err) {
      setFormError(err.message || "Failed to save challan.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleConfirmChallan() {
    if (!window.confirm("Are you sure you want to CONFIRM this challan? This will lock the items and permanently deduct stock levels.")) {
      return;
    }

    setActionLoading(true);
    setDetailError("");
    try {
      const result = await api.challans.confirm(selectedChallan.id);
      if (result.success) {
        alert(result.message);
        fetchChallans();
        handleSelectChallan(selectedChallan.id);
      }
    } catch (err) {
      setDetailError(err.message || "Failed to confirm challan. Stock might be insufficient.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelChallan() {
    const confirmationMsg = selectedChallan.status === "Confirmed" 
      ? "This challan is CONFIRMED. Cancelling it will return all products to stock levels. Do you want to proceed?"
      : "Are you sure you want to CANCEL this draft challan?";

    if (!window.confirm(confirmationMsg)) {
      return;
    }

    setActionLoading(true);
    setDetailError("");
    try {
      const result = await api.challans.cancel(selectedChallan.id);
      if (result.success) {
        alert(result.message);
        fetchChallans();
        handleSelectChallan(selectedChallan.id);
      }
    } catch (err) {
      setDetailError(err.message || "Failed to cancel challan.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleExportInvoice() {
    if (!selectedChallan) return;
    const printWindow = window.open("", "_blank");
    const itemsHtml = selectedChallan.items.map((i, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${i.product_name_snapshot}</strong><br/>
          <small style="color: #666;">SKU: ${i.product_sku_snapshot}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${i.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(i.price).toLocaleString("en-IN")}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(i.quantity * i.price).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${selectedChallan.challan_number}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .invoice-title { font-size: 24px; font-weight: bold; color: #1e293b; text-align: right; }
          .details-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .bill-to, .invoice-info { font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; }
          .total-box { float: right; width: 300px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .total-grand { font-size: 18px; font-weight: bold; color: #2563eb; border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 5px; }
          .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">MINI ERP + CRM OPERATIONS</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Wholesale & Logistics Distribution Portal</div>
          </div>
          <div>
            <div class="invoice-title">SALES CHALLAN / INVOICE</div>
            <div style="font-size: 14px; color: #64748b; text-align: right;">Status: ${selectedChallan.status.toUpperCase()}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="bill-to">
            <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Billed To / Customer Details</strong><br/>
            <strong style="font-size: 16px; color: #0f172a;">${selectedChallan.customer_name}</strong><br/>
            ${selectedChallan.customer_company ? `Company: ${selectedChallan.customer_company}<br/>` : ''}
            Email: ${selectedChallan.customer_email}<br/>
            ${selectedChallan.customer_phone ? `Phone: ${selectedChallan.customer_phone}<br/>` : ''}
            ${selectedChallan.customer_address ? `Address: ${selectedChallan.customer_address}<br/>` : ''}
          </div>
          <div class="invoice-info" style="text-align: right;">
            <strong>Challan No:</strong> ${selectedChallan.challan_number}<br/>
            <strong>Date:</strong> ${new Date(selectedChallan.created_at).toLocaleDateString()}<br/>
            <strong>Payment Status:</strong> Accounts Verified
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Item & Snapshot SKU</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${parseFloat(selectedChallan.total_amount).toLocaleString("en-IN")}</span>
          </div>
          <div class="total-row">
            <span>Tax (GST Included):</span>
            <span>₹0.00</span>
          </div>
          <div class="total-row total-grand">
            <span>Grand Total:</span>
            <span>₹${parseFloat(selectedChallan.total_amount).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
          Thank you for doing business with Mini ERP Operations Portal.<br/>
          This is an official computer-generated sales challan document.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  }

  function calculateLiveTotal() {
    let total = 0;
    formItems.forEach((item) => {
      if (item.product_id) {
        const prod = productsList.find((p) => p.id === parseInt(item.product_id));
        if (prod) {
          total += prod.price * (parseInt(item.quantity) || 0);
        }
      }
    });
    return total;
  }

  const role = user?.role || "";
  const isWarehouse = role === "Warehouse";
  const isSalesOrAdmin = role === "Admin" || role === "Sales";

  return (
    <div style={{ display: "grid", gridTemplateColumns: selectedChallan ? "1fr 450px" : "1fr", gap: "20px", transition: "all 0.3s ease" }}>
      
      {/* Challans List */}
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Sales Challans Portal</h2>
            <p>Draft, confirm, or cancel bulk sales shipments.</p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <input
              type="text"
              placeholder="Search Challan No / Customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", width: "200px" }}
            />

            {isSalesOrAdmin && (
              <button className="primary" onClick={handleOpenCreate}>
                ➕ Create Challan
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
          <div style={{ padding: "40px", textAlign: "center" }}>Loading sales challans...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Challan Number</th>
                  <th>Customer Name</th>
                  <th>Total Amount</th>
                  <th>Created At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>
                      No sales challans recorded.
                    </td>
                  </tr>
                ) : (
                  challans.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => handleSelectChallan(c.id)}
                      style={{ cursor: "pointer", background: selectedChallanId === c.id ? "#eff6ff" : "transparent" }}
                    >
                      <td style={{ fontWeight: "600", color: "#2563eb" }}>{c.challan_number}</td>
                      <td>
                        <strong>{c.customer_name}</strong>
                        {c.customer_company && <div style={{ fontSize: "10px", color: "#6b7280" }}>{c.customer_company}</div>}
                      </td>
                      <td>₹{parseFloat(c.total_amount).toLocaleString("en-IN")}</td>
                      <td style={{ color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString()}</td>
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

      {/* Detail Drawer Sidebar */}
      {selectedChallan && (
        <div className="panel" style={{ height: "fit-content", position: "sticky", top: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>
                Challan Details
              </h3>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280" }}>{selectedChallan.challan_number}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button 
                onClick={handleExportInvoice}
                style={{ padding: "4px 8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                title="Export / Print Invoice PDF"
              >
                📄 Export PDF
              </button>
              <button 
                onClick={() => { setSelectedChallan(null); setSelectedChallanId(null); }}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div style={{ padding: "30px", textAlign: "center" }}>Loading challan data...</div>
          ) : (
            <div style={{ padding: "20px" }}>
              {detailError && (
                <div className="badge danger" style={{ display: "block", marginBottom: "15px", padding: "10px", whiteSpace: "pre-line", lineHeight: "1.4" }}>
                  {detailError}
                </div>
              )}

              {/* Status Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#9ca3af" }}>STATUS</div>
                  <span className={`badge ${
                    selectedChallan.status === "Confirmed" ? "success" : selectedChallan.status === "Draft" ? "warning" : "danger"
                  }`} style={{ fontSize: "11px", marginTop: "4px" }}>
                    {selectedChallan.status}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "#9ca3af" }}>GRAND TOTAL</div>
                  <span style={{ fontSize: "18px", fontWeight: "bold", color: "#111827" }}>
                    ₹{parseFloat(selectedChallan.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Customer Details */}
              <div style={{ marginBottom: "20px", fontSize: "12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px" }}>
                <strong style={{ fontSize: "13px", color: "#374151" }}>Customer Billing Info</strong>
                <div style={{ marginTop: "6px" }}><strong>Client:</strong> {selectedChallan.customer_name}</div>
                {selectedChallan.customer_company && <div><strong>Company:</strong> {selectedChallan.customer_company}</div>}
                <div><strong>Email:</strong> {selectedChallan.customer_email}</div>
                {selectedChallan.customer_phone && <div><strong>Phone:</strong> {selectedChallan.customer_phone}</div>}
                {selectedChallan.customer_address && <div style={{ marginTop: "4px" }}><strong>Address:</strong> {selectedChallan.customer_address}</div>}
              </div>

              {/* Items Snapshot Table */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>
                  Items List (Snapshot Purchase Details)
                </h4>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ minWidth: "auto", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "8px 12px", fontSize: "9px" }}>Product Snapshot</th>
                        <th style={{ padding: "8px 12px", fontSize: "9px", textAlign: "right" }}>Qty</th>
                        <th style={{ padding: "8px 12px", fontSize: "9px", textAlign: "right" }}>Price</th>
                        <th style={{ padding: "8px 12px", fontSize: "9px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChallan.items && selectedChallan.items.map((item) => (
                        <tr key={item.id}>
                          <td style={{ padding: "8px 12px", fontSize: "11px" }}>
                            <div><strong>{item.product_name_snapshot}</strong></div>
                            <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#6b7280" }}>SKU: {item.product_sku_snapshot}</span>
                            {item.warehouse_location && <div style={{ fontSize: "9px", color: "#b45309" }}>📍 Loc: {item.warehouse_location}</div>}
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: "11px", textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ padding: "8px 12px", fontSize: "11px", textAlign: "right" }}>₹{parseFloat(item.price).toLocaleString("en-IN")}</td>
                          <td style={{ padding: "8px 12px", fontSize: "11px", textAlign: "right", fontWeight: "bold" }}>
                            ₹{(item.quantity * item.price).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Triggers */}
              {!isWarehouse ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedChallan.status === "Draft" && (
                    <>
                      <button 
                        onClick={handleConfirmChallan} 
                        className="primary" 
                        style={{ padding: "12px", fontSize: "12px", fontWeight: "bold", background: "#10b981" }}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Confirming..." : "✓ Confirm Challan (Deduct Inventory)"}
                      </button>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          onClick={handleOpenEdit} 
                          style={{ flex: 1, padding: "10px", fontSize: "11px", background: "white", border: "1px solid #d1d5db", borderRadius: "6px" }}
                          disabled={actionLoading}
                        >
                          ✏️ Edit Items
                        </button>
                        <button 
                          onClick={handleCancelChallan} 
                          style={{ flex: 1, padding: "10px", fontSize: "11px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px" }}
                          disabled={actionLoading}
                        >
                          ✕ Cancel Challan
                        </button>
                      </div>
                    </>
                  )}
                  {selectedChallan.status === "Confirmed" && (
                    <button 
                      onClick={handleCancelChallan} 
                      style={{ padding: "12px", fontSize: "12px", fontWeight: "bold", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px" }}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Cancelling..." : "✕ Cancel Confirmed Challan (Revert Stock)"}
                    </button>
                  )}
                  {selectedChallan.status === "Cancelled" && (
                    <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", textAlign: "center" }}>
                      This challan is cancelled. No further action is possible.
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: "11px", color: "#dc2626", textAlign: "center" }}>
                  Warehouse role is restricted to Read-Only access for Challan confirmation/cancellation.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Challan Modal */}
      {showCreateForm && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: "1000" }}>
          <div className="login-card" style={{ width: "650px", background: "white", borderRadius: "10px", padding: "30px", maxWidth: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
                {formMode === "create" ? "Create Sales Challan" : `Edit Draft Challan: ${selectedChallan.challan_number}`}
              </h3>
              <button onClick={() => setShowCreateForm(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}>✕</button>
            </div>

            {formError && <div className="badge danger" style={{ display: "block", marginBottom: "15px", padding: "10px", textAlign: "center" }}>{formError}</div>}
            {formSuccess && <div className="badge success" style={{ display: "block", marginBottom: "15px", padding: "10px", textAlign: "center" }}>{formSuccess}</div>}

            <form onSubmit={handleChallanSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "5px" }}>Select CRM Customer *</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>Items & Quantities *</label>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "200px", overflowY: "auto", paddingRight: "5px", marginBottom: "10px" }}>
                  {formItems.map((item, index) => {
                    const prod = productsList.find((p) => p.id === parseInt(item.product_id));
                    const unitPrice = prod ? prod.price : 0;
                    const stockText = prod ? `(Stock: ${prod.stock_level})` : "";
                    
                    return (
                      <div key={index} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                          style={{ flex: 2, padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
                          required
                        >
                          <option value="">-- Choose Product --</option>
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ₹{p.price} {p.stock_level <= p.min_stock_level ? "⚠️" : ""}
                            </option>
                          ))}
                        </select>

                        <div style={{ flex: 1 }}>
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
                            min="1"
                            required
                          />
                          {stockText && <span style={{ fontSize: "9px", color: "#6b7280", display: "block", marginTop: "2px" }}>{stockText}</span>}
                        </div>

                        <div style={{ width: "90px", fontSize: "12px", textAlign: "right", fontWeight: "bold" }}>
                          ₹{(unitPrice * (parseInt(item.quantity) || 0)).toLocaleString("en-IN")}
                        </div>

                        <button 
                          type="button" 
                          onClick={() => handleRemoveItemRow(index)}
                          style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "4px", padding: "6px 10px", fontSize: "11px" }}
                          disabled={formItems.length === 1}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button 
                  type="button" 
                  onClick={handleAddItemRow} 
                  style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 12px", fontSize: "11px" }}
                >
                  ➕ Add Item Row
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#f3f4f6", borderRadius: "6px" }}>
                <strong>Estimated Challan Value:</strong>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: "#111827" }}>
                  ₹{calculateLiveTotal().toLocaleString("en-IN")}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" className="primary" style={{ flex: "1", padding: "12px" }} disabled={formSubmitting}>
                  {formSubmitting ? "Saving Draft..." : formMode === "create" ? "Save Draft Challan" : "Update Draft Challan"}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{ flex: "1", padding: "12px", border: "1px solid #d1d5db", background: "white", borderRadius: "6px" }}>
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

export default Challans;
