/* Independent screenshot-to-recording alignment. IMG_1097 / IMG_8998 first visible measure,
   verified against approved production manifest; not inferred from chosen demo filename. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'), dir=path.join(root,'assets/audio/narration-demo-v142');
const spoken='정전 검전 접지 또는 활선방호 범위를 확인하고 충전부 접근한계거리를 유지해 주세요.';
const source='정전·검전·접지 또는 활선방호 범위를 확인하고 충전부 접근한계거리를 유지한다.';
const provenance=JSON.parse(fs.readFileSync(path.join(dir,'source.json')));
const measure=provenance.samples.find(s=>s.file==='sample-measure.mp3');
assert.equal(measure.sourceText,source,'source matches independently transcribed screenshot');
assert.equal(measure.sourceIndex,1);
assert.equal(measure.text,spoken,'spoken sentence must correspond to first visible measure, not shorter third measure');
assert.equal(measure.voiceId,'m3gJBS8OofDJfycyA2Ip','Taehyung male measure');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,measure.file))).digest('hex'),'28a4fc08801fbbbea8ebe8352eac8a7143aaf6e5ae91100784995ee05e2f86ec','bytes match approved first-measure recording');
assert.equal(provenance.samples.find(s=>s.file==='sample-hazard.mp3').voiceId,'iWLjl1zCuqXRkW6494ve','Jisoo female hazard');
const duration=file=>Number(cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',path.join(dir,file)],{encoding:'utf8'}));
const records=JSON.parse(fs.readFileSync(path.join(dir,'timing.json')));
for(const lang of ['ko','en']) {
 const t=records[lang].voiceDemo;
 assert.ok(Math.abs(t.sampleEnd-t.measureStart-duration(measure.file))<.12,'full first measure duration retained');
 assert.ok(t.sampleStart<t.measureStart&&t.sampleEnd<t.confirmPress&&t.confirmPress<t.end);
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,lang==='ko'?'subtitle-data.js':'subtitle-data.en.js'),'utf8'),ctx);
 const data=Object.values(ctx.window)[0]['02-tbm-basic'];
 const cue=data.find(c=>Math.abs(c.start-t.measureStart)<.01);
 assert.ok(cue,'male caption begins with male audio');
 const text=cue.words.map(w=>w.text).join(' ');
 if(lang==='ko')assert.equal(text,spoken);
 else {assert.match(text,/de.?energ|power|isola/i);assert.match(text,/distance|clearance/i);assert.doesNotMatch(text,/cross.check|phase markings/i);}
 assert.ok(Math.abs(cue.end-t.sampleEnd)<.01,'caption ends with complete sample');
}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.doesNotMatch(app,/안전대책 · 태형\(남성\) · 결선/,'status cannot describe wrong third measure');
console.log('PASS visible first measure ↔ approved spoken text/voice/audio bytes ↔ KO/EN subtitle timings; screenshot text:',source);
