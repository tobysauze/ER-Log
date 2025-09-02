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
  // Prefill with last readings if available, then set current date/time
  try {
    const last = localStorage.getItem('erlog:lastSubmit');
    if (last) {
      populateForm(JSON.parse(last));
      toast('Loaded last readings');
    }
  } catch (e) { /* ignore */ }
  setCurrentDateTime();

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
    // ensure timestamp is up to date
    setCurrentDateTime();
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
    } else if (section.type === 'generator-control') {
      root.appendChild(renderGeneratorControl(section));
    }
  });
}

function renderFieldsSection(section) {
  const card = el('section', { class: 'card' });
  const header = el('div', { class: 'card-header' });
  header.appendChild(el('h2', {}, section.title));
  const toggleBtn = el('button', { type: 'button', class: 'btn icon', 'aria-label': 'Toggle' }, '▾');
  toggleBtn.addEventListener('click', () => card.classList.toggle('open'));
  header.addEventListener('click', (e) => { if (e.target === header || e.target.tagName !== 'BUTTON') card.classList.toggle('open'); });
  card.appendChild(header);
  const body = el('div', { class: 'card-body' });
  card.appendChild(body);
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
    body.appendChild(wrap);
  } else {
    const grid = el('div', { class: 'grid cols-' + (section.columns || 4) });
    (section.fields || []).forEach((f) => grid.appendChild(renderInput(f)));
    body.appendChild(grid);
  }
  // start collapsed by default
  // Open header sections that are essential
  if (section.id === 'header' || section.id === 'gen-control') {
    card.classList.add('open');
  }
  return card;
}

function renderTableGroups(section) {
  const card = el('section', { class: 'card' });
  const header = el('div', { class: 'card-header' });
  header.appendChild(el('h2', {}, section.title));
  header.addEventListener('click', () => card.classList.toggle('open'));
  const toggleBtn = el('button', { type: 'button', class: 'btn icon', 'aria-label': 'Toggle' }, '▾');
  toggleBtn.addEventListener('click', () => card.classList.toggle('open'));
  header.appendChild(toggleBtn);
  card.appendChild(header);
  const body = el('div', { class: 'card-body' });
  card.appendChild(body);
  (section.groups || []).forEach((g, gi) => {
    if (typeof window.__activeGenerators !== 'undefined') {
      if (g.genId && !window.__activeGenerators.has(g.genId)) return; // skip hidden gens
    }
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
    body.appendChild(gCard);
  });
  // start collapsed by default
  // Open if likely primary
  if (section.id === 'main-engines') card.classList.add('open');
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

function setCurrentDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const d = document.querySelector('input[name="date"]');
  if (d && !d.value) d.value = `${yyyy}-${mm}-${dd}`;
  const t = document.querySelector('input[name="time"]');
  if (t) t.value = `${hh}:${mi}`;
}

function renderGeneratorControl(section) {
  const card = el('section', { class: 'card' });
  card.appendChild(el('h2', {}, section.title));
  const wrap = el('div', { class: 'gen-control' });

  // Controls: number running and which
  const countLabel = el('label');
  countLabel.appendChild(el('span', {}, 'How many running?'));
  const countSelect = el('select', { id: 'genCount' });
  [0,1,2,3].forEach(n => countSelect.appendChild(el('option', { value: String(n) }, String(n))));
  countLabel.appendChild(countSelect);
  wrap.appendChild(countLabel);

  const chips = el('div', { class: 'chips' });
  const ids = (section.options && section.options.ids) || [1,2,3];
  const chipMap = new Map();
  ids.forEach(id => {
    const c = el('button', { type: 'button', class: 'chip', 'data-id': String(id) }, `Gen ${id}`);
    c.addEventListener('click', () => {
      if (c.classList.contains('active')) {
        c.classList.remove('active');
      } else {
        c.classList.add('active');
      }
      syncGenSelection();
    });
    chipMap.set(id, c);
    chips.appendChild(c);
  });
  wrap.appendChild(chips);

  function syncGenSelection() {
    const active = new Set();
    chipMap.forEach((btn, id) => { if (btn.classList.contains('active')) active.add(id); });
    // enforce count
    const target = Number(countSelect.value);
    if (active.size > target) {
      // turn off extras (last toggled off)
      const arr = Array.from(active);
      while (arr.length > target) {
        const id = arr.pop();
        const btn = chipMap.get(id);
        if (btn) btn.classList.remove('active');
      }
      return syncGenSelection();
    }
    if (active.size < target) {
      // auto-activate earliest unchecked
      for (const id of ids) {
        if (active.size >= target) break;
        if (!chipMap.get(id).classList.contains('active')) {
          chipMap.get(id).classList.add('active');
          active.add(id);
        }
      }
    }
    window.__activeGenerators = active; // global selection
    rerenderDynamicSections();
  }

  countSelect.addEventListener('change', syncGenSelection);
  // initialize
  countSelect.value = '0';
  window.__activeGenerators = new Set();

  card.appendChild(wrap);
  return card;
}

function rerenderDynamicSections() {
  const root = document.getElementById('sections');
  // remove and rebuild only generator-related sections and following tables
  const idsToRebuild = new Set(['generators-summary', 'generators-readings']);
  // clear existing for those ids
  Array.from(root.children).forEach((node) => {
    const header = node.querySelector('h2');
    if (!header) return;
    const title = header.textContent || '';
    if (title.startsWith('Generators')) root.removeChild(node);
  });
  // find insertion point (after gen-control)
  const afterNode = Array.from(root.children).find(n => (n.querySelector('h2')||{}).textContent === 'Generators');
  const insertIndex = afterNode ? Array.from(root.children).indexOf(afterNode) + 1 : root.children.length;
  const frag = document.createDocumentFragment();
  window.ENGINE_ROOM_SCHEMA.forEach((s) => {
    if (s.id === 'generators-summary') frag.appendChild(renderFieldsSectionFilteredByGen(s));
    if (s.id === 'generators-readings') frag.appendChild(renderTableGroups(s));
  });
  // insert
  const refNode = root.children[insertIndex] || null;
  root.insertBefore(frag, refNode);
}

function renderFieldsSectionFilteredByGen(section) {
  const clone = JSON.parse(JSON.stringify(section));
  clone.groups = (clone.groups || []).filter(g => !g.genId || (window.__activeGenerators && window.__activeGenerators.has(g.genId)));
  return renderFieldsSection(clone);
}


