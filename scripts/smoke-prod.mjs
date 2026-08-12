// 本番環境のスモークテスト: ログイン→ダッシュボード表示確認
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "https://fisica-omega.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await page.type('input[name="loginId"]', "coach");
await page.type('input[name="password"]', "demo1234");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }),
  page.click('button[type="submit"]'),
]);
const url = page.url();
const text = await page.evaluate(() => document.querySelector("main")?.innerText.slice(0, 200));
console.log("URL:", url);
console.log("TEXT:", text);
await browser.close();
