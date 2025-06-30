const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync('cookies.json'));
  await page.setCookie(...cookies);

  await page.goto('https://qiqbgd-as.myshopify.com/admin/orders', {
    waitUntil: 'networkidle2',
    timeout: 0
  });

  await page.waitForSelector('div.Polaris-Table-TableCell__TableCellContent a[href*="/orders/"]');

  const orders = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll(
      'div.Polaris-Table-TableCell__TableCellContent a[href*="/orders/"]'
    ));

    return links.map(link => {
      const orderNumber = link.innerText.trim();
      let orderUrl = link.href || '';
      if (orderUrl.startsWith('/')) {
        orderUrl = `${location.origin}${orderUrl}`;
      }
      return { orderNumber, orderUrl };
    }).filter(o => o.orderNumber && o.orderUrl);
  });

  console.log('✅ Orders:', orders);
  fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2));
  console.log('✅ Đã lưu orders.json');

  await browser.close();
})();
