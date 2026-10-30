const fs = require('fs'), vm = require('vm');
const assert = require('node:assert/strict'), path = require('path');
for (const search of ['', '?tv=1']) {
 const context = { self: { location: { search }, addEventListener() {} }, URL, URLSearchParams, Map };
 vm.runInNewContext(fs.readFileSync(__dirname + '/../sw.js', 'utf8'), context);
 const images = vm.runInNewContext('ACTIVE_PRECACHE_URLS', context).filter(file => file.includes('02-upload'));
 assert.equal(images.length, 2);
 for (const file of images) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', file)));
  assert.equal(file.endsWith('.webp'), search === '?tv=1');
 }
 console.log('PASS upload offline assets', search || 'standard');
}
const base = fs.readFileSync(__dirname + '/tv-playback.test.cjs', 'utf8').split('(async () => {')[0];
const checks = `
(async () => {
 for (const mode of ['?tv=0', '?tv=1']) for (const lang of ['ko', 'en']) {
  const e = environment(mode, 'Chrome', false, true, lang);
  const safety = e.window.PowerTBMSafety;
  assert.equal(safety.scenes.length, 6);
  assert.equal(safety.videoOffset, 38.037);
  assert.equal(safety.duration, 102.604);
  const before = safety.scenes[1], after = safety.scenes[2];
  assert.equal(after.at, before.at + before.gesture.end);
  for (const key of ['title', 'description', 'points', 'caption', 'label']) assert.deepEqual(after[key], before[key]);
  const image = e.el('safetyScreenshot'), root = e.el('safetyDemo');
  safety.render(10.002, { paused: false, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('02-upload-empty-v148'));
  assert.equal(root.dataset.gesture, 'tapping');
  safety.render(11.201, { paused: true, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('02-upload-empty-v148'));
  safety.render(11.202, { paused: true, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('02-upload-selected-v148'));
  assert.equal(root.querySelector('.safety-hand').hidden, true);
  assert.equal(root.querySelector('.safety-focus').hidden, true);
  assert.equal(image.getAttribute('src').includes('/tv-v100/images/'), mode === '?tv=1');
  safety.render(17.97, { paused: true, mediaClock: true });
  assert.equal(root.dataset.scene, '2');
  safety.render(17.971, { paused: true, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('06-cartoon'));
  safety.render(11.202, { paused: true, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('02-upload-selected-v148'));
  safety.render(8.202, { paused: true, mediaClock: true });
  assert.ok(image.getAttribute('src').includes('02-upload-empty-v148'));
  safety.reset(); assert.equal(root.dataset.scene, '0');
  console.log('PASS upload gesture -> selected files -> cartoon / paused back / reset', mode, lang);
 }
})();`;
vm.runInNewContext(base + checks, { require, __dirname, console, process, URLSearchParams, setTimeout, clearTimeout });
