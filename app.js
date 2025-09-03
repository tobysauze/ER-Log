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

  // Signature pad (optional)
  if (false && signatureCanvas && typeof signatureCanvas.getContext === 'function') {
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
    if (clearSigBtn) clearSigBtn.addEventListener('click', () => ctx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height));
  }

  // Dynamic rendering from schema
  renderSchema();

  // Show cloud status badge (Pages/phone friendly)
  (async function showCloudStatus(){
    const badge = document.createElement('div');
    badge.id = 'cloudBadge';
    badge.style.position = 'fixed';
    badge.style.right = '12px';
    badge.style.bottom = '90px';
    badge.style.zIndex = '1000';
    badge.style.padding = '6px 10px';
    badge.style.borderRadius = '10px';
    badge.style.fontSize = '12px';
    badge.style.letterSpacing = '.02em';
    badge.style.background = '#212a55';
    badge.style.border = '1px solid rgba(255,255,255,.12)';
    badge.style.color = 'var(--muted)';
    badge.textContent = 'Cloud: checking…';
    document.body.appendChild(badge);
    try {
      if (!window.cloud || !window.cloud.enabled) {
        badge.textContent = 'Cloud: disabled (local only)';
        return;
      }
      const list = await window.cloud.fetchEntries();
      if (Array.isArray(list)) {
        badge.textContent = `Cloud: connected (${list.length})`;
        badge.style.color = '#43d17a';
      } else {
        badge.textContent = 'Cloud: error (fetch)';
        badge.style.color = '#ff6b6b';
      }
    } catch (e) {
      badge.textContent = 'Cloud: error';
      badge.style.color = '#ff6b6b';
    }
  })();

  // Prefill from last submitted entry (if any)
  try {
    const lastRaw = localStorage.getItem('erlog:lastSubmit');
    if (lastRaw) {
      const lastData = JSON.parse(lastRaw);
      autoActivateGeneratorsFromData(lastData);
      setTimeout(() => populateForm(lastData), 0);
    }
  } catch (e) { /* noop */ }

  // Auto-fill current date and time in header
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dateInput = document.querySelector('input[name="date"]');
  const timeInput = document.querySelector('input[name="time"]');
  if (dateInput && !dateInput.value) dateInput.value = todayStr;
  if (timeInput && !timeInput.value) timeInput.value = timeStr;

  // Save/Load draft to localStorage
  function serializeForm(formEl) {
    const data = new FormData(formEl);
    const object = {};
    for (const [key, value] of data.entries()) {
      setDeep(object, key, value);
    }
    // include signature as data URL if present
    if (signatureCanvas && typeof signatureCanvas.toDataURL === 'function') {
      object.signature = signatureCanvas.toDataURL();
    }
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
      if (el.type === 'checkbox') {
        el.checked = Boolean(val);
      } else if (val !== undefined) {
        el.value = val;
      }
    });
    // signature
    if (signatureCanvas && typeof signatureCanvas.getContext === 'function') {
      const ctx = signatureCanvas.getContext('2d');
      if (data.signature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = data.signature;
      } else {
        ctx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height);
      }
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
    const data = JSON.parse(raw);
    autoActivateGeneratorsFromData(data);
    setTimeout(() => populateForm(data), 0);
    toast('Draft loaded');
  });

  printBtn.addEventListener('click', () => window.print());
  // Wire OCR controls if present
  const filesEl = document.getElementById('ocrFiles');
  const runOcrBtn = document.getElementById('runOcrBtn');
  const clearOcrBtn = document.getElementById('clearOcrBtn');
  const ocrPreview = document.getElementById('ocrPreview');
  if (filesEl && ocrPreview) {
    filesEl.addEventListener('change', () => {
      ocrPreview.innerHTML = '';
      Array.from(filesEl.files || []).forEach(f => {
        const img = new Image();
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        img.title = f.name;
        const reader = new FileReader();
        reader.onload = () => { img.src = reader.result; };
        reader.readAsDataURL(f);
        ocrPreview.appendChild(img);
      });
    });
  }
  if (runOcrBtn && filesEl) runOcrBtn.addEventListener('click', async () => {
    try {
      runOcrBtn.disabled = true;
      toast('Processing photos...');
      await runImageIngestion(filesEl.files);
    } finally {
      runOcrBtn.disabled = false;
    }
  });
  if (clearOcrBtn && filesEl && ocrPreview) clearOcrBtn.addEventListener('click', () => { filesEl.value=''; ocrPreview.innerHTML=''; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Ensure timestamp is captured at submit time as well
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateInput = document.querySelector('input[name="date"]');
    const timeInput = document.querySelector('input[name="time"]');
    if (dateInput) dateInput.value = todayStr;
    if (timeInput) timeInput.value = timeStr;
    const payload = serializeForm(form);
    payload.__meta = { ts: Date.now(), iso: new Date().toISOString() };
    console.log('ER Log submission', payload);
    localStorage.setItem('erlog:lastSubmit', JSON.stringify(payload));
    // Append to entries array
    try {
      const raw = localStorage.getItem('erlog:entries');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(payload);
      localStorage.setItem('erlog:entries', JSON.stringify(arr));
    } catch (e) { /* noop */ }

    // Compute and show warnings against Caterpillar 3500 guidelines
    const warnings = computeParameterWarnings(payload);
    payload.__meta.warnings = warnings;
    renderWarningsPanel(warnings);

    // Sync to cloud (Supabase) if configured
    if (window.cloud && window.cloud.enabled) {
      window.cloud.saveEntry(payload).then((res) => {
        if (res && res.ok) {
          toast('Synced to cloud');
        } else {
          toast(`Cloud sync failed: ${(res && res.error) ? res.error : 'check table & RLS policies'}`);
        }
      }).catch((e) => {
        toast(`Cloud sync failed: ${e && e.message ? e.message : 'network or policy'}`);
      });
    }
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
    } else if (section.type === 'composite') {
      root.appendChild(renderComposite(section));
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
      // Render each group's fields as a compact list: label left, input right
      const grid = el('div', { class: 'grid cols-1 compact-field-list' });
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

function renderComposite(section) {
  const card = el('section', { class: 'card open' });
  const header = el('div', { class: 'card-header' });
  header.appendChild(el('h2', {}, section.title));
  header.addEventListener('click', () => card.classList.toggle('open'));
  const toggleBtn = el('button', { type: 'button', class: 'btn icon', 'aria-label': 'Toggle' }, '▾');
  toggleBtn.addEventListener('click', () => card.classList.toggle('open'));
  header.appendChild(toggleBtn);
  card.appendChild(header);
  const body = el('div', { class: 'card-body' });
  card.appendChild(body);

  (section.children || []).forEach((child) => {
    if (child.subtype === 'generator-control') {
      body.appendChild(renderGeneratorControl({ id: 'gen-control', type: 'generator-control', options: child.options }));
    } else if (child.subtype === 'fields') {
      const s = { id: 'generators-summary', type: 'fields', title: child.title || 'Summary', columns: child.columns, groups: child.groups };
      body.appendChild(renderFieldsSection(s));
    } else if (child.subtype === 'table-groups') {
      const s = { id: 'generators-readings', type: 'table-groups', title: child.title || 'Hourly Readings', columns: child.columns, groups: child.groups };
      body.appendChild(renderTableGroups(s));
    } else if (child.subtype === 'gen-matrix') {
      const s = { id: 'gen-matrix', type: 'gen-matrix', title: child.title || 'Online Generator Readings', rows: child.rows };
      const node = renderGenMatrixSection(s);
      // Keep references for dynamic updates
      window.__genMatrixSection = s;
      window.__genMatrixNode = node;
      body.appendChild(node);
    }
  });

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
    // Ensure the grid has the correct number of hour columns
    if (Array.isArray(section.columns)) {
      table.style.setProperty('--hours', String(section.columns.length));
    }
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

// Warning rules based on Caterpillar 3500 guidance
function computeParameterWarnings(data) {
  const out = [];
  const n = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const x = parseFloat(String(v).replace(/,/g,''));
    return Number.isFinite(x) ? x : undefined;
  };
  const check = (value, label, cond, guidance) => {
    if (value === undefined) return;
    if (!cond(value)) out.push({ label, value, guidance });
  };

  // Helper to get deep values
  const get = (path) => {
    const parts = String(path).replace(/\]/g,'').split(/\.|\[/).filter(Boolean);
    return parts.reduce((acc,p)=>acc?acc[p]:undefined, data);
  };

  // Main Engines (Port/Stbd)
  ['port','stbd'].forEach((side) => {
    const prefix = side.toLowerCase();
    check(n(get(`${prefix}.oilTemp`)), `${side.toUpperCase()} Oil Temperature (°C)`, (v)=> v >= 80 && v <= 110, '80–110 °C (after oil cooler)');
    check(n(get(`${prefix}.oilPressure`)), `${side.toUpperCase()} Oil Pressure (kPa)`, (v)=> v >= 310 && v <= 420, 'Normal 310–420 kPa; Alarm 276 kPa; Shutdown 207 kPa');
    check(n(get(`${prefix}.oilDiff`)), `${side.toUpperCase()} Oil Filter Differential (kPa)`, (v)=> v <= 105, 'Max 105 kPa (15 psi)');
    check(n(get(`${prefix}.fuelPressure`)), `${side.toUpperCase()} Fuel Pressure (kPa)`, (v)=> v >= 379 && v <= 620, '55–90 psi (379–620 kPa); min transfer pump 379 kPa');
    check(n(get(`${prefix}.fuelDiff`)), `${side.toUpperCase()} Fuel Filter Differential (kPa)`, (v)=> v <= 70, 'Max 70 kPa (10 psi)');
    check(n(get(`${prefix}.coolantTemp`)), `${side.toUpperCase()} Jacket Water Temp (°C)`, (v)=> v <= 99, 'Normal max 99 °C; Alarm 101 °C; Shutdown 107 °C');
    check(n(get(`${prefix}.scavengeAir`)), `${side.toUpperCase()} Inlet Air Temp (°C)`, (v)=> v <= 49, 'Max 49 °C (120 °F) at air cleaner');
    // Exhaust backpressure and CHP spread not directly captured; skip.
  });

  // Other
  check(n(get('other.seaWaterTemp')), 'Sea water Temp (°C)', (v)=> Number.isFinite(v), 'Monitor trend');
  check(n(get('other.dayTankTemp')), 'Day Tank temp (°C)', (v)=> Number.isFinite(v) && v <= 65, 'Max recommended 65 °C for fuel temperature');

  // Generators matrix (Gen 1/2/3)
  [1,2,3].forEach((id) => {
    const p = `gen${id}`;
    check(n(get(`${p}.oil_temperature`)), `Gen ${id} Oil Temperature (°C)`, (v)=> v >= 80 && v <= 110, '80–110 °C');
    check(n(get(`${p}.oil_pressure_kpa`)), `Gen ${id} Oil Pressure (kPa)`, (v)=> v >= 310 && v <= 420, 'Normal 310–420 kPa; Alarm 276; Shutdown 207');
    check(n(get(`${p}.fuel_pressure_kpa`)), `Gen ${id} Fuel Pressure (kPa)`, (v)=> v >= 379 && v <= 620, '55–90 psi (379–620 kPa)');
    check(n(get(`${p}.coolant_temp_°c`)), `Gen ${id} Jacket Water Temp (°C)`, (v)=> v <= 99, 'Normal max 99 °C; Alarm 101; Shutdown 107');
    check(n(get(`${p}.inlet_air_temp_°c`)), `Gen ${id} Inlet Air Temp (°C)`, (v)=> v <= 49, 'Max 49 °C');
    // Boost/Backpressure mappings depend on available rows; if available, add checks here.
  });

  return out;
}

function renderWarningsPanel(warnings) {
  // Remove existing panel
  const existing = document.getElementById('warningsPanel');
  if (existing) existing.remove();
  if (!warnings || warnings.length === 0) return;
  const root = document.getElementById('sections');
  const card = el('section', { id: 'warningsPanel', class: 'card open' });
  const header = el('div', { class: 'card-header' });
  header.appendChild(el('h2', {}, 'Warnings — Out of Recommended Range'));
  card.appendChild(header);
  const body = el('div', { class: 'card-body' });
  const list = document.createElement('ul');
  list.style.margin = '0';
  list.style.paddingLeft = '18px';
  warnings.forEach(w => {
    const li = document.createElement('li');
    li.textContent = `${w.label}: ${w.value} — Recommended ${w.guidance}`;
    li.style.color = 'var(--danger)';
    list.appendChild(li);
  });
  body.appendChild(list);
  card.appendChild(body);
  root.prepend(card);
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
      const willActivate = !c.classList.contains('active');
      if (willActivate) {
        // if at limit, prefer the newly clicked chip by trimming others
        const currentActive = Array.from(chipMap.values()).filter(btn => btn.classList.contains('active')).length;
        const target = Number(countSelect.value);
        if (currentActive >= target && target > 0) {
          // deactivate oldest actives to make room, keeping order by id
          const actives = ids.filter(i => chipMap.get(i).classList.contains('active'));
          // remove from start until size < target
          while (actives.length >= target) {
            const removeId = actives.shift();
            const btn = chipMap.get(removeId);
            if (btn) btn.classList.remove('active');
          }
        }
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
      syncGenSelection(id);
    });
    chipMap.set(id, c);
    chips.appendChild(c);
  });
  wrap.appendChild(chips);

  function syncGenSelection(preferredId) {
    const active = new Set();
    chipMap.forEach((btn, id) => { if (btn.classList.contains('active')) active.add(id); });
    // enforce count
    const target = Number(countSelect.value);
    if (active.size > target) {
      // Trim extras while preferring the most recently clicked (preferredId)
      const ordered = ids.filter(id => chipMap.get(id).classList.contains('active'));
      const keep = [];
      if (preferredId && ordered.includes(preferredId)) {
        keep.push(preferredId);
      }
      for (const id of ordered) {
        if (keep.length >= target) break;
        if (!keep.includes(id)) keep.push(id);
      }
      // deactivate those not in keep
      ordered.forEach((id) => {
        if (!keep.includes(id)) {
          const btn = chipMap.get(id);
          if (btn) btn.classList.remove('active');
        }
      });
      return syncGenSelection();
    }
    // Do not auto-activate when below target; user chooses which ones
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
  // find the Generators composite card
  const generatorsCard = Array.from(root.children).find((n) => {
    const header = n.querySelector(':scope > .card-header h2');
    return header && header.textContent === 'Generators';
  });
  if (!generatorsCard) return;
  const body = generatorsCard.querySelector(':scope > .card-body');
  if (!body) return;

  // remove any existing gen-matrix section inside the Generators card
  Array.from(body.children).forEach((child) => {
    const h2 = child.querySelector('h2');
    if (h2 && h2.textContent === 'Online Generator Readings') {
      body.removeChild(child);
    }
  });

  // append fresh matrix reflecting current selection
  if (window.__genMatrixSection) {
    const node = renderGenMatrixSection(window.__genMatrixSection);
    window.__genMatrixNode = node;
    body.appendChild(node);
  }
}

function autoActivateGeneratorsFromData(data) {
  try {
    const ids = [1,2,3].filter(id => !!(data && data[`gen${id}`]));
    const countSelect = document.getElementById('genCount');
    if (!countSelect) return;
    countSelect.value = String(ids.length);
    const chips = document.querySelectorAll('.chip[data-id]');
    chips.forEach(c => c.classList.remove('active'));
    ids.forEach(id => {
      const btn = document.querySelector(`.chip[data-id="${id}"]`);
      if (btn) btn.classList.add('active');
    });
    // reflect in global and rebuild sections
    window.__activeGenerators = new Set(ids);
    rerenderDynamicSections();
  } catch(e) {
    // noop
  }
}

function renderFieldsSectionFilteredByGen(section) {
  const clone = JSON.parse(JSON.stringify(section));
  clone.groups = (clone.groups || []).filter(g => !g.genId || (window.__activeGenerators && window.__activeGenerators.has(g.genId)));
  return renderFieldsSection(clone);
}

async function runImageIngestion(files) {
  if (!files || files.length === 0) return toast('No images selected');
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return toast('Cloud disabled');
  try {
    const fd = new FormData();
    Array.from(files).forEach((f, i) => fd.append('file'+i, f));
    const resp = await fetch(`${window.SUPABASE_URL}/functions/v1/erlog-ocr`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'apikey': window.SUPABASE_ANON_KEY },
      body: fd
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('OCR http error', resp.status, txt);
      throw new Error(txt || `HTTP ${resp.status}`);
    }
    const json = await resp.json().catch(async () => ({ error: await resp.text() }));
    console.log('OCR result', json);
    if (json && json.entries) {
      applyOcrResults(json);
      toast(`Photos processed: ${json.entries.length} values`);
    } else {
      toast('No values found in photos');
    }
  } catch (e) {
    console.error('OCR error', e);
    toast('Photo import failed');
  }
}

function applyOcrResults(result) {
  if (!result) return;
  if (Array.isArray(result.activeGenerators) && result.activeGenerators.length) {
    const data = {};
    result.activeGenerators.forEach(id => { data[`gen${id}`] = {}; });
    autoActivateGeneratorsFromData(data);
  }
  if (Array.isArray(result.entries)) {
    let applied = 0;
    result.entries.forEach(({ path, value }) => {
      const el = document.querySelector(`[name="${path}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else el.value = value;
      highlightField(el);
      applied++;
    });
    if (applied === 0) console.warn('OCR: no matching inputs for returned paths', result.entries);
  }
}

function highlightField(el){
  const prev = el.style.boxShadow;
  el.style.boxShadow = '0 0 0 3px rgba(63,224,232,.35)';
  setTimeout(()=>{ el.style.boxShadow = prev; }, 1200);
}

function renderGenMatrixSection(section) {
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

  const activeIds = window.__activeGenerators ? Array.from(window.__activeGenerators.values()) : [];
  if (activeIds.length === 0) {
    body.appendChild(el('p', { style: 'color: var(--muted);' }, 'Select running generators above to enter readings.'));
    return card;
  }

  const table = el('div', { class: 'table-grid' });
  table.style.setProperty('--hours', String(activeIds.length));
  // Header
  table.appendChild(el('div', { class: 'th sticky' }, 'Reading'));
  activeIds.forEach(id => table.appendChild(el('div', { class: 'th' }, `Gen ${id}`)));

  // Rows
  (section.rows || []).forEach((rowLabel) => {
    table.appendChild(el('div', { class: 'row-label' }, rowLabel));
    activeIds.forEach((id) => {
      const key = `gen${id}.${rowLabel.replace(/[^a-z0-9]+/gi,'_').toLowerCase()}`;
      const inp = el('input', { name: key, type: rowLabel.toLowerCase().includes('check') ? 'checkbox' : 'text' });
      if (inp.type === 'checkbox') {
        const wrap = el('label');
        wrap.appendChild(inp);
        table.appendChild(wrap);
      } else {
        table.appendChild(inp);
      }
    });
  });

  body.appendChild(table);
  card.classList.add('open');
  return card;
}


