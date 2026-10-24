const fs=require('fs'),vm=require('vm');
const base=fs.readFileSync(__dirname+'/tv-playback.test.cjs','utf8').split('(async () => {')[0];
const checks=`
(async()=>{
 const tap=e=>{const target=e.el('tourStage');e.document.dispatchEvent({type:'pointerdown',target,clientX:500,clientY:300});e.document.dispatchEvent({type:'click',target});};
 for(const lang of ['ko','en']){
  const e=environment('?tv=1','Web0S',false,true,lang),m=e.el('demoNarration');
  e.click('weatherDemoPage');await e.tick(500);tap(e);await e.tick(50);
  assert.equal(e.el('demoResume'),null,'resume button replaced, not duplicated');
  const before=m.currentTime,plays=m.playCount,loads=m.loadCount;
  m.deferSeek=true;e.click('demoNextScene');const target=m.seekTarget;
  assert.ok(target>before+.05,'next scene advances to a new visual boundary');
  assert.equal(m.paused,true);assert.equal(m.playCount,plays,'no outgoing audio plays while seek is pending');
  e.click('demoNextScene');assert.equal(m.seekTarget,target,'rapid click while seeking must not queue runaway jumps');
  await e.tick(200);assert.equal(m.paused,true);
  m.finishSeek();await e.tick(100);assert.equal(m.paused,true,'next frame stays paused');
  assert.ok(Math.abs(m.currentTime-target)<.001);assert.equal(m.loadCount,loads,'reuse TV decoder');
  e.click('demoPreviousScene');const back=m.seekTarget;assert.ok(back<target);m.finishSeek();await e.tick(100);
  assert.equal(m.paused,true);tap(e);await e.tick(150);assert.equal(m.paused,false,'anywhere tap resumes');
  assert.ok(m.currentTime>back);
  e.click('meetingDemoPage');m.deferSeek=false; m.finishSeek();await e.tick(100);
  const all=(lang==='ko'?timeline:english.tv).segments;
  const meeting=all.find(x=>x.id==='02-tbm-basic');
  const voice=lang==='en'?english.tracks['02-tbm-basic'].voiceDemo:JSON.parse(fs.readFileSync(path.join(root,'app.js'),'utf8').match(/voiceDemo: (\\{[^}]+\\})/)[1]);
  m._time=meeting.start+voice.start+.5;await e.tick(100);tap(e);
  e.click('demoNextScene');await e.tick(100);
  assert.ok(Math.abs(m.currentTime-(meeting.start+voice.sampleStart))<.001,'next from voice explanation reaches actual sample');
  assert.equal(m.paused,true);assert.match(e.el('meetingVoiceDemo').querySelector('.meeting-voice-status').textContent,/지수/);
  e.click('demoNextScene');await e.tick(100);
  assert.equal(m.dataset.segment,'03-ai-pdf','next from sample reaches AI review');
  assert.equal(e.el('meetingVoiceDemo').hidden,true);assert.equal(m.paused,true);
  const last=(lang==='ko'?timeline:english.tv).segments.at(-1);
  m._time=last.start+1;m.seeking=false;await e.tick(50);
  // Re-enter the closing chapter through the media clock before pausing there.
  tap(e);await e.tick(50);tap(e);await e.tick(50);
  assert.equal(e.el('demoNextScene').disabled,true,'last scene has no next target');
  console.log('PASS '+lang+' next scene/previous scene, paused seek, rapid-click guard, no old sound, same decoder, tap resume and last-scene boundary');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});`;
vm.runInNewContext(base+checks,{require,__dirname,console,process,setImmediate,URLSearchParams},{filename:__filename});
