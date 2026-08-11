const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function initializeDatabase() {
  const connectionConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: parseInt(process.env.DB_PORT || "3306"),
  };

  console.log("Connecting to MySQL server with config:", {
    host: connectionConfig.host,
    user: connectionConfig.user,
    port: connectionConfig.port,
  });

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log("Connected to MySQL server.");

    const dbName = process.env.DB_NAME || "erp_crm";
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" checked/created.`);

    await connection.query(`USE \`${dbName}\``);
    console.log(`Using database "${dbName}".`);

    // 1. Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin', 'Sales', 'Warehouse', 'Accounts') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Customers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20),
        company VARCHAR(100),
        gst_number VARCHAR(50),
        customer_type ENUM('Retail', 'Wholesale', 'Distributor') NOT NULL DEFAULT 'Wholesale',
        status ENUM('Lead', 'Active', 'Inactive') NOT NULL DEFAULT 'Active',
        follow_up_date DATE,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Follow-up notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS follow_up_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        note TEXT NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 4. Products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sku VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL DEFAULT 'General',
        description TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        stock_level INT NOT NULL DEFAULT 0,
        min_stock_level INT NOT NULL DEFAULT 5,
        warehouse_location VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Add missing columns if table already existed without them
    try {
      await connection.query(`ALTER TABLE customers ADD COLUMN gst_number VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE customers ADD COLUMN customer_type ENUM('Retail', 'Wholesale', 'Distributor') NOT NULL DEFAULT 'Wholesale';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE customers ADD COLUMN status ENUM('Lead', 'Active', 'Inactive') NOT NULL DEFAULT 'Active';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE customers ADD COLUMN follow_up_date DATE;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE products ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'General';`);
    } catch (e) {}

    // 5. Stock movements table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        type ENUM('IN', 'OUT') NOT NULL,
        reference VARCHAR(100),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 6. Sales Challans table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_challans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        status ENUM('Draft', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Draft',
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 7. Challan Items table (with snapshots)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS challan_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        product_name_snapshot VARCHAR(100) NOT NULL,
        product_sku_snapshot VARCHAR(50) NOT NULL,
        FOREIGN KEY (challan_id) REFERENCES sales_challans(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB;
    `);

    // Seed default users
    const roles = ["Admin", "Sales", "Warehouse", "Accounts"];
    for (const role of roles) {
      const username = role.toLowerCase();
      const passwordPlain = `${username}123`;
      const [[userExists]] = await connection.query("SELECT id FROM users WHERE username = ?", [username]);

      if (!userExists) {
        const passwordHash = await bcrypt.hash(passwordPlain, 10);
        await connection.query(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          [username, passwordHash, role]
        );
        console.log(`Seeded user: ${username} (password: ${passwordPlain}, role: ${role})`);
      }
    }

    // Seed test products
    const sampleProducts = [
      { name: "Wireless Mouse", sku: "MS-WRLSS-01", category: "Peripherals", description: "Ergonomic 2.4GHz wireless mouse", price: 15.99, stock: 50, minStock: 10, loc: "Aisle A1" },
      { name: "Mechanical Keyboard", sku: "KB-MECH-02", category: "Peripherals", description: "RGB mechanical keyboard with blue switches", price: 59.99, stock: 20, minStock: 5, loc: "Aisle A2" },
      { name: "27-inch IPS Monitor", sku: "MN-27IPS-03", category: "Displays", description: "Full HD 144Hz IPS display", price: 189.99, stock: 8, minStock: 3, loc: "Shelf B1" },
      { name: "USB-C Hub Multiport", sku: "HB-USBC-04", category: "Accessories", description: "6-in-1 USB-C adapter with HDMI", price: 29.99, stock: 12, minStock: 8, loc: "Shelf B2" },
      { name: "Bluetooth Headphones", sku: "HP-BTNC-05", category: "Audio", description: "Active noise cancelling over-ear headphones", price: 89.99, stock: 2, minStock: 5, loc: "Shelf C1" }
    ];

    for (const prod of sampleProducts) {
      const [[prodExists]] = await connection.query("SELECT id FROM products WHERE sku = ?", [prod.sku]);
      if (!prodExists) {
        const [result] = await connection.query(
          "INSERT INTO products (name, sku, category, description, price, stock_level, min_stock_level, warehouse_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [prod.name, prod.sku, prod.category, prod.description, prod.price, prod.stock, prod.minStock, prod.loc]
        );
        await connection.query(
          "INSERT INTO stock_movements (product_id, quantity, type, reference, created_by) VALUES (?, ?, 'IN', 'Initial Stock Seed', 1)",
          [result.insertId, prod.stock]
        );
        console.log(`Seeded product: ${prod.name} with stock ${prod.stock}`);
      }
    }

    // Seed test customers
    const sampleCustomers = [
      { name: "John Doe", email: "john@example.com", phone: "+15550199", company: "Acme Corp", gst: "27AAAAA0000A1Z5", type: "Wholesale", status: "Active", followUp: "2026-08-20", address: "123 Business Rd, New York, NY" },
      { name: "Jane Smith", email: "jane@smithtech.com", phone: "+15550288", company: "Smith Tech", gst: "07BBBBB1111B1Z2", type: "Distributor", status: "Active", followUp: "2026-08-25", address: "456 Innovation Way, San Francisco, CA" },
      { name: "Robert Johnson", email: "robert@jenterprises.com", phone: "+15550377", company: "Johnson Ent", gst: "", type: "Retail", status: "Lead", followUp: "2026-08-15", address: "789 Enterprise Blvd, Chicago, IL" }
    ];

    for (const cust of sampleCustomers) {
      const [[custExists]] = await connection.query("SELECT id FROM customers WHERE email = ?", [cust.email]);
      if (!custExists) {
        const [result] = await connection.query(
          "INSERT INTO customers (name, email, phone, company, gst_number, customer_type, status, follow_up_date, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [cust.name, cust.email, cust.phone, cust.company, cust.gst, cust.type, cust.status, cust.followUp, cust.address]
        );
        await connection.query(
          "INSERT INTO follow_up_notes (customer_id, note, created_by) VALUES (?, 'Initial customer record created. Spoke to contact person, interested in hardware bulk purchases.', 1)",
          [result.insertId]
        );
        console.log(`Seeded customer: ${cust.name}`);
      }
    }

    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed.");
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
