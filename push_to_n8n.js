const fs = require('fs');
const axios = require('axios');

(async () => {
  if (!fs.existsSync('customers.json')) {
    console.log('Không tìm thấy file customers.json');
    return;
  }

  const customers = JSON.parse(fs.readFileSync('customers.json'));

  if (!customers.length) {
    console.log('File customers.json rỗng.');
    return;
  }

  for (const customer of customers) {
    try {
      await axios.post(
        'https://n8n.bloommedia.space/webhook/e56662f8-0ffd-43df-8868-85b762928c58', 
        customer,
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log(`Đã gửi ${customer.orderNumber} sang n8n!`);
    } catch (err) {
      console.error(`Lỗi gửi ${customer.orderNumber}: ${err.message}`);
    }
  }

  console.log('Đã gửi xong toàn bộ đơn hàng sang n8n!');
})();
