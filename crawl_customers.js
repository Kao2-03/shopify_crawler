// const puppeteer = require('puppeteer');
// const fs = require('fs');

// (async () => {
//   const orders = JSON.parse(fs.readFileSync('orders.json'));
//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: ['--start-maximized'],
//   });

//   const page = await browser.newPage();

//   // Load cookies
//   const cookies = JSON.parse(fs.readFileSync('cookies.json'));
//   await page.setCookie(...cookies);
//   console.log('✅ Đã load cookies');

//   const results = [];

//   for (const order of orders) {
//     console.log(`👉 Crawling ${order.orderNumber}: ${order.orderUrl}`);

//     await page.goto(order.orderUrl, { waitUntil: 'networkidle2', timeout: 0 });

//     const customerInfo = await page.evaluate(() => {
//       const email = document.querySelector('button.Polaris-Link--removeUnderline')?.innerText.trim() || '';
//       const fullName = document.querySelector('a.Polaris-Link--removeUnderline[href*="/customers/"]')?.innerText.trim() || '';

//       const shippingHeading = Array.from(document.querySelectorAll('h3'))
//         .find(h => h.innerText.includes('Shipping address'));
//       let shippingAddress = '';
//       if (shippingHeading) {
//         const block = shippingHeading.closest('div.Polaris-BlockStack');
//         shippingAddress = block?.innerText.trim() || '';
//       }

//       const billingHeading = Array.from(document.querySelectorAll('h3'))
//         .find(h => h.innerText.includes('Billing address'));
//       let billingAddress = '';
//       if (billingHeading) {
//         const block = billingHeading.closest('div.Polaris-BlockStack');
//         billingAddress = block?.innerText.trim() || '';
//       }

//       let phone = '';
//       const phoneMatch = shippingAddress.match(/(\+\d[\d\s\-().]+)/);
//       if (phoneMatch) {
//         phone = phoneMatch[0].trim();
//       }

//       return { fullName, email, phone, shippingAddress, billingAddress };
//     });

//     results.push({
//       orderNumber: order.orderNumber,
//       orderUrl: order.orderUrl,
//       ...customerInfo
//     });

//     console.log(`✅ Done ${order.orderNumber}:`, customerInfo);
//   }

//   fs.writeFileSync('customers.json', JSON.stringify(results, null, 2));
//   console.log('✅ Đã lưu customers.json');

//   await browser.close();
// })();

const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  const orders = JSON.parse(fs.readFileSync('orders.json'));
  let customers = [];
  if (fs.existsSync('customers.json')) {
    customers = JSON.parse(fs.readFileSync('customers.json'));
  }

  const doneOrders = customers.map(c => c.orderNumber);
  const newOrders = orders.filter(o => !doneOrders.includes(o.orderNumber));

  if (!newOrders.length) {
    console.log('✅ Không có đơn mới để crawl.');
    return;
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync('cookies.json'));
  await page.setCookie(...cookies);

  for (const order of newOrders) {
    console.log(`👉 Đang crawl ${order.orderNumber}: ${order.orderUrl}`);
    await page.goto(order.orderUrl, { waitUntil: 'networkidle2', timeout: 0 });

    const customerInfo = await page.evaluate(() => {
      const email = document.querySelector('button.Polaris-Link--removeUnderline')?.innerText.trim() || '';
      const fullName = document.querySelector('a.Polaris-Link--removeUnderline[href*="/customers/"]')?.innerText.trim() || '';

      const shippingHeading = Array.from(document.querySelectorAll('h3'))
        .find(h => h.innerText.includes('Shipping address'));
      let shippingAddress = '';
      if (shippingHeading) {
        const block = shippingHeading.closest('div.Polaris-BlockStack');
        shippingAddress = block?.innerText.trim() || '';
      }

      let phone = '';
      const phoneMatch = shippingAddress.match(/(\+\d[\d\s\-().]+)/);
      if (phoneMatch) {
        phone = phoneMatch[0].trim();
      }

      return { fullName, email, phone, shippingAddress };
    });

    const result = {
      orderNumber: order.orderNumber,
      orderUrl: order.orderUrl,
      ...customerInfo
    };

    customers.push(result);
    console.log(`✅ Done ${order.orderNumber}:`, result);

    // Gửi dữ liệu sang n8n
    //await axios.post('http://localhost:5678/webhook/new-customer', result);
  }

  fs.writeFileSync('customers.json', JSON.stringify(customers, null, 2));
  console.log('✅ Đã lưu customers.json');

  await browser.close();
})();
