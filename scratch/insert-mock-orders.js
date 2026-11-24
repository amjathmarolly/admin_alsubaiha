const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const testCustomers = [
    { id: 'cust-1779036875919', email: 'adarsh.pallavali@gmail.com', name: 'Adarsh' },
    { id: 'cust-1779040822139', email: 'adarsh.pallavali2@gmail.com', name: '123 12313' }
  ];

  try {
    // Clear any existing orders just in case
    await connection.query('DELETE FROM order_items');
    await connection.query('DELETE FROM orders');
    console.log("Cleared old orders.");

    for (const customer of testCustomers) {
      const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const shippingAddress = {
        street: "123 Seahorse Boulevard",
        city: "Sharjah",
        state: "Sharjah",
        postal_code: "00000",
        country: "United Arab Emirates",
        name: customer.name,
        phone: "+9717624836648"
      };

      // Insert Order
      await connection.query(
        `INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_email,
          status, payment_status, payment_method, subtotal, discount_amount,
          shipping_amount, tax_amount, total, shipping_address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'shipped', 'paid', 'credit_card', 11700, 0, 0, 0, 11700, ?, NOW(), NOW())`,
        [
          orderId,
          orderNumber,
          customer.id,
          customer.name,
          customer.email,
          JSON.stringify(shippingAddress)
        ]
      );

      // Insert Order Items
      const items = [
        { id: `item-1-${Date.now()}`, name: "Belgian Linen Sofa", quantity: 1, unit_price: 8500 },
        { id: `item-2-${Date.now()}`, name: "Marble Coffee Table", quantity: 1, unit_price: 3200 }
      ];

      for (const item of items) {
        await connection.query(
          `INSERT INTO order_items (
            id, order_id, product_name, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            orderId,
            item.name,
            item.quantity,
            item.unit_price,
            item.unit_price * item.quantity
          ]
        );
      }

      console.log(`Inserted order ${orderNumber} for customer ${customer.email}`);
    }
  } catch (err) {
    console.error("Error inserting mock orders:", err);
  } finally {
    await connection.end();
  }
}

main();
