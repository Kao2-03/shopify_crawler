const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Truy cập Shopify Admin
  const adminUrl = 'https://qiqbgd-as.myshopify.com/admin'; 
  console.log(`Mở: ${adminUrl}`);
  await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 0 });

  console.log('⏳ Hãy đăng nhập thủ công... Bạn có 5 phút...');
  await new Promise(resolve => setTimeout(resolve, 300000));

  // Lưu cookies
  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  console.log('Đã lưu cookies.json');

  await browser.close();
})();
