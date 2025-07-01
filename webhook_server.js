const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/shopify-webhook', (req, res) => {
  const order = req.body;
  const orderNumber = `#${order.order_number}`;
  const domain = 'qiqbgd-as.myshopify.com';
  const orderUrl = `https://${domain}/admin/orders/${order.id}`;

  console.log(`Đơn mới: ${orderNumber} - ${orderUrl}`);

  // Ghi vào orders.json
  let orders = [];
  if (fs.existsSync('orders.json')) {
    orders = JSON.parse(fs.readFileSync('orders.json'));
  }
  if (!orders.some(o => o.orderNumber === orderNumber)) {
    orders.push({ orderNumber, orderUrl });
    fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2));
    console.log(`Đã thêm ${orderNumber} vào orders.json`);
  } else {
    console.log(`⚠️ Đơn đã có trong orders.json`);
  }

  // Gọi Puppeteer crawl đơn này
  exec('node crawl_customers.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Lỗi crawl: ${error.message}`);
      return;
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
  });

  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('🚀 Webhook server chạy tại http://localhost:3000/shopify-webhook');
});
