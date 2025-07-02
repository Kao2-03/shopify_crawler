const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const { crawlNewOrders } = require('./crawl_customers');

const app = express();
app.use(express.json());

app.post('/shopify-webhook', (req, res) => {
  const order = req.body;
  const orderNumber = `#${order.order_number}`;
  const domain = 'qiqbgd-as.myshopify.com';
  const orderUrl = `https://${domain}/admin/orders/${order.id}`;

  console.log(`Đơn mới: ${orderNumber} - ${orderUrl}`);


  console.log(`Crawl đơn này ${orderUrl}`);
  var orders = [];
  orders.push({ orderNumber, orderUrl });
  console.log('orders', orders);
  const existingCustomers = []; // hoặc dữ liệu từ API khác
  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));

  // crawl đơn hàng 
  checking = crawlNewOrders({
    orders: orders, 
    existingCustomers: existingCustomers, 
    cookies: cookies, 
    headless: true, 
    webhookUrl: 'https://n8n.bloommedia.space/webhook/e56662f8-0ffd-43df-8868-85b762928c58'
  });
  if (checking) {
    res.status(200).send('OK');
  } else {
    res.status(400).send('Error');
    console.log('Error', checking);
  }
});

app.listen(3000, () => {
  console.log('🚀 Webhook server chạy tại http://localhost:3000/shopify-webhook');
});
