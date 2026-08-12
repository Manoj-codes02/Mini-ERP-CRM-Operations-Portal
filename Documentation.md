# Mini ERP + CRM Operations Portal

## Project Documentation

---

## 1. Project Overview

**Mini ERP + CRM Operations Portal** is a full-stack web application designed to manage core business operations through a centralized ERP and CRM platform.

The system provides role-based access to business operations such as customer management, product management, stock-related operations, sales challans, dashboard monitoring, and authentication.

The application follows a decoupled full-stack architecture:

* **Frontend:** React.js + Vite
* **Backend:** Node.js + Express.js
* **Database:** MySQL
* **Authentication:** JWT
* **Password Security:** bcrypt
* **Frontend Deployment:** Vercel
* **Backend Deployment:** Render
* **Database:** MySQL cloud/local environment

---

# 2. Project Objectives

The main objectives of the project are:

* Provide a centralized ERP and CRM management platform.
* Implement secure role-based authentication.
* Manage customers and products.
* Manage sales challans and related items.
* Provide dashboard information for business operations.
* Provide REST APIs for frontend-backend communication.
* Maintain persistent relational data using MySQL.
* Deploy the complete application to production.
* Provide a responsive and user-friendly web interface.

---

# 3. Technology Stack

| Layer             | Technology   |
| ----------------- | ------------ |
| Frontend          | React.js     |
| Build Tool        | Vite         |
| Styling           | Vanilla CSS  |
| Backend           | Node.js      |
| API Framework     | Express.js   |
| Database          | MySQL        |
| Authentication    | JWT          |
| Password Hashing  | bcrypt       |
| API Communication | REST API     |
| Frontend Hosting  | Vercel       |
| Backend Hosting   | Render       |
| Containerization  | Docker       |
| Version Control   | Git + GitHub |

---

# 4. System Architecture

The application uses a three-layer architecture.

```text
                    USER
                     |
                     v
        +---------------------------+
        | React + Vite Frontend     |
        | Deployed on Vercel        |
        +-------------+-------------+
                      |
                      | HTTPS / REST API
                      | JWT Authentication
                      v
        +---------------------------+
        | Node.js + Express Backend |
        | Deployed on Render        |
        +-------------+-------------+
                      |
                      | MySQL Connection
                      v
        +---------------------------+
        | MySQL Relational Database |
        +---------------------------+
```

### Architecture Flow

1. User accesses the React frontend.
2. Frontend sends REST API requests to the Express backend.
3. Backend validates authentication and request data.
4. Backend communicates with the MySQL database.
5. Database returns the required data.
6. Backend sends a JSON response to the frontend.
7. Frontend displays the result to the user.

---

# 5. GitHub Repository

**Repository:**

https://github.com/Manoj-codes02/Mini-ERP-CRM-Operations-Portal

The repository contains:

* Frontend source code
* Backend source code
* Database initialization files
* Docker configuration
* README
* Deployment documentation
* Configuration files

The main production branch is:

```text
main
```

---

# 6. Live Application

## 6.1 Frontend Application

**Production Frontend:**

https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app

The frontend is deployed using Vercel.

---

## 6.2 Backend API

**Production Backend:**

https://mini-erp-crm-operations-portal-il2u.onrender.com

The backend is deployed using Render.

---

## 6.3 Backend Health Check

**Health Check:**

https://mini-erp-crm-operations-portal-il2u.onrender.com/api/health

Expected response:

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

---

# 7. User Roles & Test Login

The application contains four predefined operational roles:

| Role          | Username  |
| ------------- | --------- |
| Administrator | admin     |
| Sales         | sales     |
| Warehouse     | warehouse |
| Accounts      | accounts  |

The login page provides demo role login buttons that automatically fill the corresponding credentials.

> Passwords are not included in this public documentation. Use the project-provided test credentials when required for evaluation.

Each role is intended to provide access according to its operational responsibilities.

### Administrator

Responsible for overall system administration and access to major ERP/CRM operations.

### Sales

Responsible for sales-related customer and challan operations.

### Warehouse

Responsible for inventory, products, and warehouse-related operations.

### Accounts

Responsible for account-related business operations.

---

# 8. API Documentation

The backend provides REST APIs grouped by functionality.

## 8.1 Authentication

Base path:

```text
/api/auth
```

Main endpoint:

```text
POST /api/auth/login
```

Purpose:

* Authenticate users.
* Validate username and password.
* Generate JWT authentication token.
* Return authenticated user information.

---

## 8.2 Customer APIs

Base path:

```text
/api/customers
```

Used for:

* Creating customers
* Reading customer information
* Updating customer information
* Deleting customer information
* Managing CRM customer records

---

## 8.3 Product APIs

Base path:

```text
/api/products
```

Used for:

* Product management
* Product information
* Inventory-related operations

---

## 8.4 Challan APIs

Base path:

```text
/api/challans
```

Used for:

* Creating sales challans
* Managing challan information
* Managing challan items

---

## 8.5 Dashboard APIs

Base path:

```text
/api/dashboard
```

Used to provide dashboard-related business information and operational summaries.

---

## 8.6 Health API

Endpoint:

```text
GET /api/health
```

Purpose:

```text
Verify that the backend server is running correctly.
```

---

# 9. API Base URL

Production API base URL:

```text
https://mini-erp-crm-operations-portal-il2u.onrender.com/api
```

Frontend requests are configured to use the production backend through:

```text
VITE_API_BASE_URL
```

---

# 10. Authentication & Security

The application implements several security mechanisms.

## JWT Authentication

JSON Web Tokens are used for authenticated API communication.

Authentication flow:

```text
Username + Password
        |
        v
Backend Authentication
        |
        v
Password Verification
        |
        v
JWT Token Generated
        |
        v
Frontend Stores Authentication State
        |
        v
Authenticated API Requests
```

## Password Security

User passwords are stored using secure password hashing rather than plain-text passwords.

bcrypt is used for password hashing and verification.

## CORS Security

The backend uses an explicit CORS configuration.

Allowed origins include:

* Production Vercel frontend
* Approved Vercel preview deployments
* Localhost development environments

Unauthorized browser origins are rejected.

## Environment Variables

Sensitive information is managed using environment variables.

Examples include:

```text
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
DB_PORT
JWT_SECRET
PORT
VITE_API_BASE_URL
```

Sensitive database credentials and JWT secrets are not intended to be exposed in the frontend source code.

---

# 11. Database Architecture

The application uses a relational MySQL database.

The database initialization process creates the required tables and relationships.

Main database entities include:

```text
users
customers
products
stock_movements
sales_challans
challan_items
```

### Basic Relationship

```text
Users
  |
  +---- Authentication / Roles

Customers
  |
  +---- Sales / Business Operations

Products
  |
  +---- Stock Movements
  |
  +---- Challan Items

Sales Challans
  |
  +---- Challan Items
  |
  +---- Products
```

Foreign-key relationships are used to maintain relational integrity.

---

# 12. Frontend Setup

## Prerequisites

Install:

* Node.js
* npm
* Git
* MySQL

Optional:

* Docker
* Docker Compose

---

## Install Frontend Dependencies

```bash
cd erp-crm-frontend
npm install
```

---

## Run Frontend Locally

```bash
npm run dev
```

The Vite development server will provide a local URL.

---

# 13. Backend Setup

Navigate to the backend directory:

```bash
cd erp-crm-backend
```

Install dependencies:

```bash
npm install
```

Configure the required environment variables.

Start the backend:

```bash
npm start
```

---

# 14. Database Setup

Configure MySQL and create the required database.

Then run the database initialization script:

```bash
cd erp-crm-backend
node src/db/init.js
```

The initialization process creates the required database schema and seed data.

---

# 15. Environment Configuration

## Backend

Create:

```text
erp-crm-backend/.env
```

Required configuration includes:

```text
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=erp_crm
DB_PORT=3306
JWT_SECRET=your_secure_jwt_secret
```

For production, these values must be configured through the Render environment settings rather than committed to GitHub.

---

## Frontend

Create:

```text
erp-crm-frontend/.env
```

Example:

```text
VITE_API_BASE_URL=http://localhost:5000/api
```

For production:

```text
VITE_API_BASE_URL=https://mini-erp-crm-operations-portal-il2u.onrender.com/api
```

---

# 16. Production Deployment

## Frontend — Vercel

The frontend is deployed on Vercel.

Configuration:

```text
Root Directory:
erp-crm-frontend

Framework:
Vite

Build Command:
npm run build

Output Directory:
dist
```

The production frontend is connected to the production Render API.

---

## Backend — Render

The backend is deployed on Render.

Configuration:

```text
Root Directory:
erp-crm-backend
```

The backend can be deployed using Node.js or the provided Docker configuration.

The backend listens on the port provided by the Render environment.

Production startup is verified through the Render logs.

---

# 17. Docker Deployment

A Docker configuration is included for the backend.

Typical Docker build:

```bash
docker build -t mini-erp-crm-backend .
```

Run:

```bash
docker run -p 5000:5000 mini-erp-crm-backend
```

For a complete local environment using Docker Compose:

```bash
docker compose up --build
```

---

# 18. Application Workflow

The overall system workflow is:

```text
User
 |
 v
Login
 |
 v
JWT Authentication
 |
 v
Role Identification
 |
 v
Dashboard
 |
 +---- Customer Management
 |
 +---- Product Management
 |
 +---- Stock Operations
 |
 +---- Challan Management
 |
 +---- Dashboard / Reports
 |
 v
MySQL Database
```

---

# 19. Functional Verification

The production environment has been verified for the following components:

| Component                    | Status      |
| ---------------------------- | ----------- |
| GitHub Repository            | PASS        |
| Frontend Build               | PASS        |
| Vercel Deployment            | PASS        |
| Render Deployment            | PASS        |
| Backend Server               | PASS        |
| MySQL Connection             | PASS        |
| Health Check                 | PASS        |
| CORS Configuration           | PASS        |
| Production API Configuration | PASS        |
| JWT Authentication           | Implemented |
| Role-Based Login             | Implemented |

---

# 20. Production Verification

## Backend

Render deployment logs confirmed:

```text
Server running
MySQL database connected successfully
Your service is live
```

The production health endpoint returns:

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

---

## Frontend

The Vercel production deployment successfully builds the React/Vite application.

The production frontend communicates with the Render backend through:

```text
https://mini-erp-crm-operations-portal-il2u.onrender.com/api
```

---

# 21. Known Limitations

The following limitations should be considered during evaluation:

1. **Render Free Tier Cold Start**

   The free Render instance may spin down after inactivity. The first request after inactivity can therefore take longer than normal.

2. **Cloud Database Dependency**

   Production functionality depends on the availability of the configured MySQL database.

3. **Environment Configuration**

   Production environment variables must be correctly configured in Render and Vercel.

4. **Demo Credentials**

   The four predefined roles are intended for testing and demonstration purposes.

5. **External Hosting Dependency**

   The live application depends on Vercel, Render, and the configured MySQL hosting environment.

---

# 22. Project Structure

```text
Mini-ERP-CRM-Operations-Portal/
│
├── erp-crm-frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── erp-crm-backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── db/
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
│
├── README.md
├── DEPLOYMENT.md
└── docker-compose.yml
```

---

# 23. Submission Requirement Checklist

| Requirement                                 | Status                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| GitHub Repository Link                      | ✅ Completed                                                                       |
| Live Frontend URL                           | ✅ Completed                                                                       |
| Live Backend API URL                        | ✅ Completed                                                                       |
| Test Login Credentials for All Roles        | ✅ Four roles available                                                            |
| API / Postman Documentation                 | ✅ API documentation available; Postman collection should be provided if required |
| README with Setup & Deployment Instructions | ✅ Completed                                                                       |
| Short Architecture Explanation              | ✅ Completed                                                                       |
| Known Limitations / Incomplete Parts        | ✅ Documented                                                                      |

---

# 24. Important Project Links

### GitHub Repository

https://github.com/Manoj-codes02/Mini-ERP-CRM-Operations-Portal

### Live Frontend

https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app

### Live Backend

https://mini-erp-crm-operations-portal-il2u.onrender.com

### Backend Health Check

https://mini-erp-crm-operations-portal-il2u.onrender.com/api/health

---

# 25. Conclusion

The Mini ERP + CRM Operations Portal is implemented as a full-stack ERP and CRM solution using React, Node.js, Express.js, MySQL, JWT authentication, and role-based access.

The application has been configured for production deployment using Vercel for the frontend and Render for the backend. The production backend has verified MySQL connectivity and provides a health-check endpoint for service monitoring.

The project documentation provides the architecture, technology stack, authentication approach, database structure, API organization, setup instructions, deployment configuration, verification results, and known limitations required for project evaluation and submission.
