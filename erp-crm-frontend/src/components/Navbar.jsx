import { useEffect, useState } from "react";

function Navbar() {
  const [user, setUser] = useState({ username: "Guest", role: "Viewer" });
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All Categories");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error reading user data", e);
    }
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="portal-title">
          <span>ERP & CRM Portal</span>
          <span className="portal-tag">BETA</span>
        </div>
        <div className="portal-sub">Wholesale & Distribution Management System</div>
      </div>

      <div className="navbar-search">
        <input
          type="text"
          placeholder="Search Here..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All Categories">All Categories</option>
          <option value="Customers">Customers</option>
          <option value="Products">Products</option>
          <option value="Challans">Challans</option>
        </select>
        <button type="button">Search</button>
      </div>

      <div className="user-badge">
        <div style={{ fontSize: "12px", textAlign: "right" }}>
          <div style={{ fontWeight: "700", color: "#0f172a" }}>{user.username}</div>
          <div style={{ fontSize: "10px", color: "#d9252a", fontWeight: "800", textTransform: "uppercase" }}>
            {user.role}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
