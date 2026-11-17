// Скриншоты для Google Play (1080 × 1920): веб-версия приложения в Microsoft Edge без окна, экран 360×640 при плотности 3,
// шрифт Roboto и эмодзи Noto — как на Android. Сначала запустите веб-версию: cd app && npx.cmd expo start --web --port 8099
//   node store/make-screenshots.mjs store/screenshots
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.argv[2];
const BASE = "http://localhost:8099";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
fs.mkdirSync(OUT, { recursive: true });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "pz-shots-"));
const PORT = 9333;
const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.some((t) => t.type === "page")) break; } catch {}
  await sleep(300);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable"); await send("Runtime.enable");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const gcss = async (q) => (await (await fetch("https://fonts.googleapis.com/css2?" + q + "&display=block", { headers: { "user-agent": UA } })).text());
const FONT_CSS = (await gcss("family=Roboto:wght@400;500;700;900")).replace(/font-family: 'Roboto'/g, "font-family: 'PzSans'")
  + (await gcss("family=Noto+Color+Emoji")).replace(/font-family: 'Noto Color Emoji'/g, "font-family: 'PzEmoji'");
const androidLook = async () => {
  await ev(`(() => { const st = document.createElement('style'); st.textContent = ${JSON.stringify(FONT_CSS)} +
    "[dir], div, span, input, textarea { font-family: PzSans, PzEmoji, sans-serif; }"; document.head.append(st);
    // текстовые элементы RN web задают шрифт inline/классом — переопределяем всем, кроме иконочных шрифтов
    for (const el of document.querySelectorAll('div, span, input, textarea')) { const f = getComputedStyle(el).fontFamily; if (!/ionicons|material|feather|fontawesome|monospace|mono/i.test(f)) el.style.setProperty('font-family', 'PzSans, PzEmoji, sans-serif', 'important'); }
    return document.fonts.ready.then(() => true); })()`);
  await sleep(1500);
};
await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
const go = async (p, wait = 6000) => { await send("Page.navigate", { url: BASE + p }); await sleep(wait); };
const shot = async (name) => {
  await androidLook();
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
  const text = await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,260)`);
  console.log(`${name}: ${text}`);
};
// элемент с текстом → клик мышью по его центру (как палец)
const clickText = async (re) => {
  const r = await ev(`(() => { const re = new RegExp(${JSON.stringify(re)});
    const els = [...document.querySelectorAll('div,span,a,button')].filter(e => re.test((e.innerText||'').trim()) && e.offsetParent);
    els.sort((a,b) => (a.innerText.length - b.innerText.length));
    const el = els[0]; if (!el) return null; el.scrollIntoView({block:'center'}); const b = el.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2}; })()`);
  if (!r) throw new Error("не найдено: " + re);
  await sleep(400);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
  await sleep(1200);
};
const scrollBy = async (px) => { await ev(`(() => { const s = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(d).overflowY)); s.sort((a,b)=>b.clientHeight-a.clientHeight); if (s[0]) s[0].scrollTop += ${px}; })()`); await sleep(800); };
const scrollTop = async () => { await ev(`document.querySelectorAll('div').forEach(d => { if (d.scrollTop) d.scrollTop = 0; })`); await sleep(500); };

// чистое состояние: болгарский, София, без вопросов первого запуска
await go("/", 4000);
await ev(`localStorage.clear(); localStorage.setItem('pazarko:v1', JSON.stringify({ v: 1, ekatte: '68134', basket: [{productId:1,qty:2},{productId:6,qty:3},{productId:7,qty:4},{productId:9,qty:1},{productId:12,qty:1},{productId:16,qty:1},{productId:25,qty:0.5},{productId:31,qty:1},{productId:35,qty:1},{productId:42,qty:1},{productId:52,qty:1},{productId:53,qty:1.5},{productId:54,qty:1},{productId:58,qty:1},{productId:61,qty:2},{productId:85,qty:1}], favorites: [], settings: { lang: 'bg', analytics: false, easy: false } }))`);
await go("/", 9000);

await shot("01-oferti");
await scrollBy(1010);
await shot("02-oferti-kartochki");
await go("/result", 7000);
await shot("03-plan");
await go("/basket", 6000);
await shot("04-koshnica");
await go("/favorites", 6000);
await clickText("^напр\\.|^Добави$").catch(() => {});
await ev(`(() => { const i = document.querySelector('input'); if (i) i.focus(); })()`);
await send("Input.insertText", { text: "Луканка Орехите" });
await sleep(500);
await clickText("Добави$");
await sleep(1500);
await shot("05-lyubimi");
await go("/catalog", 6000);
await shot("06-produkti");

ws.close(); edge.kill();
setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(0); }, 1500);
