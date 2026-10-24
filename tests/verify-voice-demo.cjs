/* Focused deterministic narration-demo regressions. Not hardware decoding QA. */
const fs = require('fs'), vm = require('vm');
const base = fs.readFileSync(__dirname + '/tv-playback.test.cjs', 'utf8').split('(async () => {')[0];
const checks = `
(async () => {
 const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
 const ko = JSON.parse(app.match(/voiceDemo: (\\{[^}]+\\})/)[1]);
 for (const lang of ['ko','en']) {
  const timing = lang === 'ko' ? ko : english.tracks['02-tbm-basic'].voiceDemo;
  assert.ok(timing.start < timing.sampleStart && timing.sampleStart < timing.measureStart && timing.measureStart < timing.end);
  const e = environment('?tv=1','Web0S',false,true,lang);
  e.click('meetingDemoPage'); await e.tick(100);
  const m=e.el('demoNarration'), p=e.el('meetingVoiceDemo');
  const entry=(lang==='ko'?timeline:english.tv).segments.find(s=>s.id==='02-tbm-basic');
  const advance=async local=>{m._time=entry.start+local;await e.tick(50);};
  await advance(timing.start+.05);
  assert.equal(p.hidden,false); assert.equal(p.dataset.playing,'false');
  assert.match(p.querySelector('.meeting-voice-badge').textContent, /실제/);
  assert.equal(p.dataset.ready,'true');
  assert.match(e.document.querySelector('.voice-explain-label').textContent,lang==='ko'?/실제/:/example/);
  await advance(timing.sampleStart-.35);
  assert.equal(p.dataset.pointing,'true');assert.equal(p.dataset.pressing,'false');
  await advance(timing.sampleStart-.15);
  assert.equal(p.dataset.pressing,'true');
  await advance(timing.sampleStart+.1);
  assert.equal(p.dataset.playing,'true');assert.match(p.querySelector('.meeting-voice-status').textContent,/태형/);
  await advance(timing.measureStart+.1);
  assert.match(p.querySelector('.meeting-voice-status').textContent,/지수/);
  const counts=[m.loadCount,m.seekCount];
  e.document.hidden=true;e.document.dispatchEvent({type:'visibilitychange'});
  const held=m.currentTime;await e.tick(200);assert.equal(m.currentTime,held);
  e.document.hidden=false;e.document.dispatchEvent({type:'visibilitychange'});
  e.click('demoResume');await e.tick(150);
  assert.deepEqual([m.loadCount,m.seekCount],counts,'resume must retain continuous decoder');
  assert.equal(p.hidden,false);
  await advance(timing.end+.1);assert.equal(p.hidden,true,'automatic next chapter clears demo');
  await advance(timing.sampleStart+.1);assert.equal(p.hidden,false,'seek back reconstructs sample scene');
  e.click('supportDemoPage');await e.tick(100);assert.equal(p.hidden,true,'navigation clears overlay');
  e.click('meetingDemoPage');await e.tick(100);assert.equal(p.hidden,true,'meeting restart begins before voice scene');
  const slow=environment('?tv=1','Web0S',false,false,lang);
  slow.click('meetingDemoPage');await slow.tick(100);
  const sm=slow.el('demoNarration'),sp=slow.el('meetingVoiceDemo');
  sm._time=entry.start+timing.sampleStart+.1;await slow.tick(50);
  assert.equal(sp.dataset.ready,'false','unready screenshot must not reveal floating controls');
  const slowTime=sm.currentTime;await slow.tick(100);assert.ok(sm.currentTime>slowTime,'image wait must not freeze media');
  const pic=sp.querySelector('.meeting-voice-playing');pic.complete=true;pic.naturalWidth=640;pic.naturalHeight=1387;pic.dispatchEvent({type:'load'});await slow.tick(50);
  assert.equal(sp.dataset.ready,'true','loaded screenshot must reveal current state');
  console.log('PASS '+lang+' voice-demo phases, role labels, pause/visibility/resume, automatic exit, seek back and menu exit');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});`;
vm.runInNewContext(base + checks, {require, __dirname, console, process, setImmediate, URLSearchParams}, {filename:__filename});
