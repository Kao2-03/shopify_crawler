const puppeteer = require('puppeteer');
const axios = require('axios');

async function crawlNewOrders({
  orders = [],
  existingCustomers = [],
  cookies = [],
  headless = true,
  webhookUrl = null
} = {}) {
  const doneOrders = existingCustomers.map(c => c.orderNumber);
  const newOrders = orders.filter(o => !doneOrders.includes(o.orderNumber));
  if (!newOrders.length) {
    console.log('Không có đơn mới để crawl.');
    return existingCustomers;
  }

  const browser = await puppeteer.launch({ 
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  const page = await browser.newPage();

  try {
    await page.setCookie(...cookies);

    for (const order of newOrders) {
      console.log(`Đang crawl ${order.orderNumber}: ${order.orderUrl}`);
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

        const billingHeading = Array.from(document.querySelectorAll('h3'))
          .find(h => h.innerText.includes('Billing address'));
        let billingAddress = '';
        if (billingHeading) {
          const block = billingHeading.closest('div.Polaris-BlockStack');
          billingAddress = block?.innerText.trim() || '';
        }

        let phone = '';
        const phoneMatch = shippingAddress.match(/(\+\d[\d\s\-().]+)/);
        if (phoneMatch) {
          phone = phoneMatch[0].trim();
        }

        const imageDetails = {};
        document.querySelectorAll('div.Polaris-BlockStack').forEach(block => {
          const links = block.querySelectorAll('a');
          links.forEach(a => {
            if (a.innerText.trim() === 'Link') {
              const labelNode = a.previousSibling || a.parentElement.previousSibling;
              const label = labelNode?.textContent?.trim().replace(':', '') || 'Unknown';
              const href = a.href.trim();
              if (label && href) {
                imageDetails[label] = href;
              }
            }
          });
        });

        return { fullName, email, phone, shippingAddress, billingAddress, imageDetails };
      });

      const result = {
        orderNumber: order.orderNumber,
        orderUrl: order.orderUrl,
        ...customerInfo
      };

      existingCustomers.push(result);
      console.log(`Done ${order.orderNumber}:`, result);

      if (webhookUrl) {
        try {
          await axios.post(webhookUrl, result);
        } catch (err) {
          console.error(`Lỗi khi gửi dữ liệu đến webhook: ${err.message}`);
        }
      }
    }

    return existingCustomers;
  } catch (error) {
    console.error('Lỗi trong quá trình crawl:', error);
    throw error;
  } finally {
    // Đảm bảo trình duyệt luôn được đóng
    await browser.close();
    console.log('Đã đóng trình duyệt.');
  }
}

module.exports = { crawlNewOrders };
