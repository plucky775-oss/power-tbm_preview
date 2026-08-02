/* Power TBM offline app-shell cache
   - 앱을 한 번 온라인에서 연 뒤에는 네트워크가 없어도 index/css/js/이미지와 CDN 라이브러리를 캐시에서 불러옵니다.
   - /api 요청은 캐시하지 않습니다. 로그인/승인/동기화는 앱 코드의 오프라인 세션 로직이 처리합니다. */
const CACHE_VERSION = 'power-tbm-indoor-incident-filter-20260802a';
const APP_CACHE = CACHE_VERSION + '-app';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';
const APP_SHELL = ['index.html', 'styles.css', 'styles-base.css', 'styles-print.css', 'styles-weather-home.css', 'styles-weather-animations.css', 'styles-meeting.css', 'styles-print-page.css', 'styles-tbm-write.css', 'styles-submenus.css', 'styles-tbm-archive.css', 'styles-print-fixes.css', 'styles-ai.css', 'styles-basic-workers.css', 'styles-worker-attendance.css', 'manifest.webmanifest', 'firebase-config.js', 'data.js', 'app.js', 'assets/splash.jpg', 'assets/splash-intro-poster.jpg', 'assets/splash-intro.mp4', 'assets/kepco-symbol.png', 'assets/home-menu/settings.png', 'assets/home-menu/tools.png', 'assets/home-menu/safety.png', 'assets/home-menu/tbm.png', 'assets/minutes-menu/write-3d.png', 'assets/minutes-menu/calendar-3d.png', 'assets/guide-menu/risk.png', 'assets/guide-menu/golden.png', 'assets/guide-menu/tbm.png', 'assets/guide-menu/law.png', 'assets/guide-menu/warning.png', 'assets/guide-menu/clipboard.png', 'assets/guide-menu/siren.png', 'assets/tools-menu/notice.png', 'assets/tools-menu/voice.png', 'assets/tools-menu/streetview.png', 'assets/tools-menu/emergency.png', 'assets/tools-menu/contacts.png', 'assets/settings-menu/location.png', 'assets/settings-menu/admin.png', 'assets/settings-menu/account.png',  'components/admin.js', 'components/app-core.js', 'components/app-shell.js', 'components/click-sound.js', 'components/emergency-contacts.js', 'components/emergency.js', 'components/refs.js', 'components/safety-incidents.js', 'components/safety-notices.js', 'components/streetview.js', 'components/tbm-remote-sign.js', 'components/tbm-output-utils.js', 'components/tbm-archive.js', 'components/tbm.js', 'components/tbm-trade-risk-db.js', 'components/tbm-risk-utils.js', 'components/tbm-meeting-helpers.js', 'components/tbm-worker-utils.js', 'components/trades.js', 'components/voice-memo.js', 'components/weather.js', 'icons/apple-touch-icon.png', 'icons/favicon-16.png', 'icons/favicon-32.png', 'icons/icon-128.png', 'icons/icon-144.png', 'icons/icon-152.png', 'icons/icon-192.png', 'icons/icon-384.png', 'icons/icon-512.png', 'icons/icon-72.png', 'icons/icon-96.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'assets/trades/indoor_high_voltage_energization.png', 'assets/trades/indoor_inlet.png', 'assets/trades/indoor_meter.png', 'assets/trades/indoor_meter_test.jpg', 'assets/trades/indoor_meterbox.png', 'assets/trades/oh_foundation.png', 'assets/trades/oh_grounding_protect.png', 'assets/trades/oh_guard_pipe.png', 'assets/trades/oh_guywire.png', 'assets/trades/oh_hardware.png', 'assets/trades/oh_indirect_stick.png', 'assets/trades/oh_pole_equipment.png', 'assets/trades/oh_pole_set.png', 'assets/trades/oh_protect_tube.png', 'assets/trades/oh_stringing.png', 'assets/trades/ug_cable_pull.png', 'assets/trades/ug_duct.png', 'assets/trades/ug_excavation.png', 'assets/trades/ug_joint.png', 'assets/trades/ug_live_elbow_disconnect_connect.png', 'assets/trades/ug_manhole.png', 'assets/trades/ug_restore.png', 'assets/trades/ug_shield_ground.png', 'assets/trades/ug_structure_install.png', 'assets/trades/ug_termination.png', 'assets/trades/ug_test_switch.png', 'assets/trades/oh_tree_trimming.png', 'assets/trades/ug_directional_boring.png', 'assets/trades/ug_equipment_install.png', 'assets/trades/oh_hotline_bypass.png'];
const CHECKLIST_SHELL = [
  'checklists.html', 'checklists-manifest.webmanifest',
  'distribution-checklist/app.css', 'distribution-checklist/styles-checklist.css',
  'distribution-checklist/config/app-config.js', 'distribution-checklist/config/pdf-layout-config.js',
  'distribution-checklist/data/distribution-checklists-v1.js',
  'distribution-checklist/components/checklist-utils.js',
  'distribution-checklist/components/checklist-storage.js',
  'distribution-checklist/components/checklist-signature.js',
  'distribution-checklist/components/checklist-pdf.js',
  'distribution-checklist/components/distribution-checklist.js',
  'distribution-checklist/components/checklist-menu.js',
  'distribution-checklist/components/checklist-picker.js',
  'distribution-checklist/components/checklist-writer.js',
  'distribution-checklist/components/checklist-documents.js',
  'distribution-checklist/components/checklist-calendar.js',
  'distribution-checklist/app.js',
  'assets/kepco-symbol.png',
  'distribution-checklist/assets/menu/home-ci-logo.png',
  'distribution-checklist/assets/menu/tbm.png',
  'distribution-checklist/assets/menu/risk.png',
  'distribution-checklist/assets/menu/calendar-3d.png'
];
const CHECKLIST_PDF_PAGE_ASSETS = Array.from({length:118},(_,index)=>`distribution-checklist/assets/pdf-pages/distribution-${String(index+1).padStart(3,'0')}.jpg`);
const CDN_URLS = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
const VERSIONED_APP_SHELL = ['components/tbm-v139.js', 'components/tbm-remote-sign-v136.js'];
const THEME_VIDEO_APP_SHELL = ['components/theme-videos.js'];

function scopeUrl(path){
  return new URL(path, self.registration.scope).href;
}
function isApiRequest(url){
  return url.origin === self.location.origin && /\/api(?:\/|$)/.test(url.pathname);
}
function isTbmPdfDownloadRequest(url){
  return url.origin === self.location.origin && /\/__tbm_pdf_download__\//.test(url.pathname);
}
function isDistributionChecklistPdfRequest(url){
  return url.origin === self.location.origin && /\/__distribution_checklist_pdf__\//.test(url.pathname);
}
function parseSingleByteRange(value,size){
  const match=/^bytes=(\d*)-(\d*)$/i.exec(String(value || '').trim());
  if(!match || size<1) return null;
  let start;
  let end;
  if(match[1]==='' && match[2]!==''){
    const suffix=Number(match[2]);
    if(!Number.isFinite(suffix) || suffix<=0) return null;
    start=Math.max(0,size-suffix);
    end=size-1;
  }else{
    start=Number(match[1]);
    end=match[2]==='' ? size-1 : Number(match[2]);
    if(!Number.isFinite(start) || !Number.isFinite(end)) return null;
  }
  if(start<0 || start>=size || end<start) return null;
  return {start,end:Math.min(end,size-1)};
}
async function serveNamedCachedPdf(request){
  // Cache API에는 GET 응답으로 저장되므로 HEAD/Range 요청도 URL 문자열로 조회합니다.
  const cached = await caches.match(request.url, { ignoreSearch:false });
  if(!cached){
    return new Response('PDF file not found', {
      status:404,
      headers:{ 'Content-Type':'text/plain;charset=utf-8', 'Cache-Control':'no-store' }
    });
  }
  const headers=new Headers(cached.headers);
  headers.set('Content-Type','application/pdf');
  headers.set('Accept-Ranges','bytes');
  if(request.method==='HEAD') return new Response(null,{status:200,headers});
  const rangeHeader=request.headers.get('range');
  if(!rangeHeader) return cached;
  const blob=await cached.clone().blob();
  const range=parseSingleByteRange(rangeHeader,blob.size);
  if(!range){
    headers.set('Content-Range',`bytes */${blob.size}`);
    headers.set('Content-Length','0');
    return new Response(null,{status:416,statusText:'Range Not Satisfiable',headers});
  }
  const part=blob.slice(range.start,range.end+1,'application/pdf');
  headers.set('Content-Range',`bytes ${range.start}-${range.end}/${blob.size}`);
  headers.set('Content-Length',String(part.size));
  return new Response(part,{status:206,statusText:'Partial Content',headers});
}
function isCacheableSameOrigin(url){
  if(url.origin !== self.location.origin) return false;
  if(isApiRequest(url)) return false;
  return /\.(?:html|css|js|json|webmanifest|png|jpg|jpeg|webp|svg|ico|mp4)$/i.test(url.pathname) || url.pathname === new URL(self.registration.scope).pathname;
}
async function cacheOne(cache, url){
  try{
    const req = new Request(url, { cache:'reload' });
    const res = await fetch(req);
    if(res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
  }catch(e){ /* 설치 실패를 막기 위해 개별 실패는 무시 */ }
}
async function cacheCrossOrigin(cache, url){
  try{
    const req = new Request(url, { mode:'cors', cache:'reload' });
    const res = await fetch(req);
    if(res && (res.ok || res.type === 'opaque')){ await cache.put(req, res.clone()); return; }
  }catch(e){}
  try{
    const req = new Request(url, { mode:'no-cors', cache:'reload' });
    const res = await fetch(req);
    if(res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
  }catch(e){}
}

self.addEventListener('install', event=>{
  event.waitUntil((async()=>{
    const cache = await caches.open(APP_CACHE);
    await Promise.allSettled(APP_SHELL.concat(CHECKLIST_SHELL, VERSIONED_APP_SHELL, THEME_VIDEO_APP_SHELL).map(p=>cacheOne(cache, scopeUrl(p))));
    // 118쪽 원문은 한꺼번에 요청하면 iOS에서 서비스워커 설치가 중단될 수 있어 8개씩 저장합니다.
    for(let i=0;i<CHECKLIST_PDF_PAGE_ASSETS.length;i+=8){
      const batch=CHECKLIST_PDF_PAGE_ASSETS.slice(i,i+8);
      await Promise.allSettled(batch.map(p=>cacheOne(cache,scopeUrl(p))));
    }
    await Promise.allSettled(CDN_URLS.map(u=>cacheCrossOrigin(cache, u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=> (k.startsWith('power-') && k !== APP_CACHE && k !== RUNTIME_CACHE) ? caches.delete(k) : Promise.resolve(false)));
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request){
  try{
    const res = await fetch(request);
    if(res && res.ok){
      const cache = await caches.open(APP_CACHE);
      cache.put(scopeUrl('index.html'), res.clone()).catch(()=>{});
    }
    return res;
  }catch(e){
    const cached = await caches.match(scopeUrl('index.html'), { ignoreSearch:true });
    if(cached) return cached;
    throw e;
  }
}
async function networkFirstChecklistNavigation(request){
  try{
    const res=await fetch(new Request(request,{cache:'no-cache'}));
    if(res && res.ok){
      const cache=await caches.open(APP_CACHE);
      cache.put(scopeUrl('checklists.html'),res.clone()).catch(()=>{});
    }
    return res;
  }catch(e){
    const cached=await caches.match(scopeUrl('checklists.html'),{ignoreSearch:true});
    if(cached) return cached;
    throw e;
  }
}
async function cacheFirstSameOrigin(request){
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request, { ignoreSearch:true });
  if(cached) return cached;
  const res = await fetch(request);
  if(res && res.ok){
    cache.put(request, res.clone()).catch(()=>{});
  }
  return res;
}
async function networkFirstSameOriginCode(request){
  const cache = await caches.open(APP_CACHE);
  try{
    const res = await fetch(new Request(request, { cache:'no-cache' }));
    if(res && res.ok) cache.put(request, res.clone()).catch(()=>{});
    return res;
  }catch(e){
    const cached = await cache.match(request, { ignoreSearch:true });
    if(cached) return cached;
    throw e;
  }
}
async function networkFirstCrossOrigin(request){
  try{
    const res = await fetch(request);
    if(res && (res.ok || res.type === 'opaque')){
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, res.clone()).catch(()=>{});
    }
    return res;
  }catch(e){
    const cached = await caches.match(request, { ignoreSearch:true });
    if(cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', event=>{
  const request = event.request;
  const url = new URL(request.url);

  // 생성 PDF는 서버 파일이 아니라 Cache API에 저장된 문서입니다.
  // iOS PDF 뷰어의 HEAD/Range 요청까지 처리해야 404 없이 미리보기가 열립니다.
  if(isTbmPdfDownloadRequest(url) || isDistributionChecklistPdfRequest(url)){
    if(request.method==='GET' || request.method==='HEAD') event.respondWith(serveNamedCachedPdf(request));
    return;
  }
  if(request.method !== 'GET') return;

  // 루트 정적 진입점은 메인 서비스워커가 별도로 보관합니다.
  if(url.origin === self.location.origin && /\/checklists(?:\.html)?$/.test(url.pathname) && request.mode === 'navigate'){
    event.respondWith(networkFirstChecklistNavigation(request));
    return;
  }

  // 예전 하위 HTML 주소는 Vercel의 정확 경로 rewrite가 처리하게 두되,
  // 하위 CSS/JS/원문 이미지는 루트 캐시에서도 정상 사용할 수 있게 합니다.
  if(url.origin === self.location.origin && /\/distribution-checklist(?:\/index\.html)?\/?$/.test(url.pathname) && request.mode === 'navigate') return;

  // API는 캐시하지 않음: 오프라인 인증/저장 로직에서 실패를 감지해야 합니다.
  if(isApiRequest(url)) return;

  if(request.mode === 'navigate'){
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if(isCacheableSameOrigin(url)){
    // JS/CSS는 온라인일 때 새 배포를 우선합니다. 그 외 이미지/앱 셸은 빠른 캐시 우선입니다.
    event.respondWith(/\.(?:js|css)$/i.test(url.pathname)
      ? networkFirstSameOriginCode(request)
      : cacheFirstSameOrigin(request));
    return;
  }

  if(CDN_URLS.includes(url.href)){
    event.respondWith(networkFirstCrossOrigin(request));
  }
});
