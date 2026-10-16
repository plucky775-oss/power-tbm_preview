/* Deterministic controller tests. Media, layout and animation APIs are simulated.
   This is not a webOS decoder/browser or a device performance test. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const {execFileSync} = require('child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const timelineContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'tv-media-timeline.js'), 'utf8'), timelineContext);
const timeline = timelineContext.window.PowerTBMTVTimeline;
const tree = JSON.parse(execFileSync('python3',[path.join(__dirname,'export-dom.py')],{encoding:'utf8'}));
const durations = {'00-opening':8.166667,'01-weather':29.701,'02-tbm-basic':34.3,'03-ai-pdf':40.646,
 '07-safety4cut-intro':38.037,'09-ai-example-v84':64.566667,'04-safety-tools':31.84325,'05-emergency':22,'06-closing':11.5};
function environment(query='?tv=1', ua='Chrome', reduce=false, imagesReady=true) {
 let now=0, nextId=1, writes=0, mediaPlays=0; const raf=new Map(), timers=new Map(), seen=new Set(), errors=[];
 class Events {
  constructor(){this.listeners={};}
  addEventListener(type,fn,opt={}){(this.listeners[type]||=[]).push({fn,once:opt.once});}
  removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(v=>v.fn!==fn);}
  dispatchEvent(event){event.target||=this;event.preventDefault||=()=>{};
   for(const item of [...(this.listeners[event.type]||[])]) {if(item.once)this.removeEventListener(event.type,item.fn);item.fn(event);}return true;}
 }
 class Element extends Events {
  constructor(tag='div',attrs={}) {super();this.tagName=tag.toUpperCase();this.attrs={...attrs};this.children=[];this.parentElement=null;
   this.style={setProperty(k,v){this[k]=v;}};this.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
   this._text='';this.hidden='hidden'in attrs;this.naturalWidth=imagesReady?512:0;this.naturalHeight=imagesReady?910:0;this.complete=imagesReady;
   this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,force)=>{const b=force===undefined?!this.classList.contains(c):force;if(b)this.classList.add(c);else this.classList.remove(c);return b;}};
   this.clientWidth=1000;this.offsetWidth=300;this.scrollHeight=1080;this._animations=null;
  }
  get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
  get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
  get src(){return this.attrs.src||'';}set src(v){this.attrs.src=v;}
  get poster(){return this.attrs.poster||'';}set poster(value){this.attrs.poster=value;}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  append(...nodes){for(let n of nodes){if(typeof n==='string'){const t=new Element('#text');t._text=n;n=t;}n.remove();this.children.push(n);n.parentElement=this;}}
  appendChild(n){this.append(n);return n;}
  remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
  replaceWith(n){const p=this.parentElement,i=p.children.indexOf(this);n.remove();p.children[i]=n;n.parentElement=p;this.parentElement=null;}
  replaceChildren(...ns){this.children.forEach(n=>n.parentElement=null);this.children=[];this._text='';this.append(...ns);}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}set textContent(v){this.replaceChildren();this._text=String(v);}
  get innerHTML(){return this._text;}set innerHTML(v){this._text=v;}
  getBoundingClientRect(){return {left:100,top:100,width:300,height:this.id==='safetyExample'?300:530,right:400,bottom:630};}
  scrollIntoView(){}focus(){}setPointerCapture(){}releasePointerCapture(){}hasPointerCapture(){return false;}
  click(){this.dispatchEvent({type:'click',target:this});}
  matches(s){
   if(s==='*')return true;
   if(s.includes(':not('))return false;
   const tag=s.match(/^[a-z][\w-]*/i);if(tag&&this.tagName!==tag[0].toUpperCase())return false;
   for(const m of s.matchAll(/#([\w-]+)/g))if(this.id!==m[1])return false;
   for(const m of s.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(m[1]))return false;
   for(const m of s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g))if(!(m[1]in this.attrs)||(m[2]!==undefined&&this.attrs[m[1]]!==m[2]))return false;
   return true;
  }
  closest(s){for(let n=this;n;n=n.parentElement)if(s.split(',').some(v=>n.matches(v.trim())))return n;return null;}
  querySelectorAll(s){const out=[];const parts=s.split(',').map(v=>v.trim().split(/\s+(?![^\[]*\])/));
   const walk=n=>{for(const c of n.children){if(parts.some(chain=>{if(!c.matches(chain.at(-1)))return false;let p=c.parentElement;for(let i=chain.length-2;i>=0;i--){while(p&&!p.matches(chain[i]))p=p.parentElement;if(!p)return false;p=p.parentElement;}return true;}))out.push(c);walk(c);}};walk(this);return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  getAnimations(){if(!this._animations)this._animations=Array.from({length:4},(_,i)=>({animationName:'scene-'+i,playState:'running',_t:0,pause(){this.playState='paused';},play(){this.playState='running';},get currentTime(){return this._t;},set currentTime(v){writes++;this._t=v;}}));return this._animations;}
 }
 const mediaSet=new Set();
 class Media extends Element {
  constructor(tag,attrs={}){super(tag,attrs);this.paused=true;this.muted='muted'in attrs;this.ended=false;this._time=0;this.seekCount=0;this.pauseCount=0;this.duration=8;this.volume=1;this.readyState=4;this.seeking=false;this.playCount=0;this.loadCount=0;mediaSet.add(this);}
  get currentTime(){return this._time;}set currentTime(value){this.seekCount++;this._time=value;this.ended=false;}
  get currentSrc(){return this.src;}
  load(){this.loadCount++;this.currentTime=0;this.ended=false;this.paused=true;const key=Object.keys(durations).find(k=>this.src.includes(k));this.duration=this.src===timeline.src?timeline.duration:durations[key]||8;this.dispatchEvent({type:'emptied'});if(!this.preventMetadata)this.dispatchEvent({type:'loadedmetadata'});}
  play(){mediaPlays++;this.playCount++;if(!this.src && !this.querySelector('source'))return Promise.reject(new Error('no source'));this.paused=false;this.ended=false;if(!this.permanentStall)this.stall=false;this.dispatchEvent({type:'play'});return Promise.resolve();}
  pause(){this.pauseCount++;this.paused=true;this.dispatchEvent({type:'pause'});}
 }
 const build=d=>{const n=['audio','video'].includes(d.tag)?new Media(d.tag,d.attrs):new Element(d.tag,d.attrs);n._text=d.text||'';for(const c of d.children||[])n.append(build(c));return n;};
 const document=build(tree);document.documentElement=document.querySelector('html');document.body=document.querySelector('body');document.hidden=false;document.fonts={ready:Promise.resolve()};document.getElementById=id=>document.querySelector('#'+id);
 document.createElement=tag=>['audio','video'].includes(tag)?new Media(tag):new Element(tag);document.createTextNode=text=>{const n=new Element('#text');n._text=text;return n;};
 const window=new Events();const setTimer=(fn,delay,repeat=0)=>{const id=nextId++;timers.set(id,{fn,at:now+delay,repeat});return id;};
 Object.assign(window,{innerWidth:1920,innerHeight:1080,scrollY:0,location:{search:query},matchMedia:()=>({matches:reduce}),requestAnimationFrame:fn=>{const id=nextId++;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),setTimeout:(fn,d=0)=>setTimer(fn,d),clearTimeout:id=>timers.delete(id),setInterval:(fn,d)=>setTimer(fn,d,d),clearInterval:id=>timers.delete(id)});
 const ctx=vm.createContext({window,document,location:window.location,navigator:{userAgent:ua},URLSearchParams,Element,
  performance:{now:()=>now},requestAnimationFrame:window.requestAnimationFrame,cancelAnimationFrame:window.cancelAnimationFrame,
  setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,Image:class extends Element {constructor(){super('img');}},
  ResizeObserver:class{constructor(cb){this.cb=cb;}observe(){}},
  CustomEvent:class{constructor(type,init={}){this.type=type;Object.assign(this,init);}},
  getComputedStyle:()=>({borderRadius:'20px',getPropertyValue:key=>({'--demo-duration':'40s','--meeting-duration':'96s','--support-duration':'50s','--closing-duration':'11.494s'}[key]||'')}),
  localStorage:{getItem(){return null;},setItem(){}},console:{warn:(...v)=>errors.push(v.map(String).join(' ')),log:()=>{}}
 });
 for(const file of ['tv-media-timeline.js','tv-compat.js','safety4cut.js','subtitle-data.js','subtitles.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
 const tick=async(ms,step=50)=>{for(let elapsed=0;elapsed<ms;elapsed+=step){now+=step;
  for(const m of [...mediaSet]){if(!m.parentElement||m.paused||m.ended||m.stall||m.permanentStall||document.hidden)continue;
   if(m.id==='demoNarration')seen.add(m.getAttribute('src'));m._time=Math.min(m.duration,m.currentTime+step/1000);m.dispatchEvent({type:'timeupdate'});
   if(m.currentTime>=m.duration){if(m.loop){m._time=0;continue;}m.ended=true;m.paused=true;m.dispatchEvent({type:'ended'});}}
  for(const[id,t]of[...timers])if(t.at<=now){if(t.repeat)t.at=now+t.repeat;else timers.delete(id);t.fn();}
  const frames=[...raf.values()];raf.clear();for(const fn of frames)fn(now);
  await Promise.resolve();await Promise.resolve();
  if(ctx.window.PowerTBMTV.enabled){
   const playing=[...mediaSet].filter(m=>m.parentElement&&!m.paused&&!m.ended);
   assert.ok(playing.length<=2,'TV may only run narration and one silent background');
   assert.ok(playing.every(m=>m.id==='demoNarration'||(m.id==='tvBackdrop'&&m.muted)), 'unexpected TV media decoder');
  }
 }};
 return {document,window,tick,seen,errors,get writes(){return writes;},get mediaPlays(){return mediaPlays;},el:id=>document.getElementById(id),click:id=>document.getElementById(id).click(),context:ctx};
}

(async () => {
 const test = async (name, fn) => { await fn(); console.log('PASS', name); };
 const tap = e => {
  const target=e.el('tourStage');
  e.document.dispatchEvent({type:'pointerdown',target,clientX:500,clientY:300});
  e.document.dispatchEvent({type:'click',target});
 };
 await test('TV uses one narration player plus at most one muted background through every chapter', async () => {
  const e = environment();
  e.document.querySelector('[data-launch-sound="on"]').click();
  await e.tick(290000);
  assert.equal(e.seen.size, 1, 'the entire tour must share one continuous source');
  assert.equal(e.el('demoNarration').loadCount, 1, 'looping must not reload the file');
  assert.equal(e.el('demoNarration').muted, false);
  assert.equal(e.el('tourStage').dataset.narrationState, 'playing');
  assert.equal(e.errors.length, 0);
  assert.equal(e.el('demoBgm'), null);
  for (const id of ['openingDemoVideo', 'safetyExample', 'goldenRulesVideo', 'launchIntroVideo']) {
   assert.equal(e.el(id).tagName, 'IMG', id + ' must not allocate another decoder');
  }
 });
 await test('TV moving backgrounds switch, loop and pause without restarting the narration', async () => {
  const e=environment(),bg=e.el('tvBackdrop');
  assert.ok(bg,'TV must retain a live background video');
  assert.equal(bg.tagName,'VIDEO');assert.equal(bg.muted,true);assert.equal(bg.loop,true);
  assert.equal(bg.getAttribute('src'),null,'background must not download before starting');
  const expected={weather:'weather-powerlines',meeting:'tablet-review',support:'field-tools',safety:'tablet-review'};
  for(const [page,source] of Object.entries(expected)) {
   e.click(page+'DemoPage');await e.tick(500);
   assert.ok(bg.src.includes(source),page+' selected the wrong background');
   assert.equal(bg.paused,false);assert.ok(bg.currentTime>0);
   const m=e.el('demoNarration'),loads=m.loadCount,play=m.playCount,seek=m.seekCount;
   const loaded=bg.loadCount;
   tap(e);const held=bg.currentTime;await e.tick(500);assert.equal(bg.currentTime,held);
   tap(e);await e.tick(500);assert.ok(bg.currentTime>held);assert.equal(bg.loadCount,loaded);
   assert.equal(m.loadCount,loads);assert.equal(m.seekCount,seek);assert.equal(m.playCount,play+1);
   e.document.hidden=true;e.document.dispatchEvent({type:'visibilitychange'});
   assert.equal(bg.paused,true);e.document.hidden=false;e.document.dispatchEvent({type:'visibilitychange'});
   await e.tick(500);assert.equal(bg.paused,false);
  }
  e.click('supportDemoPage');await e.tick(17000);
  assert.equal(e.el('demoNarration').dataset.surface,'support');assert.equal(bg.paused,false,'Golden Rules must keep the background moving');
  await e.tick(16000);assert.ok(bg.src.includes('emergency-response'));
  e.click('safetyDemoPage');await e.tick(40000);
  assert.equal(e.el('demoNarration').dataset.surface,'safety');assert.equal(bg.paused,false,'4-cut playback must keep the background moving');
  await e.tick(62000);assert.equal(bg.paused,false);assert.equal(e.el('tourStage').dataset.demoPage,'safety');
  await e.tick(1500);assert.ok(bg.src.includes('tbm-guide-closing'));
  await e.tick(8500);assert.equal(bg.paused,false,'short closing background must loop');
 });
 await test('TV background errors and buffering never stop the narration stream', async () => {
  const e=environment();e.click('weatherDemoPage');await e.tick(1000);
  const bg=e.el('tvBackdrop'),m=e.el('demoNarration'),time=m.currentTime,loads=m.loadCount;
  bg.permanentStall=true;await e.tick(1000);assert.ok(m.currentTime>time);assert.equal(m.loadCount,loads);
  bg.error=new Error('background decoder unavailable');bg.dispatchEvent({type:'error'});
  assert.equal(bg.paused,true);assert.equal(e.el('cinematicBackdrop').classList.contains('tv-background-ready'),false);
  const healthy=m.currentTime;await e.tick(1000);assert.ok(m.currentTime>healthy);assert.equal(m.paused,false);
  assert.equal(m.loadCount,loads);assert.notEqual(e.el('tourStage').dataset.narrationState,'error');
 });
 await test('Every automatic voice/chapter change keeps the decoder and audio clock running', async () => {
  const e=environment();e.document.querySelector('[data-launch-sound="on"]').click();await e.tick(1000);
  const m=e.el('demoNarration');
  const counts=()=>[m.loadCount,m.playCount,m.pauseCount,m.seekCount];
  const initial=counts();
  for(const entry of timeline.segments.slice(1)) {
   await e.tick(Math.ceil((entry.start+.2-m.currentTime)*1000));
   assert.equal(m.dataset.segment,entry.id);
   assert.equal(e.el('tourStage').dataset.demoPage,entry.page);
   assert.deepEqual(counts(),initial,'decoder restarted at '+entry.id);
   assert.equal(m.paused,false);
   assert.ok(e.window.PowerTBMTV.localTime(entry)<.4,'subtitle clock must be chapter-local');
  }
 });
 await test('TV media events keep chapter-local captions visible between animation frames', async () => {
  for (const mode of ['karaoke', 'bubble']) {
   const e=environment();e.click('meetingDemoPage');await e.tick(2000);
   const select=e.el('subtitleToggle');select.value=mode;select.dispatchEvent({type:'change'});
   const output=e.el(mode==='bubble'?'subtitleBubble':'subtitleLine'),m=e.el('demoNarration');
   const text=output.textContent,children=[...output.children];
   assert.ok(text,'the meeting cue must be visible before native media events');
   for(const type of ['timeupdate','seeked','loadeddata','pause']) {
    m.dispatchEvent({type});
    assert.equal(output.textContent,text,mode+' cleared or replaced its cue on '+type);
    assert.equal(output.hidden,false,mode+' hid its cue on '+type);
    assert.deepEqual(output.children,children,'unchanged karaoke words must retain their DOM nodes');
   }
   tap(e);await e.tick(500);
   assert.equal(output.textContent,text,'pausing must preserve the current cue without another animation frame');
   // The media event can precede the frame that updates dataset.segment.
   for(const entry of timeline.segments) {
    const cue=e.window.PowerTBMSubtitleData[entry.id][0],local=(cue.start+cue.end)/2;
    m._time=entry.start+local;
    m.dispatchEvent({type:'seeked'});
    assert.equal(output.textContent,cue.words.map(word=>word.text).join(' '),mode+' used a stale chapter at '+entry.id);
   }
   const held=output.textContent;m.seeking=true;m._time=1;m.dispatchEvent({type:'timeupdate'});
   assert.equal(output.textContent,held,'an unfinished seek must not flash a different cue');
   m.seeking=false;
  }
 });
 await test('A chapter selected before metadata waits for its own seek without jumping to opening', async () => {
  const e=environment(),m=e.el('demoNarration');
  m.readyState=0;m.preventMetadata=true;m.permanentStall=true;
  e.click('supportDemoPage');await e.tick(2000);
  assert.equal(e.el('tourStage').dataset.demoPage,'support');
  m.readyState=4;m.dispatchEvent({type:'loadedmetadata'});m.permanentStall=false;
  await e.tick(500);
  assert.equal(m.dataset.segment,'04-safety-tools');
  assert.ok(Math.abs(m.currentTime-timeline.segments[4].start-.5)<.1);
  assert.equal(m.loadCount,1);
 });
 await test('Golden Rules and latest 4-cut use the same stream and complete ending', async () => {
  const e = environment(); e.click('supportDemoPage'); await e.tick(17000);
  assert.equal(e.el('demoNarration').dataset.surface, 'support');
  await e.tick(6000); assert.equal(e.el('demoNarration').dataset.surface, 'audio');
  e.click('safetyDemoPage'); await e.tick(2000);
  assert.equal(e.el('demoNarration').dataset.segment, '07-safety4cut-intro');
  assert.equal(e.el('demoNarration').dataset.surface, 'audio');
  await e.tick(38000);
  assert.equal(e.el('demoNarration').src, timeline.src);
  assert.equal(e.el('demoNarration').dataset.segment, '08-safety4cut-example');
  assert.equal(e.el('demoNarration').dataset.surface, 'safety');
  await e.tick(62000); assert.equal(e.el('tourStage').dataset.demoPage, 'safety');
  await e.tick(1500); assert.equal(e.el('tourStage').dataset.demoPage, 'closing');
 });
 await test('Safety image and highlight reveal together after loading and decoding', async () => {
  for(const query of ['?tv=1','?tv=0']) {
   const e=environment(query,'Chrome',true,false),p=e.el('safetyScreenshot'),r=e.el('safetyDemo');
   const focus=r.querySelector('.safety-focus'),hand=r.querySelector('.safety-hand');
   let finishDecode;
   p.decode=()=>new Promise(resolve=>{finishDecode=resolve;});
   p.complete=false;p.naturalWidth=0;
   e.click('safetyDemoPage');await e.tick(500);
   assert.equal(focus.hidden,true,'yellow focus appeared over an unloaded screenshot');
   assert.equal(hand.hidden,true,'gesture appeared before the screenshot');
   assert.equal(r.classList.contains('safety-image-ready'),false);
   p.complete=true;p.naturalWidth=512;p.naturalHeight=1110;p.dispatchEvent({type:'load'});
   assert.equal(focus.hidden,true,'load must wait for the pending decode');
   finishDecode();await Promise.resolve();
   assert.equal(r.classList.contains('safety-image-ready'),true);
   assert.equal(focus.hidden,false);
   assert.ok(parseFloat(r.querySelector('.safety-screen-canvas').style.height)>0);
   // Scene changes must invalidate an old decode, including a return to the same source.
   p.complete=false;e.window.PowerTBMSafety.render(9,{paused:true});
   assert.equal(focus.hidden,true);
   p.complete=true;p.dispatchEvent({type:'load'});const oldDecode=finishDecode;
   p.complete=false;e.window.PowerTBMSafety.reset();
   oldDecode();await Promise.resolve();
   assert.equal(r.classList.contains('safety-image-ready'),false,'stale decode revealed the next screenshot');
   p.complete=true;p.decode=()=>Promise.reject(new Error('decode failed'));p.dispatchEvent({type:'load'});
   await Promise.resolve();await Promise.resolve();
   assert.equal(focus.hidden,true,'failed decode must not reveal the focus');
   // Older TV engines without decode() still use the real load completion.
   p.decode=undefined;p.dispatchEvent({type:'load'});
   assert.equal(focus.hidden,false);
   p.dispatchEvent({type:'error'});
   assert.equal(focus.hidden,true);
   assert.equal(r.classList.contains('safety-image-ready'),false);
  }
 });
 await test('Only the safety menu is kept ready between chapter selections', async () => {
  for(const query of ['?tv=1','?tv=0']) {
   const e=environment(query,'Chrome',true),p=e.el('safetyScreenshot');
   const first=p.getAttribute('src');
   assert.ok(first?.includes('01-main-menu-v97'),'safety menu should be prepared before the first click');
   assert.equal(first.includes('/tv-v100/images/'),query==='?tv=1');
   e.click('safetyDemoPage');await e.tick(500);
   assert.equal(p.getAttribute('src'),first,'first click must reuse the prepared image');
   assert.equal(e.el('safetyDemo').classList.contains('safety-image-ready'),true,'a cached menu must remain ready');
   e.window.PowerTBMSafety.render(9,{paused:true});
   assert.ok(p.getAttribute('src').includes('02-upload-v75'));
   e.click('weatherDemoPage');await e.tick(500);
   assert.equal(p.getAttribute('src'),first,'leaving safety must release the later scene and prepare the menu');
   assert.ok(e.el('supportDemo').querySelectorAll('img').every(i=>!i.getAttribute('src')));
  }
 });
 await test('A prepared safety image waits for the newly visible phone layout', async () => {
  for(const query of ['?tv=1','?tv=0']) {
   const e=environment(query,'Chrome',true),r=e.el('safetyDemo'),viewport=r.querySelector('.safety-screen-viewport');
   e.click('safetyDemoPage');await e.tick(500);
   const visibleBox=viewport.getBoundingClientRect;
   viewport.getBoundingClientRect=()=>({width:0,height:0});
   e.window.PowerTBMSafety.reset();
   assert.equal(r.classList.contains('safety-image-ready'),false,'do not reveal a cached image in an unfitted canvas');
   assert.equal(r.querySelector('.safety-focus').hidden,true);
   viewport.getBoundingClientRect=visibleBox;
   await e.tick(50);
   assert.equal(r.classList.contains('safety-image-ready'),true,'fit after activation even without ResizeObserver callbacks');
   assert.equal(r.querySelector('.safety-focus').hidden,false);
  }
 });
 await test('TV prepares a full-size Golden Rules surface before its visible window', async () => {
  const e = environment(); e.click('supportDemoPage'); await e.tick(2000);
  const m = e.el('demoNarration');
  assert.equal(m.dataset.surface, 'audio');
  assert.ok(parseFloat(m.style.width) >= 300);
  const geometry = [m.style.left, m.style.top, m.style.width, m.style.height];
  await e.tick(15000);
  assert.equal(m.dataset.surface, 'support');
  assert.deepEqual([m.style.left, m.style.top, m.style.width, m.style.height], geometry);
 });
 await test('Support screenshots reveal their own highlights only after decoding', async () => {
  for(const query of ['?tv=1','?tv=0']) {
   const e=environment(query,'Chrome',true,false),root=e.el('supportDemo');
   e.click('supportDemoPage');await e.tick(500);
   const cases=[
    ['home-safety',['.support-focus-home-safety','.support-hand-safety','.support-ripple-safety']],
    ['safety',['.support-focus-safety-menu','.support-hand-risk','.support-ripple-risk']],
    ['risk',['.support-focus-risk-card','.support-hand-back','.support-ripple-back']],
    ['safety-return',['.support-focus-golden-menu','.support-hand-golden','.support-ripple-golden']],
    ['golden',['.support-focus-golden-video']],
    ['home-tools',['.support-focus-home-tools','.support-hand-tools','.support-ripple-tools']],
    ['tools',['.support-focus-tool-notice','.support-focus-tool-voice','.support-focus-tool-street','.support-focus-tool-emergency','.support-focus-tool-contact','.support-hand-emergency','.support-ripple-emergency']],
    ['emergency',['.support-focus-emergency-nearby','.support-focus-emergency-nav','.support-focus-emergency-call','.support-focus-emergency-119']],
    ['location',['.support-focus-location-consent']]
   ];
   for(const[name,selectors]of cases) {
    const picture=root.querySelector('.support-slide-'+name),views=[picture,...selectors.map(s=>root.querySelector(s))];
    let finish;picture.decode=()=>new Promise(resolve=>{finish=resolve;});
    assert.ok(picture.dataset.demoImage,'missing readiness group for '+name);
    assert.ok(views.every(v=>v.dataset.demoImage===picture.dataset.demoImage),'highlight must be tied to its own screenshot: '+name);
    assert.ok(views.every(v=>!v.classList.contains('demo-image-ready')));
    picture.complete=true;picture.naturalWidth=640;picture.dispatchEvent({type:'load'});
    assert.ok(views.every(v=>!v.classList.contains('demo-image-ready')),'load must wait for decode: '+name);
    finish();await Promise.resolve();
    assert.ok(views.every(v=>v.classList.contains('demo-image-ready')),'image and overlays must reveal together: '+name);
    picture.dispatchEvent({type:'error'});
    assert.ok(views.every(v=>!v.classList.contains('demo-image-ready')),'failed image must hide its overlays');
   }
   const picture=root.querySelector('.support-slide-risk'),focus=root.querySelector('.support-focus-risk-card');
   let oldDecode;picture.decode=()=>new Promise(resolve=>{oldDecode=resolve;});picture.dispatchEvent({type:'load'});
   e.click('weatherDemoPage');await e.tick(500);
   assert.equal(picture.getAttribute('src'),null,'inactive risk screenshot must be released');
   picture.complete=false;e.click('supportDemoPage');await e.tick(500);
   picture.complete=true;oldDecode();await Promise.resolve();
   assert.equal(focus.classList.contains('demo-image-ready'),false,'old decode must not reveal a reattached source');
   picture.decode=()=>Promise.reject(new Error('decode failed'));picture.dispatchEvent({type:'load'});
   await Promise.resolve();await Promise.resolve();assert.equal(focus.classList.contains('demo-image-ready'),false);
   picture.decode=undefined;picture.dispatchEvent({type:'load'});
   assert.equal(focus.classList.contains('demo-image-ready'),true,'older engines still reveal after a real load');
  }
 });
 await test('Meeting preloads only the first two support screenshots before the automatic boundary', async () => {
  const e=environment(),support=e.el('supportDemo').querySelectorAll('img');
  assert.ok(support.every(p=>!p.getAttribute('src')));
  e.click('meetingDemoPage');await e.tick(1000);
  const prepared=support.filter(p=>p.getAttribute('src'));
  assert.equal(prepared.length,2,'prepare home and safety guide without loading the whole next chapter');
  assert.ok(prepared.every(p=>p.classList.contains('demo-image-ready')));
  const m=e.el('demoNarration'),counts=[m.loadCount,m.playCount,m.pauseCount,m.seekCount];
  const start=timeline.segments.find(s=>s.page==='support').start;
  await e.tick(Math.ceil((start+.2-m.currentTime)*1000));
  assert.equal(e.el('tourStage').dataset.demoPage,'support');
  assert.ok(prepared.every(p=>p.classList.contains('demo-image-ready')),'ready images must stay ready across activation');
  assert.deepEqual([m.loadCount,m.playCount,m.pauseCount,m.seekCount],counts,'preparation must not interrupt continuous audio/video');
 });
 await test('Central tap, drag guard, continuous menu playback, mute and both subtitle modes', async () => {
  const e = environment(); e.click('weatherDemoPage'); await e.tick(1000);
  const target = e.el('tourStage');
  const tap = () => { e.document.dispatchEvent({type:'pointerdown',target,clientX:500,clientY:300}); e.document.dispatchEvent({type:'click',target}); };
  tap(); const time = e.el('demoNarration').currentTime; await e.tick(9000);
  assert.equal(e.el('demoNarration').currentTime, time);
  tap(); await e.tick(1000); assert.ok(e.el('demoNarration').currentTime > time);
  e.document.dispatchEvent({type:'pointerdown',target,clientX:500,clientY:300});
  e.document.dispatchEvent({type:'pointermove',target,clientX:580,clientY:300});
  e.document.dispatchEvent({type:'click',target}); assert.equal(e.el('demoNarration').paused, false);
  e.click('demoMute'); assert.equal(e.el('demoNarration').muted, true);
  e.click('demoMute'); assert.equal(e.el('demoNarration').muted, false);
  const select=e.el('subtitleToggle'); select.value='bubble'; select.dispatchEvent({type:'change'});
  assert.equal(e.el('narrationSubtitles').hidden, true);
  await e.tick(2000); assert.equal(e.el('subtitleBubble').hidden, false);
  select.value='karaoke'; select.dispatchEvent({type:'change'});
  assert.equal(e.el('narrationSubtitles').hidden, false);
  await e.tick(30000); assert.equal(e.el('tourStage').dataset.demoPage, 'meeting');
 });
 await test('Hidden and deliberately paused media stays paused; temporary stalls recover', async () => {
  const e = environment(); e.click('meetingDemoPage'); await e.tick(1000);
  const m=e.el('demoNarration'); e.document.hidden=true; e.document.dispatchEvent({type:'visibilitychange'});
  const time=m.currentTime; await e.tick(10000); assert.equal(m.currentTime,time);
  e.document.hidden=false; e.document.dispatchEvent({type:'visibilitychange'}); await e.tick(500); assert.ok(m.currentTime>time);
  m.paused=true; const plays=m.playCount; await e.tick(10000); assert.ok(m.playCount>plays); assert.equal(m.paused,false);
  tap(e); const paused=m.playCount; await e.tick(15000); assert.equal(m.playCount,paused); assert.equal(m.paused,true);
 });
 await test('Slow buffering keeps the current request and resumes without resetting the chapter', async () => {
  const e=environment();e.click('weatherDemoPage');await e.tick(2000);
  const m=e.el('demoNarration'), loads=m.loadCount, time=m.currentTime, plays=m.playCount;
  m.permanentStall=true;m.readyState=2;await e.tick(40000);
  assert.equal(m.loadCount,loads,'buffering must not abort and reload the download');
  assert.equal(m.playCount,plays,'do not pile play promises onto a buffering request');
  assert.equal(m.currentTime,time);assert.equal(e.el('tourStage').dataset.demoPage,'weather');
  assert.notEqual(e.el('tourStage').dataset.narrationState,'error');
  m.permanentStall=false;m.readyState=4;await e.tick(1000);assert.ok(m.currentTime>time);
 });
 await test('TV limits images to the active chapter and its two prepared entry screens', async () => {
  const e=environment();
  const meeting=e.el('meetingDemo').querySelectorAll('img'), support=e.el('supportDemo').querySelectorAll('img');
  assert.ok(meeting.every(i=>!i.getAttribute('src')),'inactive meeting images loaded on launch');
  e.click('meetingDemoPage');await e.tick(500);
  assert.ok(meeting.every(i=>i.getAttribute('src')?.includes('/tv-v100/images/')));
  assert.equal(support.filter(i=>i.getAttribute('src')).length,2);
  assert.ok(support.every(i=>i.dataset.demoPreload==='meeting'||!i.getAttribute('src')),'later support scenes must stay unloaded during the meeting');
  e.click('supportDemoPage');await e.tick(500);
  assert.ok(meeting.every(i=>!i.getAttribute('src')));
  assert.ok(support.every(i=>i.getAttribute('src')));
 });
 await test('All active TV images exist and stay below a 90 MiB decoded-pixel budget', async () => {
  const sizes=JSON.parse(execFileSync('python3',['-c',
   "from pathlib import Path\nfrom PIL import Image\nimport json\nsizes={}\nfor p in Path('assets').rglob('*'):\n if p.suffix.lower() in ('.png','.jpg','.jpeg','.webp'):\n  with Image.open(p) as i: sizes[str(p)]=i.width*i.height*4\nprint(json.dumps(sizes))"
  ],{cwd:root,encoding:'utf8'}));
  const e=environment();let maximum=0;
  for(const page of ['weather','meeting','support','safety']) {
   e.click(page+'DemoPage');await e.tick(500);
   let bytes=0;
   for(const image of e.document.querySelectorAll('img')) {
    const source=image.getAttribute('src');if(!source)continue;
    assert.ok(sizes[source], 'missing or invalid image: '+source);bytes+=sizes[source];
   }
   maximum=Math.max(maximum,bytes);assert.ok(bytes<90*1024*1024,page+' image pixel budget exceeded');
  }
  console.log('  Maximum active image pixels:',(maximum/1048576).toFixed(1),'MiB RGBA (not a heap measurement)');
 });
 await test('TV limits scene updates to 20Hz and stops writes while paused', async () => {
  const e=environment();e.click('weatherDemoPage');await e.tick(1000);let before=e.writes;await e.tick(1000,10);
  assert.ok(e.writes-before<=16*21);tap(e);before=e.writes;await e.tick(1000);assert.equal(e.writes,before);
 });
 await test('TV hands and touch effects follow every display frame while scene work stays at 20Hz', async () => {
  for(const page of ['weather','meeting','support']) {
   const e=environment();
   const animation=name=>({animationName:name,values:[],_time:0,pause(){},play(){},
    get currentTime(){return this._time;},set currentTime(t){this._time=t;this.values.push(t);}});
   const hand=animation(page+'-hand'),ripple=animation(page+'-ripple'),scene=animation(page+'-scene');
   e.el(page+'Demo')._animations=[hand,ripple,scene];
   e.click(page+'DemoPage');await e.tick(1000);
   const m=e.el('demoNarration'),counts=[m.loadCount,m.playCount,m.pauseCount,m.seekCount];
   hand.values=[];ripple.values=[];scene.values=[];
   await e.tick(1008,16);
   assert.ok(hand.values.length>=60,page+' hand is still limited by the 50ms scene clock');
   assert.deepEqual(ripple.values,hand.values,'touch effects must follow the same clock as the hand');
   assert.ok(scene.values.length<=21,'smoothing a hand must not increase full scene work');
   assert.ok(hand.values.every((t,i)=>!i||t>hand.values[i-1]),'hand time must advance continuously');
   assert.deepEqual([m.loadCount,m.playCount,m.pauseCount,m.seekCount],counts,'gestures must not restart media');
   m.stall=true;const held=hand.currentTime;await e.tick(160,16);
   assert.equal(hand.currentTime,held,'gesture must wait when the audio clock stalls');
   m.seeking=true;m._time+=1;await e.tick(32,16);
   assert.equal(hand.currentTime,held,'unfinished seeks must not move the hand');
   m.seeking=false;m.stall=false;
   tap(e);const writes=hand.values.length;await e.tick(160,16);assert.equal(hand.values.length,writes);
   tap(e);await e.tick(160,16);assert.ok(hand.values.length>writes,'resume must restart the gesture clock');
   e.document.hidden=true;e.document.dispatchEvent({type:'visibilitychange'});
   const hidden=hand.values.length;await e.tick(160,16);assert.equal(hand.values.length,hidden);
  }
 });
 await test('TV safety hand moves on intermediate frames without moving ahead of its screenshot', async () => {
  const e=environment();e.click('safetyDemoPage');await e.tick(4300);
  const r=e.el('safetyDemo'),hand=r.querySelector('.safety-hand'),positions=[];
  for(let i=0;i<12;i++) {await e.tick(16,16);positions.push([hand.style.left,hand.style.top,hand.style.transform].join('|'));}
  assert.equal(new Set(positions).size,12,'safety hand is still moving in 50ms steps');
  assert.equal(hand.style.left,'0px');assert.equal(hand.style.top,'0px');
  assert.match(hand.style.transform,/translate3d\(/,'TV hand travel should avoid per-frame layout changes');
  tap(e);const held=hand.style.transform;await e.tick(160,16);assert.equal(hand.style.transform,held);
  // A lightweight gesture update must never show the next gesture over the previous image.
  e.window.PowerTBMSafety.renderGestureAt(8.3);
  assert.equal(hand.style.transform,held);assert.equal(r.dataset.scene,'0');
 });
 await test('TV detection, forced opt-out and normal browser retain their players', async () => {
  for (const [q,ua,on] of [['','Mozilla/5.0 (Web0S; Linux/SmartTV)',true],['?tv=0','Web0S',false],['?tv=1&frame=intro','Web0S',false],['','Chrome',false]]) {
   const e=environment(q,ua);assert.equal(e.window.PowerTBMTV.enabled,on);
   if(!on){
    assert.ok(e.el('demoBgm'));assert.equal(e.el('openingDemoVideo').tagName,'VIDEO');
    assert.equal(e.el('safetyScreenshot').src, e.el('safetyScreenshot').dataset.demoSrc, 'PC prepares the single safety menu at original resolution');
    assert.ok(e.el('meetingDemo').querySelectorAll('img').every(i=>!i.getAttribute('src')), 'other inactive PC images remain lazy');
    e.window.PowerTBMTV.setPage('safety');
    assert.equal(e.el('safetyScreenshot').src, e.el('safetyScreenshot').dataset.demoSrc, 'PC retains original image resolution');
    assert.equal(e.el('guideImage').src, '');
    for(const media of e.document.querySelectorAll('[data-demo-poster]'))assert.equal(media.poster,media.dataset.demoPoster);
   }
  }
 });
 console.log('Simulated DOM/media checks only; real webOS decoding, sound and layout require a device check.');
})().catch(error => {console.error(error);process.exitCode=1;});
