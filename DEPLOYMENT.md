# Deployment Guide: Mini ERP + CRM Operations Portal

This guide provides instructions for deploying and verifying the **Mini ERP + CRM Operations Portal** in both local development and cloud production environments.

---

## 🏗️ Architecture & Deployment Overview

The application is structured as a decoupled full-stack architecture:
1. **Frontend**: A React Single Page Application (SPA) built with Vite, styled with custom Vanilla CSS. Deployed on **Vercel**.
2. **Backend**: A Node.js + Express.js REST API server. Deployed on **Render** (via Docker or Node native runtime).
3. **Database**: A MySQL relational database. In production, this can be hosted on a cloud database provider like Railway or Aiven, and locally via native MySQL or Docker.

```text
  [ React Frontend (Vite) ]  --- CORS Preflight / REST API Requests --->  [ Express Backend API (Node) ]
             |                                                                      |
     Hosted on Vercel                                                         Hosted on Render
             |                                                                      |
             +------------------- (Authentication: JWT) -----------------------------+
                                                                                    |
                                                                           Reads & Writes Data
                                                                                    |
                                                                                    v
                                                                            [ MySQL Database ]
                                                                           Hosted on Railway/Local
```

---

## 🔑 Environment Variables Reference

To ensure secure deployments, credentials must never be hardcoded and must be managed via server-side/build-time environment variables.

### 1. Backend Environment Variables (`erp-crm-backend/.env`)

Create a `.env` file in the `erp-crm-backend` directory or configure these in your Render Dashboard:

| Variable | Description | Example (Local) | Production Source |
| :--- | :--- | :--- | :--- |
| `PORT` | Port number the Express API server listens on | `5000` | Defined by Render |
| `DB_HOST` | Hostname of your MySQL Database | `localhost` | Cloud Database URL (e.g., Railway) |
| `DB_USER` | Database username | `root` | Cloud Username |
| `DB_PASSWORD` | Database password | `yourpassword` | Cloud Password |
| `DB_NAME` | Database schema name | `erp_crm` | Cloud DB Name |
| `DB_PORT` | Port number of your MySQL instance | `3306` | `3306` or Cloud DB Port |
| `JWT_SECRET` | Secret key used for signing JWT login tokens | `supersecret_erp_jwt_key_2026` | Generate a strong random key |

### 2. Frontend Environment Variables (`erp-crm-frontend/.env`)

Configure this variable in your Vercel Project Dashboard:

| Variable | Description | Example (Local) | Production Value |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base API URL of your deployed backend REST API | `http://localhost:5000/api` | `https://mini-erp-crm-operations-portal-i12u.onrender.com/api` |

---

## ⚙️ Step-by-Step Deployment Guide

### A. Database Setup & Initialization
1. Spin up a MySQL instance (locally or on a cloud provider like Railway, AWS RDS, or Aiven).
2. Configure the database credentials in the backend environment.
3. Run the database schema initialization and seed script:
   ```bash
   cd erp-crm-backend
   npm install
   node src/db/init.js
   ```
   *This automatically creates all necessary tables (`users`, `customers`, `products`, `stock_movements`, `sales_challans`, `challan_items`) and seeds default users/products.*

### B. Backend Cloud Deployment (Render)
1. **Create Web Service**: Log in to Render, click **New > Web Service**, and connect your GitHub repository.
2. **Build Settings**:
   - **Root Directory**: `erp-crm-backend`
   - **Runtime**: `Node` (or `Docker` since a `Dockerfile` is provided)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. **Environment Variables**: Add all variables listed in the *Backend Environment Variables* section above.
4. **Health Check**: Set the Health Check Path to `/api/health` to allow Render to monitor the application boot status.

### C. Frontend Cloud Deployment (Vercel)
1. **Create Project**: Log in to Vercel, click **Add New > Project**, and import the repository.
2. **Configure Project**:
   - **Root Directory**: `erp-crm-frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**: Under project settings, add the `VITE_API_BASE_URL` key pointing to your Render backend API base (e.g. `https://<your-backend>.onrender.com/api`).
4. **Deploy**: Click **Deploy**. Vercel will build the frontend and serve it at a unique subdomain.

---

## 🚀 Local Deployment Options

### Option 1: Single Command via Docker Compose (Recommended)
Orchestrates the database, backend, and frontend containers in a single network:
```bash
docker compose up --build
```
- **Frontend App**: `http://localhost/`
- **Backend API**: `http://localhost:5000/api`
- **Database**: Port `3306` inside the container network.

### Option 2: Standard Local Execution
1. **Start Backend**:
   ```bash
   cd erp-crm-backend
   npm install
   node src/db/init.js
   npm start
   ```
2. **Start Frontend**:
   ```bash
   cd erp-crm-frontend
   npm install
   npm run dev
   ```

---

## 📊 Deployment Verification Report

### 1. Primary Verified Links
* **Frontend Web Application URL**: `https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app`
* **Backend Base API URL**: `https://mini-erp-crm-operations-portal-i12u.onrender.com`
* **Backend Health Check Endpoint**: `https://mini-erp-crm-operations-portal-i12u.onrender.com/api/health`

### 2. Functional Modules Integrity & Checklist
- **[PASS] Codebase CORS Security Policy**: Updated backend `server.js` with explicit CORS origin validation allowing `https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app`, localhost/127.0.0.1 development ports, and Vercel preview domains containing hyphenated branch subdomains.
- **[PASS] Session & Secrets Security**: Database passwords, port mapping, and token keys are securely managed via environment variables and never exposed to the public frontend build.
- **[PASS] DB Schema & Seed Configuration**: Verification of database initialization schema confirms relational integrity with cascade options and seed scripts for testing.
- **[PASS] Live Render Backend Service**: Render logs confirm server listening on http://localhost:10000 with active MySQL database connectivity and `/api/health` returning `{"success":true,"message":"Server is healthy"}`.
- **[PASS] Frontend Vercel App Build**: The frontend deployment bundle is successfully built and deployed on Vercel at `https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app` with `VITE_API_BASE_URL` pointing to `https://mini-erp-crm-operations-portal-i12u.onrender.com/api`.
