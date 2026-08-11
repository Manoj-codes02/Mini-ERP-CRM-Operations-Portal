import { useState, useEffect } from "react";
import { api } from "../utils/api";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");

  // Add Customer Form Modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [customerType, setCustomerType] = useState("Wholesale");
  const [status, setStatus] = useState("Active");
  const [followUpDate, setFollowUpDate] = useState("");
  const [address, setAddress] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Customer Form state
  const [isEditing, setIsEditing] = useState(false);

  // Current logged in user info (for role-based UI restriction)
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
    fetchCustomers();
  }, [search, page]);

  async function fetchCustomers() {
    setLoading(true);
    setError("");
    try {
      const result = await api.customers.list(search, page);
      if (result.success) {
        setCustomers(result.customers);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  // Load detailed customer view
  async function fetchCustomerDetails(id) {
    setDetailLoading(true);
    setNoteError("");
    setIsEditing(false);
    try {
      const result = await api.customers.get(id);
      if (result.success) {
        setSelectedCustomer(result.customer);
      }
    } catch (err) {
      alert("Error loading customer details: " + err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSelectCustomer(id) {
    setSelectedCustomerId(id);
    fetchCustomerDetails(id);
  }

  async function handleAddNote(e) {
    e.preventDefault();
    setNoteError("");
    if (!newNote.trim()) {
      setNoteError("Note content cannot be empty.");
      return;
    }

    try {
      const result = await api.customers.addNote(selectedCustomer.id, newNote);
      if (result.success) {
        setNewNote("");
        fetchCustomerDetails(selectedCustomer.id);
      }
    } catch (err) {
      setNoteError(err.message || "Failed to add note.");
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!name.trim() || !email.trim()) {
      setAddError("Name and Email are required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.customers.create({
        name,
        email,
        phone,
        company,
        gst_number: gstNumber,
        customer_type: customerType,
        status,
        follow_up_date: followUpDate,
        address,
      });

      if (result.success) {
        setAddSuccess("Customer added successfully!");
        setName("");
        setEmail("");
        setPhone("");
        setCompany("");
        setGstNumber("");
        setCustomerType("Wholesale");
        setStatus("Active");
        setFollowUpDate("");
        setAddress("");
        fetchCustomers();
        setTimeout(() => {
          setShowAddForm(false);
          setAddSuccess("");
        }, 1500);
      }
    } catch (err) {
      setAddError(err.message || "Failed to add customer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateCustomer(e) {
    e.preventDefault();
    setNoteError("");

    if (!selectedCustomer.name.trim() || !selectedCustomer.email.trim()) {
      setNoteError("Name and Email cannot be empty.");
      return;
    }

    try {
      const result = await api.customers.update(selectedCustomer.id, {
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        company: selectedCustomer.company,
        gst_number: selectedCustomer.gst_number,
        customer_type: selectedCustomer.customer_type,
        status: selectedCustomer.status,
        follow_up_date: selectedCustomer.follow_up_date ? selectedCustomer.follow_up_date.split("T")[0] : null,
        address: selectedCustomer.address,
      });

      if (result.success) {
        setIsEditing(false);
        alert("Customer updated successfully!");
        fetchCustomers();
        fetchCustomerDetails(selectedCustomer.id);
      }
    } catch (err) {
      setNoteError(err.message || "Failed to update customer.");
    }
  }

  const isSalesOrAdmin = user?.role === "Admin" || user?.role === "Sales";

  return (
    <div style={{ display: "grid", gridTemplateColumns: selectedCustomer ? "1fr 420px" : "1fr", gap: "20px", transition: "all 0.3s ease" }}>
      
      {/* List Column */}
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Customer CRM Portal</h2>
            <p>Search, add, and follow up with leads, retail & wholesale clients.</p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search Name, GST, Co..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", width: "200px" }}
            />
            {isSalesOrAdmin && (
              <button className="primary" onClick={() => setShowAddForm(true)}>
                ➕ Add Customer
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
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading customer directory...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Company / GST</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>
                      No customers found. Click "+ Add Customer" to create one.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => handleSelectCustomer(c.id)}
                      style={{ cursor: "pointer", background: selectedCustomerId === c.id ? "#eff6ff" : "transparent" }}
                    >
                      <td style={{ fontWeight: "600", color: "#111827" }}>
                        {c.name}
                        <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "normal" }}>{c.email}</div>
                      </td>
                      <td>
                        {c.company || "—"}
                        {c.gst_number && <div style={{ fontSize: "10px", color: "#4b5563" }}>GST: {c.gst_number}</div>}
                      </td>
                      <td>
                        <span className="badge info">{c.customer_type || "Wholesale"}</span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Active' ? 'success' : c.status === 'Lead' ? 'warning' : 'secondary'}`}>
                          {c.status || "Active"}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: c.follow_up_date ? "#111827" : "#9ca3af" }}>
                        {c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <button 
                          style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", fontSize: "11px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCustomer(c.id);
                          }}
                        >
                          View CRM Profile →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
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

      {/* Customer Detail Sidebar Drawer */}
      {selectedCustomer && (
        <div className="panel" style={{ height: "fit-content", position: "sticky", top: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold" }}>CRM Profile Summary</h3>
            <button 
              onClick={() => { setSelectedCustomer(null); setSelectedCustomerId(null); }}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}
            >
              ✕
            </button>
          </div>

          {detailLoading ? (
            <div style={{ padding: "30px", textAlign: "center" }}>Loading details...</div>
          ) : (
            <div style={{ padding: "20px" }}>
              {isEditing ? (
                // Edit Form Mode
                <form onSubmit={handleUpdateCustomer} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Full Name *</label>
                  <input
                    type="text"
                    value={selectedCustomer.name}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                    required
                  />

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Email *</label>
                  <input
                    type="email"
                    value={selectedCustomer.email}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                    required
                  />

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Phone / Mobile</label>
                  <input
                    type="text"
                    value={selectedCustomer.phone || ""}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Business Name</label>
                  <input
                    type="text"
                    value={selectedCustomer.company || ""}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, company: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>GST Number (Optional)</label>
                  <input
                    type="text"
                    value={selectedCustomer.gst_number || ""}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, gst_number: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Customer Type</label>
                      <select
                        value={selectedCustomer.customer_type || "Wholesale"}
                        onChange={(e) => setSelectedCustomer({ ...selectedCustomer, customer_type: e.target.value })}
                        style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                      >
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Distributor">Distributor</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Status</label>
                      <select
                        value={selectedCustomer.status || "Active"}
                        onChange={(e) => setSelectedCustomer({ ...selectedCustomer, status: e.target.value })}
                        style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                      >
                        <option value="Lead">Lead</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={selectedCustomer.follow_up_date ? selectedCustomer.follow_up_date.split("T")[0] : ""}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, follow_up_date: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />

                  <label style={{ fontSize: "10px", fontWeight: "bold", color: "#374151" }}>Address</label>
                  <textarea
                    value={selectedCustomer.address || ""}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
                    style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px", height: "50px", fontFamily: "inherit" }}
                  />

                  {noteError && <div className="badge danger" style={{ display: "block", textAlign: "center", padding: "5px" }}>{noteError}</div>}

                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button type="submit" className="primary" style={{ flex: 1, padding: "8px" }}>Save Updates</button>
                    <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", background: "white" }}>Cancel</button>
                  </div>
                </form>
              ) : (
                // View Mode
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", color: "#111827", margin: "0" }}>{selectedCustomer.name}</h2>
                      <span className="badge info" style={{ marginTop: "4px", display: "inline-block" }}>{selectedCustomer.customer_type || "Wholesale"}</span>
                      <span className={`badge ${selectedCustomer.status === 'Active' ? 'success' : selectedCustomer.status === 'Lead' ? 'warning' : 'secondary'}`} style={{ marginLeft: "5px" }}>
                        {selectedCustomer.status || "Active"}
                      </span>
                    </div>
                    {isSalesOrAdmin && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", textDecoration: "underline" }}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                  <p style={{ color: "#6b7280", fontSize: "12px", margin: "8px 0 15px 0" }}>🏢 {selectedCustomer.company || "No Company Specified"}</p>

                  <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid #f3f4f6", paddingBottom: "15px", marginBottom: "15px" }}>
                    <div><strong>📧 Email:</strong> {selectedCustomer.email}</div>
                    <div><strong>📞 Phone:</strong> {selectedCustomer.phone || "Not specified"}</div>
                    {selectedCustomer.gst_number && <div><strong>🧾 GST No:</strong> {selectedCustomer.gst_number}</div>}
                    <div><strong>📅 Follow-Up Date:</strong> {selectedCustomer.follow_up_date ? new Date(selectedCustomer.follow_up_date).toLocaleDateString() : "None scheduled"}</div>
                    <div><strong>📍 Address:</strong> {selectedCustomer.address || "Not specified"}</div>
                  </div>

                  {/* Follow-up Notes Section */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: "10px" }}>CRM Interaction & Follow-Up Log</h4>

                    {/* New Note Form */}
                    {isSalesOrAdmin ? (
                      <form onSubmit={handleAddNote} style={{ marginBottom: "20px" }}>
                        <textarea
                          placeholder="Write feedback, requirements or follow-up note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          style={{ width: "100%", height: "70px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", resize: "none", fontSize: "12px", fontFamily: "inherit" }}
                        />
                        {noteError && <div className="badge danger" style={{ display: "block", marginBottom: "8px", padding: "5px" }}>{noteError}</div>}
                        <button type="submit" className="primary" style={{ width: "100%", padding: "8px" }}>
                          Save Follow-Up Note
                        </button>
                      </form>
                    ) : (
                      <p style={{ fontSize: "10px", color: "#ef4444", marginBottom: "15px" }}>Only Sales and Admin roles can add notes.</p>
                    )}

                    {/* Note Timeline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto", paddingRight: "5px" }}>
                      {selectedCustomer.notes && selectedCustomer.notes.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "11px", textAlign: "center", fontStyle: "italic" }}>No prior logs or notes found.</p>
                      ) : (
                        selectedCustomer.notes && selectedCustomer.notes.map((note) => (
                          <div key={note.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px" }}>
                            <p style={{ margin: "0 0 5px 0", fontSize: "11px", color: "#1f2937", lineHeight: "1.4" }}>{note.note}</p>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#9ca3af" }}>
                              <span>By: <strong>{note.created_by_username || "System"}</strong></span>
                              <span>{new Date(note.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Customer Modal Popup */}
      {showAddForm && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: "1000" }}>
          <div className="login-card" style={{ width: "480px", background: "white", borderRadius: "10px", padding: "25px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>Register New Customer</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}>✕</button>
            </div>

            {addError && <div className="badge danger" style={{ display: "block", marginBottom: "15px", padding: "10px", textAlign: "center" }}>{addError}</div>}
            {addSuccess && <div className="badge success" style={{ display: "block", marginBottom: "15px", padding: "10px", textAlign: "center" }}>{addSuccess}</div>}

            <form onSubmit={handleAddCustomer} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Email Address *</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91 9999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Business / Company Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>GST Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="27AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Customer Type</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>Address</label>
                <textarea
                  placeholder="Full physical address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: "100%", height: "50px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", resize: "none", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" className="primary" style={{ flex: "1", padding: "10px" }} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Customer"}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: "1", padding: "10px", border: "1px solid #d1d5db", background: "white", borderRadius: "6px" }}>
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

export default Customers;
