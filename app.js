(() => {
  const form = document.getElementById('erLogForm');
  const sectionsRoot = document.getElementById('sections');
  const yearSpan = document.getElementById('year');
  const printBtn = document.getElementById('printBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const loadDraftBtn = document.getElementById('loadDraftBtn');
  const signatureCanvas = document.getElementById('signaturePad');
  const clearSigBtn = document.getElementById('clearSignatureBtn');

  yearSpan.textContent = new Date().getFullYear();

  // Signature pad
  const ctx = signatureCanvas.getContext('2d');
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#67a1ff';

  let drawing = false;
  const getPos = (e) => {
    const rect = signatureCanvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };
  const start = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { drawing = false; };
  signatureCanvas.addEventListener('mousedown', start);
  signatureCanvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', end);
  signatureCanvas.addEventListener('touchstart', (e)=>{e.preventDefault(); start(e);});
  signatureCanvas.addEventListener('touchmove', (e)=>{e.preventDefault(); draw(e);});
  signatureCanvas.addEventListener('touchend', end);
  clearSigBtn.addEventListener('click', () => ctx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height));

  // Dynamic rendering from schema
  renderSchema();

  // Save/Load draft to localStorage
  function serializeForm(formEl) {
    const data = new FormData(formEl);
    const object = {};
    for (const [key, value] of data.entries()) {
      setDeep(object, key, value);
    }
    // include signature as data URL
    object.signature = signatureCanvas.toDataURL();
    return object;
  }
  function setDeep(obj, path, value) {
    const parts = path
      .replace(/\]/g, '')
      .split(/\.|\[/)
      .filter(Boolean);
    let curr = obj;
    parts.forEach((p, idx) => {
      const isLast = idx === parts.length - 1;
      if (isLast) {
        curr[p] = value;
      } else {
        if (!curr[p]) curr[p] = {};
        curr = curr[p];
      }
    });
  }
  function populateForm(data) {
    if (!data) return;
    // No special handling needed; flat inputs will be populated below
    // Other fields
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => {
      const name = el.getAttribute('name');
      const val = getDeep(data, name);
      if (val !== undefined) el.value = val;
    });
    // signature
    if (data.signature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = data.signature;
    } else {
      ctx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height);
    }
  }
  function getDeep(obj, path) {
    const parts = path
      .replace(/\]/g, '')
      .split(/\.|\[/)
      .filter(Boolean);
    return parts.reduce((acc, p) => (acc ? acc[p] : undefined), obj);
  }

  saveDraftBtn.addEventListener('click', () => {
    const payload = serializeForm(form);
    localStorage.setItem('erlog:draft', JSON.stringify(payload));
    toast('Draft saved');
  });
  loadDraftBtn.addEventListener('click', () => {
    const raw = localStorage.getItem('erlog:draft');
    if (!raw) return toast('No draft found');
    populateForm(JSON.parse(raw));
    toast('Draft loaded');
  });

  printBtn.addEventListener('click', () => window.print());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = serializeForm(form);
    console.log('ER Log submission', payload);
    localStorage.setItem('erlog:lastSubmit', JSON.stringify(payload));
    toast('Entry submitted');
  });

  // Toast
  function toast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.bottom = '24px';
      el.style.transform = 'translateX(-50%)';
      el.style.padding = '12px 16px';
      el.style.borderRadius = '12px';
      el.style.background = 'linear-gradient(180deg, #1a234b, #0e1430)';
      el.style.color = 'white';
      el.style.fontWeight = '700';
      el.style.letterSpacing = '.02em';
      el.style.boxShadow = '0 10px 22px rgba(0,0,0,.35)';
      el.style.zIndex = '1000';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
  }
})();

function renderSchema() {
  const root = document.getElementById('sections');
  if (!window.ENGINE_ROOM_SCHEMA) return;
  window.ENGINE_ROOM_SCHEMA.forEach((section) => {
    if (section.type === 'fields') {
      root.appendChild(renderFieldsSection(section));
    } else if (section.type === 'table-groups') {
      root.appendChild(renderTableGroups(section));
    } else if (section.type === 'textarea') {
      root.appendChild(renderTextarea(section));
    }
  });
}

function renderFieldsSection(section) {
  const card = el('section', { class: 'card' });
  card.appendChild(el('h2', {}, section.title));
  if (section.groups) {
    const wrap = el('div', { class: 'grid cols-' + (section.columns || 4) });
    section.groups.forEach((group) => {
      const groupCard = el('div', { class: 'card subtle' });
      groupCard.appendChild(el('div', { class: 'subheading' }, group.title));
      const grid = el('div', { class: 'grid cols-' + (section.columns || 4) });
      (group.fields || []).forEach((f) => grid.appendChild(renderInput(f)));
      groupCard.appendChild(grid);
      wrap.appendChild(groupCard);
    });
    card.appendChild(wrap);
  } else {
    const grid = el('div', { class: 'grid cols-' + (section.columns || 4) });
    (section.fields || []).forEach((f) => grid.appendChild(renderInput(f)));
    card.appendChild(grid);
  }
  return card;
}

function renderTableGroups(section) {
  const card = el('section', { class: 'card' });
  card.appendChild(el('h2', {}, section.title));
  (section.groups || []).forEach((g, gi) => {
    const gCard = el('div', { class: 'card subtle' });
    gCard.appendChild(el('div', { class: 'subheading' }, g.title));
    const table = el('div', { class: 'table-grid' });
    // header row
    table.appendChild(el('div', { class: 'th sticky' }, 'Reading'));
    section.columns.forEach((h) => table.appendChild(el('div', { class: 'th' }, h)));
    // rows
    g.rows.forEach((rowLabel, ri) => {
      table.appendChild(el('div', { class: 'row-label' }, rowLabel));
      section.columns.forEach((h, ci) => {
        const prefix = g.keyPrefix ? g.keyPrefix : `group${gi+1}`;
        const key = `${prefix}.${rowLabel.replace(/[^a-z0-9]+/gi,'_').toLowerCase()}.${h}`;
        const inp = el('input', { name: key, type: 'text' });
        table.appendChild(inp);
      });
    });
    gCard.appendChild(table);
    card.appendChild(gCard);
  });
  return card;
}

function renderTextarea(section) {
  const card = el('section', { class: 'card' });
  card.appendChild(el('h2', {}, section.title));
  const ta = el('textarea', { name: section.key, rows: section.rows || 6, placeholder: 'Type here...' });
  card.appendChild(ta);
  return card;
}

function renderInput(f) {
  const label = el('label', { class: f.span ? 'col-span-' + f.span : '' });
  label.appendChild(el('span', {}, f.label));
  const attrs = { name: f.key, type: f.input || 'text' };
  if (f.step) attrs.step = f.step;
  if (f.required) attrs.required = true;
  label.appendChild(el('input', attrs));
  return label;
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  if (text !== undefined) node.textContent = text;
  return node;
}


