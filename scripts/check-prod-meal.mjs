// 本番にメニュー/ご飯量フィールドがデプロイされたか確認(最大5分リトライ)
import puppeteer from "puppeteer-core";

const BASE = "https://fisica-omega.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

// ログイン
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await page.type('input[name="loginId"]', "sato");
await page.type('input[name="password"]', "demo1234");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }),
  page.click('button[type="submit"]'),
]);

let found = false;
for (let i = 0; i < 15; i++) {
  await page.goto(`${BASE}/player/record`, { waitUntil: "networkidle0" });
  // 朝食の「食べた」をONにしてメニュー欄が出るか確認
  const hasField = await page.evaluate(() => {
    const ate = document.querySelector('input[name="meal_breakfast_ate"]');
    if (ate && !ate.checked) ate.click();
    return new Promise((r) => setTimeout(() => r(!!document.querySelector('input[name="meal_breakfast_menu"]')), 400));
  });
  if (hasField) {
    found = true;
    break;
  }
  console.log(`attempt ${i + 1}: not deployed yet, waiting 20s...`);
  await new Promise((r) => setTimeout(r, 20000));
}

console.log(found ? "OK: menu/rice fields are live on production" : "NG: fields not found after 5 minutes");
await browser.close();
process.exit(found ? 0 : 1);
