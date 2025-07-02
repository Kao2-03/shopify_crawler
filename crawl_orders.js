const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
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

  // Load cookies đăng nhập
  const cookies = JSON.parse(fs.readFileSync('cookies.json'));
  await page.setCookie(...cookies);

  await page.goto('https://qiqbgd-as.myshopify.com/admin/orders', {
    waitUntil: 'networkidle2',
    timeout: 0
  });

  const allOrders = [];

  while (true) {
    await page.waitForSelector('div.Polaris-Table-TableCell__TableCellContent a[href*="/orders/"]');

    //Crawl link orders ở page hiện tại
    const pageOrders = await page.evaluate(() => {
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

    console.log(`Đã crawl ${pageOrders.length} đơn trong trang hiện tại`);
    allOrders.push(...pageOrders);

    // Kiểm tra nút NEXT
    const nextButton = await page.$('button[aria-label="Next"]');
    if (nextButton) {
      const isDisabled = await page.evaluate(el => el.getAttribute('aria-disabled') === 'true', nextButton);
      if (isDisabled) {
        console.log('Đã đến trang cuối. Kết thúc crawl!');
        break;
      }

      console.log('Chuyển sang trang tiếp theo...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        nextButton.click()
      ]);
    } else {
      console.log('Không tìm thấy nút Next, kết thúc crawl!');
      break;
    }
  }

  console.log(`Tổng số đơn crawl được: ${allOrders.length}`);

  // ✅ Merge với orders.json cũ nếu có
  let oldOrders = [];
  if (fs.existsSync('orders.json')) {
    oldOrders = JSON.parse(fs.readFileSync('orders.json'));
  }

  const merged = [
    ...oldOrders,
    ...allOrders.filter(n => !oldOrders.some(o => o.orderNumber === n.orderNumber))
  ];

  fs.writeFileSync('orders.json', JSON.stringify(merged, null, 2));
  console.log(`Đã lưu ${merged.length} orders vào orders.json`);

  await browser.close();
})();
