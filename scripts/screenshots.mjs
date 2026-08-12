// 各ページのスクリーンショットを撮影する開発用スクリプト
// 使い方: node scripts/screenshots.mjs <出力ディレクトリ>
import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const OUT = process.argv[2] ?? "screenshots";
mkdirSync(OUT, { recursive: true });

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});

async function login(page, loginId) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type('input[name="loginId"]', loginId);
  await page.type('input[name="password"]', "demo1234");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function shot(page, url, file, { fullPage = true, wait = 800 } = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, wait)); // グラフ・ゲージのアニメーション待ち
  if (fullPage) {
    // 固定フッターナビはfullPage撮影だとページ中央に写り込むため隠す
    await page.evaluate(() => {
      document.querySelectorAll("nav").forEach((n) => (n.style.display = "none"));
    });
  }
  await page.screenshot({ path: join(OUT, file), fullPage });
  if (fullPage) {
    await page.evaluate(() => {
      document.querySelectorAll("nav").forEach((n) => (n.style.display = ""));
    });
  }
  console.log(`saved: ${file}`);
}

// ログイン画面(スマホサイズ)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await shot(page, "/login", "01-login.png", { fullPage: false });

  // 選手ページ(スマホサイズ)
  await login(page, "sato");
  await shot(page, "/player", "02-player-home.png");
  await shot(page, "/player", "02b-player-home-viewport.png", { fullPage: false }); // ナビ付き1画面
  await shot(page, "/player/record", "03-player-record.png");
  await shot(page, "/player/karte", "04-player-karte-list.png");
  await shot(page, "/player/karte/2026-07", "05-player-karte.png");
  await page.close();
}

// 選手ページ(PCサイズ)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await shot(page, "/login", "10-login-pc.png", { fullPage: false });
  await login(page, "sato");
  await shot(page, "/player", "11-player-home-pc.png");
  await shot(page, "/player/record", "12-player-record-pc.png");
  await shot(page, "/player/karte/2026-07", "13-player-karte-pc.png");
  await page.close();
}

// 監督ページ(PCサイズ)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await login(page, "coach");
  await shot(page, "/coach", "06-coach-dashboard.png");
  // スコアガイドを開いた状態も1枚
  await page.evaluate(() => {
    const d = document.querySelector("details");
    if (d) d.open = true;
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: join(OUT, "07-coach-score-guide.png"), fullPage: true });
  console.log("saved: 07-coach-score-guide.png");

  // 選手詳細(最初の選手リンクを取得)
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/coach/player/"]');
    return a ? a.getAttribute("href") : null;
  });
  if (href) {
    await shot(page, href, "08-coach-player-detail.png");
  }

  // A4カルテ印刷ページ
  const userId = href?.split("/").pop();
  if (userId) {
    await shot(page, `/karte-print/${userId}/2026-07`, "09-karte-print-a4.png");
  }
  await page.close();
}

await browser.close();
console.log("done");
