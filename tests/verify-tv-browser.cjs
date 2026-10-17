/* Real Chromium smoke test. This does not substitute for a physical webOS TV.
   Start a static server, then set TBM_TEST_URL and optionally TBM_CHROMIUM_PATH.
   Requires Playwright. Screenshots, if requested, stay outside the source tree. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const base = process.env.TBM_TEST_URL || 'http://127.0.0.1:8138/';
(async () => {
  // Match production byte-range streaming. SimpleHTTPServer ignores Range and
  // Chromium then clamps unbuffered chapter seeks to zero on a cold stream.
  const server = process.env.TBM_TEST_URL ? null : http.createServer((req, res) => {
    const root = path.resolve(__dirname, '..');
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, base).pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    const size = fs.statSync(file).size, range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    const start = range ? Number(range[1]) : 0, end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(range ? 206 : 200, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
  if (server) await new Promise(resolve => server.listen(8138, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TBM_CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [width, height] of [[1920, 1080], [1080, 1920], [820, 1180]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      const page = await context.newPage(), errors = [], mediaRequests = new Set();
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => {
        // These warnings come from this harness: pixel inspection and the
        // deliberately blocked worker. Offline/cache behavior has its own test.
        const harnessWarning = e.text().startsWith('Canvas2D: Multiple readback') || e.text() === 'Service Worker registration blocked by Playwright';
        if (e.type() === 'error' || (e.type() === 'warning' && !harnessWarning)) errors.push(e.text());
      });
      page.on('request', r => { if (/\.(mp4|mp3|m4a)(\?|$)/.test(r.url())) mediaRequests.add(new URL(r.url()).pathname); });
      console.log('CHECK viewport',width,height);
      await page.goto(base + '?tv=1');
      console.log('CHECK page loaded');
      await page.waitForFunction(() => window.PowerTBMTV?.media.readyState >= 2);
      console.log('CHECK media ready');
      await page.evaluate(()=>{window.tvTrace=[];const old=PowerTBMTV.select;PowerTBMTV.select=(s)=>{tvTrace.push(['select',s.id,PowerTBMTV.media.currentTime]);return old(s)};for(const e of ['seeking','seeked','ended','pause','play'])PowerTBMTV.media.addEventListener(e,()=>tvTrace.push([e,PowerTBMTV.media.currentTime,PowerTBMTV.media.duration]));});
      await page.locator('[data-launch-sound="on"]').click();
      await page.waitForFunction(() => document.getElementById('tourStage').dataset.demoPage === 'weather', null, { timeout: 25000 });
      await page.waitForFunction(() => document.getElementById('cinematicBackdrop').classList.contains('tv-background-ready'));
      const pixels = () => page.evaluate(() => {
        const c = document.getElementById('tvBackdrop'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let sum = 0; for (let i = 0; i < d.length; i += 52) sum += d[i] + d[i + 1] + d[i + 2]; return sum;
      });
      const first = await pixels(); await page.waitForTimeout(1100); const second = await pixels();
      assert.ok(first > 10000 && Math.abs(second - first) > 100, 'background must contain changing, non-black video pixels');
      const geometry = () => page.evaluate(() => {
        const a = document.querySelector('.guide-media').getBoundingClientRect();
        const b = document.getElementById('tvPhoneVideo').getBoundingClientRect();
        return [Math.abs(a.width - b.width), Math.abs(a.height - b.height), Math.abs(a.left - b.left), Math.abs(a.top - b.top)];
      });
      await page.locator('#supportDemoPage').click();
      await page.evaluate(() => { const t = window.PowerTBMTVTimeline.segments.find(s => s.id === '04-safety-tools'); window.PowerTBMTV.media.currentTime = t.start + 17; });
      await page.waitForFunction(() => !document.getElementById('tvPhoneVideo').hidden);
      assert.ok((await geometry()).every(n => n < 2), 'phone crop must fit the existing responsive phone');
      await page.locator('#safetyDemoPage').click();
      await page.evaluate(() => { const t = window.PowerTBMTVTimeline.segments.find(s => s.id === '08-safety4cut-example'); window.PowerTBMTV.media.currentTime = t.start + 2; });
      await page.waitForFunction(() => window.PowerTBMTV.media.dataset.surface === 'safety' && !document.getElementById('tvPhoneVideo').hidden, null, {timeout:5000}).catch(async error => {console.log('SAFETY STATE',await page.evaluate(()=>({time:PowerTBMTV.media.currentTime,paused:PowerTBMTV.media.paused,seeking:PowerTBMTV.media.seeking,ready:PowerTBMTV.media.readyState,media:{...PowerTBMTV.media.dataset},stage:{...document.getElementById('tourStage').dataset},hidden:document.getElementById('tvPhoneVideo').hidden,trace:window.tvTrace})),errors);throw error;});
      assert.ok((await geometry()).every(n => n < 2));
      const phonePixels = await page.evaluate(() => {
        const p = document.getElementById('tvPhoneVideo'); return [...p.getContext('2d').getImageData(100, 300, 10, 10).data].filter((_, i) => i % 4 !== 3).reduce((a, b) => a + b, 0);
      });
      assert.ok(phonePixels > 1000, 'foreground must render real decoded video pixels');
      const bg = await pixels(); await page.waitForTimeout(1000); assert.notEqual(await pixels(), bg, 'background must move during safety playback');
      await page.locator('.guide-media').click();
      const held = await page.evaluate(() => window.PowerTBMTV.media.currentTime), heldPixels = await pixels();
      await page.waitForTimeout(700); assert.equal(await page.evaluate(() => window.PowerTBMTV.media.currentTime), held); assert.equal(await pixels(), heldPixels);
      await page.locator('.guide-media').click();
      await page.waitForFunction(time => window.PowerTBMTV.media.currentTime > time + .3, held);
      if (process.env.TBM_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TBM_SCREENSHOTS, `tv-${width}x${height}.png`) });
      assert.deepEqual([...mediaRequests], ['/assets/tv-v116/tour.mp4'], 'only one combined media resource should be requested');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: cold splash/weather, moving background + foreground, pause/resume, single media request, clean console`);
      await context.close();
    }
  } finally { await browser.close(); server?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
