/* CSS cascade + source-coordinate checks; jsdom does not render webOS pixels. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH);
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const dom=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,''));
const d=dom.window.document,style=d.createElement('style');style.textContent=css;d.head.append(style);
const p=d.getElementById('meetingVoiceDemo'),stage=d.getElementById('tourStage');
const get=e=>dom.window.getComputedStyle(e);
assert.equal(p.querySelector('.meeting-voice-badge'),null,'no label under phone notch');
const photos=[...p.querySelectorAll('img')];assert.equal(photos.length,3);
assert.equal(new Set(photos.map(e=>e.dataset.demoSrc)).size,1,'one exact user photo shared by header/body/footer');
assert.ok(photos[0].dataset.demoSrc.endsWith('narration-long-v141.jpeg'));
assert.equal(p.querySelector('.meeting-voice-idle'),null);assert.equal(p.querySelector('.meeting-voice-playing'),null);
d.querySelector('.guide-phone').classList.add('meeting-demo-active');p.hidden=false;p.dataset.ready='true';stage.dataset.voiceDemo='true';
for(const selector of ['.meeting-focus-layer','.meeting-hand','.meeting-touch-ripple','.meeting-ai-swipe-hand','.meeting-caption']) {
 for(const e of d.querySelectorAll(selector))assert.equal(get(e).visibility,'hidden','old gesture/focus must not leak: '+selector);
}
assert.equal(get(p.querySelector('.meeting-voice-picture')).height,'auto','keep source photo aspect ratio instead of shrinking full long photo');
assert.equal(get(p.querySelector('.meeting-voice-header')).position,'absolute');
assert.equal(get(p.querySelector('.meeting-voice-footer')).bottom,'0px');
assert.equal(get(p.querySelector('.meeting-voice-body')).overflow,'hidden');
const focus=p.querySelector('.meeting-voice-focus'),confirm=p.querySelector('.meeting-voice-confirm-focus');
p.dataset.playing='false';p.dataset.confirming='false';
assert.notEqual(get(focus).visibility,'hidden');assert.equal(get(confirm).display,'none');
p.dataset.playing='true';assert.equal(get(focus).visibility,'hidden','listen highlight disappears at playback');
assert.equal(get(confirm).display,'none','confirm highlight absent throughout spoken demo');
p.dataset.confirming='true';assert.equal(get(confirm).display,'block');
p.hidden=true;assert.equal(get(p).display,'none','all scene overlays disappear on AI transition');
const newCss=css.slice(css.indexOf('/* v141:'));
assert.doesNotMatch(newCss,/\bcqw\b/,'structural layout must work without container query units');
// Ground focus bounds in inspected685x1970 screenshot, not arbitrary full-viewport percentages.
const rule=selector=>{const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return [...newCss.matchAll(new RegExp(escaped+'\\s*\\{([^}]+)\\}','g'))][0][1];};
const lf=rule('.meeting-voice-focus');
assert.match(lf,/left:\s*8\.3%/);assert.match(lf,/63\.94/);assert.match(lf,/width:\s*37\.3%/);assert.match(lf,/11\.4/);
// Actual screenshot button bounds x58..311 y438..517; implementation within3sourcepx.
assert.ok(Math.abs(.083*685-58)<3 && Math.abs(.6394*685-438)<3);
assert.ok(Math.abs(.373*685-(311-58))<3 && Math.abs(.114*685-(517-438))<3);
const cf=rule('.meeting-voice-confirm-focus');assert.match(cf,/left:\s*50\.7%/);assert.match(cf,/11\.1/);assert.match(cf,/14\.5/);
console.log('PASS actual CSS cascade hides old redfocus/gestures, no notchlabel, one aspect-preserved scroll photo, phase-specific highlights, fixed header/footer and screenshot-grounded button geometry');
