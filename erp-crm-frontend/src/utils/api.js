const API_BASE_URL = "http://localhost:5000/api";

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle unauthorized or forbidden errors
    if (response.status === 401 || response.status === 403) {
      // If we are not on the login page, clear local storage and redirect
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login?expired=true";
      }
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }
    
    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

export const api = {
  auth: {
    login: (username, password) => 
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: () => request("/auth/me"),
  },
  dashboard: {
    getStats: () => request("/dashboard/stats"),
  },
  customers: {
    list: (search = "", page = 1) => request(`/customers?search=${encodeURIComponent(search)}&page=${page}`),
    get: (id) => request(`/customers/${id}`),
    create: (data) => request("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    addNote: (id, note) => request(`/customers/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  },
  products: {
    list: (search = "", lowStock = false, page = 1) => 
      request(`/products?search=${encodeURIComponent(search)}&lowStock=${lowStock}&page=${page}`),
    get: (id) => request(`/products/${id}`),
    create: (data) => request("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    adjustStock: (id, quantity, type, reference) => request(`/products/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ quantity, type, reference }),
    }),
    movements: (page = 1) => request(`/products/movements?page=${page}`),
  },
  challans: {
    list: (search = "", status = "", page = 1) => 
      request(`/challans?search=${encodeURIComponent(search)}&status=${status}&page=${page}`),
    get: (id) => request(`/challans/${id}`),
    create: (data) => request("/challans", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/challans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    confirm: (id) => request(`/challans/${id}/confirm`, {
      method: "POST",
    }),
    cancel: (id) => request(`/challans/${id}/cancel`, {
      method: "POST",
    }),
  },
};
