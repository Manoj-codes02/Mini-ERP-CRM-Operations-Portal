# Full Stack Developer Case Study: Mini ERP + CRM Operations Portal

A complete, full-stack enterprise resource planning (ERP) and customer relationship management (CRM) portal built with **React**, **Node.js + Express.js**, and **MySQL**. Designed for wholesale and logistics distribution companies to manage customers, catalog items, stock movements, and sales challans with transactional stock protections and role-based access control.

---

## 📌 Submission Overview & Links

* **GitHub Repository:** `https://github.com/your-username/mini-erp-crm-portal`
* **Live Frontend Application:** `https://mini-erp-crm-portal.vercel.app`
* **Live Backend REST API:** `https://mini-erp-crm-backend.onrender.com`
* **Postman Collection:** `Postman_Collection.json` (located in project root)

---

## 🔑 Test Login Credentials (All 4 Roles)

| Role | Username | Password | Operational Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full unrestricted read/write access across all CRM, inventory, and challan modules. |
| **Sales** | `sales` | `sales123` | CRM customer profiles, follow-up notes, sales challan drafting, editing, and confirmation. |
| **Warehouse** | `warehouse` | `warehouse123` | Product catalog management, manual stock IN/OUT adjustments, low stock alerts, stock movement logs. |
| **Accounts** | `accounts` | `accounts123` | Financial metrics, challan view, invoice PDF export, transaction audits (Read-Only stock changes). |

---

## 🏗️ Architecture Explanation

The portal follows a 3-tier RESTful Web Application architecture:

```text
  [ React SPA Frontend ]  <--->  [ Express REST API Backend ]  <--->  [ MySQL Database ]
   (Role-Based UI Guards)         (JWT Auth & RBAC Middleware)         (InnoDB Transactions)
```

1. **Frontend Tier (React + Vite)**:
   - Built with component-driven architecture and custom admin UI styles.
   - Dynamic role-based route guards and UI button restrictions based on decoded JWT payload.
   - Live client-side calculation for sales challans and instant PDF invoice generator via browser print driver.

2. **Backend Tier (Node.js + Express.js)**:
   - Modular REST APIs (`/api/auth`, `/api/customers`, `/api/products`, `/api/challans`, `/api/dashboard`).
   - Secure authentication with `bcryptjs` password hashing and `jsonwebtoken`.
   - Strict input validation, standardized HTTP status codes (200, 201, 400, 401, 403, 404, 500), and structured error responses.

3. **Database & Data Integrity Tier (MySQL)**:
   - Relational schema utilizing `InnoDB` engine for ACID transaction support.
   - **Atomic Transactions**: Sales challan confirmations and cancellations wrap product stock checks and updates inside explicit database transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).
   - **Stock Protections**: Pre-update validation prevents stock levels from dropping below zero, throwing structured 400 Bad Request error if stock is insufficient.
   - **Snapshot Data Model**: Items stored inside `challan_items` capture frozen snapshots of product name, SKU, price, and location at the moment of challan creation.

---

## 🌟 Bonus Features Implemented

- [x] **Docker Containerization Setup**:
  - `erp-crm-backend/Dockerfile`: Lightweight Node.js 18 Alpine container setup.
  - `erp-crm-frontend/Dockerfile`: Multi-stage Vite build and Nginx production image.
  - `docker-compose.yml`: Single-command environment orchestration for MySQL database, Backend REST API, and Frontend web server.
- [x] **GitHub Actions CI/CD Deployment**:
  - `.github/workflows/deploy.yml`: Automated testing and Docker container build verification on main push/PR.
- [x] **PDF Invoice Export Engine**:
  - Integrated client-side `handleExportInvoice()` in `Challans.jsx` generating clean, print-ready branded invoice documents for sales challans.
- [x] **AWS S3 Image Upload Ready Structure**:
  - Backend schema includes image URL attributes and S3 integration handlers for product catalog items.

---

## ⚙️ Local Setup & Execution Guide

### Option A: Running via Docker Compose (Recommended)

1. Ensure Docker Desktop is installed and running.
2. From the root directory, run:
   ```bash
   docker compose up --build
   ```
3. Access:
   - **Frontend App**: `http://localhost/`
   - **Backend API**: `http://localhost:5000/api`

---

### Option B: Standard Local Setup

#### 1. MySQL Database Setup
Create a local MySQL database named `erp_crm`:
```sql
CREATE DATABASE erp_crm;
```

#### 2. Backend Setup
Navigate to backend directory and configure `.env`:
```bash
cd erp-crm-backend
npm install
```
Create `.env` file in `erp-crm-backend`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=erp_crm
JWT_SECRET=supersecret_erp_jwt_key_2026
```

Initialize database tables and seed test users:
```bash
node src/db/init.js
npm start
```
*Backend runs on `http://localhost:5000`.*

#### 3. Frontend Setup
Open a new terminal window:
```bash
cd erp-crm-frontend
npm install
npm run dev
```
*Frontend app opens on `http://localhost:5173`.*

---

## 📬 API Documentation & Postman Collection

Import `Postman_Collection.json` into Postman.
- **Base URL**: `http://localhost:5000/api`
- **Authentication Header**: `Authorization: Bearer <jwt_token>`
- **Collection Folders**:
  - `Auth`: Login (`POST /api/auth/login`), Get Profile (`GET /api/auth/me`).
  - `Customers`: List/Search, Create, Update, Get Details, Add CRM Note.
  - `Products`: Catalog List, Create Product, Edit Product, Stock IN/OUT Adjustment Log, Stock Movement History.
  - `Challans`: List Challans, Create Draft, Edit Draft, Get Detail Snapshot, Confirm (Deduct Stock), Cancel (Revert Stock).
  - `Dashboard`: Aggregated Portal Analytics.

---

## ⚠️ Known Limitations & Future Enhancements

1. **AWS S3 Live Storage Bucket Credentials**:
   - S3 upload handlers use fallback local storage paths unless live `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables are supplied in production `.env`.
2. **Real-time Email / SMS Follow-up Alerts**:
   - Scheduled CRM follow-up dates display highlighted badges in the UI; automated automated email notification integration (e.g. via SendGrid / Nodemailer) can be attached in future iterations.
3. **Multi-Warehouse Transfers**:
   - Stock movements support single warehouse location tagging (`warehouse_location`); cross-warehouse automated transfers can be expanded via dedicated transfer manifests.
