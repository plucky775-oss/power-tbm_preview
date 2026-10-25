/* Visual-only PPE demo; source screenshot remains unchanged. No form submission.
   Use the existing narration-mapped 96-second meeting visual clock. */
(() => {
  'use strict';
  const taps = [
    { id: 'health', label: '이상 없음', x: 16.5, y: 28.9, at: 41.2 },
    { id: 'helmet', label: '안전모', x: 16.5, y: 51.1, at: 42.5 },
    { id: 'shoes', label: '절연안전화', x: 16.5, y: 57.9, at: 43.5 },
    { id: 'gloves', label: '절연장갑', x: 16.5, y: 64.7, at: 44.5 },
    { id: 'harness', label: '안전대', x: 16.5, y: 71.5, at: 45.5 },
    { id: 'confirm', label: '확인', x: 74.2, y: 86.1, at: 47.8 }
  ];
  let root, layer, hand, ripple, checks;
  const initialize = () => {
    root = document.getElementById('meetingDemo');
    const scene = root?.querySelector('.meeting-slide-health');
    if (!scene) return false;
    layer = document.createElement('div');
    layer.className = 'ppe-demo-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.hidden = true;
    checks = taps.filter(t => t.id !== 'confirm').map(t => {
      const mark = document.createElement('span');
      mark.className = 'ppe-demo-check' + (t.id === 'health' ? ' ppe-demo-health' : '');
      mark.dataset.ppeItem = t.id;
      mark.style.left = t.x + '%'; mark.style.top = t.y + '%';
      layer.appendChild(mark); return mark;
    });
    hand = document.createElement('span'); hand.className = 'ppe-demo-hand';
    const glyph = document.createElement('span'); glyph.className = 'demo-hand-glyph';
    hand.appendChild(glyph); layer.appendChild(hand);
    ripple = document.createElement('span'); ripple.className = 'ppe-demo-ripple';
    layer.appendChild(ripple); scene.appendChild(layer);
    return true;
  };
  const render = (page, visualMs) => {
    if (!layer && !initialize()) return;
    const p = Number(visualMs) / 960;
    const active = page === 'meeting' && Number.isFinite(p) && p >= 39.2 && p < 48.7;
    root.dataset.ppeActive = String(active);
    layer.hidden = !active;
    if (!active) return;
    checks.forEach((mark, i) => { mark.dataset.checked = String(p >= taps[i].at); });
    const tap = taps.find(t => p >= t.at - .45 && p <= t.at + .55);
    hand.hidden = !tap || p > tap.at + .35;
    ripple.hidden = !tap || p < tap.at;
    layer.dataset.tap = tap?.id || '';
    if (!tap) return;
    // A single target drives fingertip and ripple, including press scaling.
    hand.style.left = ripple.style.left = tap.x + '%';
    hand.style.top = ripple.style.top = tap.y + '%';
    const distance = Math.abs(p - tap.at);
    const press = 1 - .26 * Math.max(0, 1 - distance / .2);
    hand.style.transform = 'translate(-42%, -20%) rotate(-8deg) scale(' + press + ')';
    const pulse = Math.max(0, Math.min(1, (p - tap.at) / .55));
    ripple.style.transform = 'translate(-50%, -50%) scale(' + (.45 + 1.2 * pulse) + ')';
    ripple.style.opacity = String(1 - pulse);
  };
  window.PowerTBMPPEDemo = { render, taps: taps.map(t => ({ ...t })) };
})();
