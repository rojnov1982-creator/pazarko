#!/usr/bin/env node
// Графика для Google Play: значок 512 × 512 и «Графика для описания» 1024 × 500 (BG и EN).
//
//   node store/make-graphics.mjs
//
// Значок — уменьшенный app/assets/icon.png (PNG). Баннер — store/banner.html, снятый Microsoft Edge (или Chrome)
// в headless-режиме и пересохранённый в JPG (Google: JPG или PNG без прозрачности). Нужен `npm install` в app/
// (берётся jimp-compact из зависимостей Expo).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(path.join(root, "app", "package.json"));
const Jimp = require("jimp-compact");

const BROWSERS = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = BROWSERS.find((b) => fs.existsSync(b));
if (!browser) throw new Error("Не найден Edge или Chrome: укажите путь в переменной BROWSER");

// 1) значок 512 × 512
const icon = await Jimp.read(path.join(root, "app/assets/icon.png"));
icon.resize(512, 512, Jimp.RESIZE_BICUBIC);
await icon.writeAsync(path.join(here, "icon-512.png"));
console.log("store/icon-512.png", fs.statSync(path.join(here, "icon-512.png")).size, "байт");

// 2) графика для описания 1024 × 500
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pazarko-store-"));
for (const lang of ["bg", "en"]) {
  const shot = path.join(tmp, `banner-${lang}.png`);
  const url = pathToFileURL(path.join(here, "banner.html")).href + `?lang=${lang}`;
  execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--allow-file-access-from-files",
    `--user-data-dir=${path.join(tmp, "profile")}`,
    "--window-size=1024,500",
    "--virtual-time-budget=2000",
    `--screenshot=${shot}`,
    url,
  ], { stdio: "ignore" });
  const img = await Jimp.read(shot);
  if (img.bitmap.width !== 1024 || img.bitmap.height !== 500)
    img.crop(0, 0, Math.min(1024, img.bitmap.width), Math.min(500, img.bitmap.height));
  if (img.bitmap.width !== 1024 || img.bitmap.height !== 500)
    throw new Error(`Снимок ${img.bitmap.width}×${img.bitmap.height}, нужно 1024×500`);
  const out = path.join(here, `feature-graphic-${lang}.jpg`);
  await img.quality(92).writeAsync(out);
  console.log(`store/feature-graphic-${lang}.jpg`, fs.statSync(out).size, "байт");
}
fs.rmSync(tmp, { recursive: true, force: true });
