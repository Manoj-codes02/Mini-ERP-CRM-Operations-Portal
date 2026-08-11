import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Sidebar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error loading user in sidebar", e);
    }
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const role = user?.role || "";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        ERP<span>Portal</span>
      </div>

      {user && (
        <div style={{ padding: "0 10px 15px 10px", borderBottom: "1px solid #334155", marginBottom: "15px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Signed in as:</div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", wordBreak: "break-all" }}>
            {user.username}
          </div>
          <div className="badge success" style={{ fontSize: "9px", marginTop: "4px" }}>
            ROLE: {role}
          </div>
        </div>
      )}

      <p className="menu-title">PORTAL NAVIGATION</p>

      <NavLink to="/" end>
        📊 Dashboard
      </NavLink>

      {(role === "Admin" || role === "Sales" || role === "Accounts") && (
        <NavLink to="/customers">👥 Customer CRM</NavLink>
      )}

      <NavLink to="/products">📦 Inventory & Products</NavLink>

      {(role === "Admin" || role === "Warehouse" || role === "Accounts") && (
        <NavLink to="/stock">🔄 Stock Movement Logs</NavLink>
      )}

      <NavLink to="/challans">📜 Sales Challans</NavLink>

      <button className="logout-btn" onClick={logout}>
        🚪 Logout
      </button>
    </aside>
  );
}

export default Sidebar;
