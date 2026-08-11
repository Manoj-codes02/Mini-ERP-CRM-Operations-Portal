import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // If redirect because of expired session
    if (searchParams.get("expired") === "true") {
      setSessionExpired(true);
    }
    // If already logged in, go to home
    if (localStorage.getItem("token")) {
      navigate("/");
    }
  }, [searchParams, navigate]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSessionExpired(false);

    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.login(username, password);
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError(
        err.message ||
          "Connection to server failed. Make sure backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  function fillDemoUser(user, pass) {
    setUsername(user);
    setPassword(pass);
    setError("");
  }

  return (
    <div className="login">
      <div className="login-card" style={{ maxWidth: "420px", width: "100%", boxSizing: "border-box" }}>
        <h1>
          ERP<span>Flow</span>
        </h1>
        <p className="login-subtitle">Mini ERP & CRM Operations Portal</p>

        {sessionExpired && (
          <div
            className="login-alert warning"
            style={{
              display: "block",
              textAlign: "center",
              marginBottom: "15px",
              padding: "10px 14px",
              width: "100%",
              minHeight: "auto",
              boxSizing: "border-box",
              overflowWrap: "break-word",
              wordBreak: "normal",
              whiteSpace: "normal",
              lineHeight: "1.4",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "4px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fde68a",
            }}
          >
            Session expired. Please log in again.
          </div>
        )}

        {error && (
          <div
            className="login-alert danger"
            style={{
              display: "block",
              textAlign: "center",
              marginBottom: "15px",
              padding: "10px 14px",
              width: "100%",
              minHeight: "auto",
              boxSizing: "border-box",
              overflowWrap: "break-word",
              wordBreak: "normal",
              whiteSpace: "normal",
              lineHeight: "1.4",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "4px",
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label>Username</label>
          <input
            type="text"
            placeholder="e.g. admin"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div
          className="demo-logins"
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#f3f6fb",
            borderRadius: "6px",
          }}
        >
          <strong
            style={{
              fontSize: "12px",
              display: "block",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            Demo Role Logins (Click to autofill)
          </strong>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => fillDemoUser("admin", "admin123")}
              style={{
                padding: "8px 6px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#1e293b",
                borderRadius: "4px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("sales", "sales123")}
              style={{
                padding: "8px 6px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#1e293b",
                borderRadius: "4px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("warehouse", "warehouse123")}
              style={{
                padding: "8px 6px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#1e293b",
                borderRadius: "4px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Warehouse
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("accounts", "accounts123")}
              style={{
                padding: "8px 6px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#1e293b",
                borderRadius: "4px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
