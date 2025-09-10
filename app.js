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

  // Excel Export button
  const exportCurrentBtn = document.getElementById('exportCurrentBtn');
  if (exportCurrentBtn) {
    exportCurrentBtn.addEventListener('click', () => {
      const formData = serializeForm(form);
      console.log('Form data for export:', formData);
      if (exportEntryWithData(formData, 'er-log-current')) {
        toast('Current form data exported to Excel with values filled in');
      } else {
        toast('Export failed');
      }
    });
  }

  // Excel Export functionality - matches exact reference format
  function exportToExcel(data, filename = 'er-log-data') {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with exact layout from reference
    const wsData = [];
    
    // Row 1: Header with Day, Date, Notes
    wsData.push(['', '', '', 'Day 1', '', '', '', data.date || '6-Feb-25', '', '', 'Notes']);
    
    // Row 2: Additional header info - Time, From Port, To Port
    wsData.push(['', '', '', 'Time:', data.time || '', 'From:', data.from || '', 'To:', data.to || '', '', '']);
    
    // Row 3: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
    // Row 4: PORT main Engine header
    wsData.push(['', 'PORT main Engine', '', '', '', '', '', '', '', '', '']);
    
    // Row 5: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
    // PORT main Engine parameters (rows 5-24)
    const portParams = [
      ['Engines Advanced (AMS)', 'RPM', 'RPM'],
      ['', 'Fuel Pressure', 'kPa'],
      ['', 'Oil Temperature', 'C'],
      ['', 'S W Pressure', 'kPa'],
      ['', 'Boost Pressure', 'kPa'],
      ['', 'Scavange air', 'C'],
      ['', 'Left Exhaust', 'C'],
      ['', 'Right Exhaust', 'C'],
      ['', 'Ex O/B Surface temp', 'C'],
      ['', 'Fuel Differential', 'kPa'],
      ['', 'Oil Differential', 'kPa'],
      ['', 'Coolant Temp', 'C'],
      ['', 'Oil Pressure', 'kPa'],
      ['', 'Trans gear Temp', 'C'],
      ['', 'Trans oil pressure', 'kPa'],
      ['', 'Fuel consumption', 'l/h'],
      ['', 'Load', '%'],
      ['', 'Shaft Flow', 'l/min'],
      ['', 'Thrust bearing Temp', 'C'],
      ['', 'Ex Sea water Press', 'kPa']
    ];
    
    // Add PORT parameters
    portParams.forEach((row, index) => {
      const wsRow = [row[0], row[1], row[2]];
      // Add empty columns D-K
      for (let i = 0; i < 8; i++) {
        wsRow.push('');
      }
      wsData.push(wsRow);
    });
    
    // Row 25: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
    // Row 26: STBD main Engine header
    wsData.push(['', 'STBD main Engine', '', '', '', '', '', '', '', '', '']);
    
    // Row 27: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
    // STBD main Engine parameters (rows 28-47) - same as PORT
    const stbdParams = [
      ['Engines Advanced (AMS)', 'RPM', 'RPM'],
      ['', 'Fuel Pressure', 'kPa'],
      ['', 'Oil Temperature', 'C'],
      ['', 'S W Pressure', 'kPa'],
      ['', 'Boost Pressure', 'kPa'],
      ['', 'Scavange air', 'C'],
      ['', 'Left Exhaust', 'C'],
      ['', 'Right Exhaust', 'C'],
      ['', 'Ex O/B Surface temp', 'C'],
      ['', 'Fuel Differential', 'kPa'],
      ['', 'Oil Differential', 'kPa'],
      ['', 'Coolant Temp', 'C'],
      ['', 'Oil Pressure', 'kPa'],
      ['', 'Trans gear Temp', 'C'],
      ['', 'Trans oil pressure', 'kPa'],
      ['', 'Fuel consumption', 'l/h'],
      ['', 'Load', '%'],
      ['', 'Shaft Flow', 'l/min'],
      ['', 'Thrust bearing Temp', 'C'],
      ['', 'Ex Sea water Press', 'kPa']
    ];
    
    // Add STBD parameters
    stbdParams.forEach((row, index) => {
      const wsRow = [row[0], row[1], row[2]];
      // Add empty columns D-K
      for (let i = 0; i < 8; i++) {
        wsRow.push('');
      }
      wsData.push(wsRow);
    });
    
    // Row 48: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
    // Row 49: Online Generator header
    wsData.push(['', 'Online Generator', '', '', '', '', '', '', '', '', '']);
    
    // Row 50: Empty
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    
          // Online Generator parameters (rows 51-67) - expanded to match reference
      const genParams = [
        ['Genset Electrical', 'DG1/DG2/DG3', '#'],
        ['', 'kW', 'kW'],
        ['', 'kVAr', 'kVAr'],
        ['', 'Hz', 'Hz'],
        ['', 'Amps', 'A'],
        ['', 'Voltage', 'V'],
        ['', 'RPM', 'RPM'],
        ['', 'Fuel consumption', 'l/min']
      ];
      
      // Genset Mechanical section (rows 68-85)
      const genMechParams = [
        ['Genset Mechanical', 'Load', '%'],
        ['', 'Coolants Temp', 'C'],
        ['', 'oil pressure', 'kPa'],
        ['', 'Fuel Temp', 'C'],
        ['', 'Fuel Pressure', 'kPa'],
        ['', 'Sea water Pressure', 'kPa'],
        ['', 'Oil Temperature', 'C'],
        ['', 'Boost Pressure', 'kPa'],
        ['', 'Inlet Air Temp', 'C']
      ];
      
      // Local section (rows 86-87)
      const localParams = [
        ['Local', 'Visual in enclosure', 'ü'],
        ['', 'Fans Operating', 'ü']
      ];
      
      // Other section (rows 88-89)
      const otherParams = [
        ['Local', 'Sea water Temp', 'C'],
        ['', 'Day Tank temp', 'C']
      ];
    
          // Add Generator parameters
      genParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2]];
        // Add empty columns D-K
        for (let i = 0; i < 8; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Genset Mechanical parameters
      genMechParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2]];
        // Add empty columns D-K
        for (let i = 0; i < 8; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Local parameters
      localParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2]];
        // Add empty columns D-K
        for (let i = 0; i < 8; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Other parameters
      otherParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2]];
        // Add empty columns D-K
        for (let i = 0; i < 8; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'ER Log Data');
    
    // Set column widths to match reference
    ws['!cols'] = [
      { width: 20 }, // Column A (rotated labels)
      { width: 25 }, // Column B (parameters)
      { width: 15 }, // Column C (units)
      { width: 15 }, // Column D (empty data entry)
      { width: 15 }, // Column E (empty data entry)
      { width: 15 }, // Column F (empty data entry)
      { width: 15 }, // Column G (empty data entry)
      { width: 15 }, // Column H (empty data entry)
      { width: 15 }, // Column I (empty data entry)
      { width: 15 }, // Column J (empty data entry)
      { width: 15 }  // Column K (empty data entry)
    ];
    
    // Save file
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Export individual entry with data filled in
  function exportEntryWithData(entry, filename = 'er-log-entry') {
    try {
      console.log('Exporting entry data:', entry);
      
      // Helper function to get nested values from the entry object
      const getValue = (path) => {
        const parts = path.split('.');
        let value = entry;
        for (const part of parts) {
          if (value && typeof value === 'object') {
            value = value[part];
          } else {
            return '';
          }
        }
        return value || '';
      };
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Create worksheet with exact layout from reference and data filled in
      const wsData = [];
      
      // Row 1: Header with Day, Date, Notes
      wsData.push(['', '', '', 'Day 1', '', '', '', getValue('date') || '6-Feb-25', '', '', getValue('route') || 'Notes']);
      
      // Row 2: Additional header info - Time, From Port, To Port
      wsData.push(['', '', '', 'Time:', getValue('time') || '', 'From:', getValue('from') || '', 'To:', getValue('to') || '', '', '']);
      
      // Row 3: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // Row 4: PORT main Engine header
      wsData.push(['', 'PORT main Engine', '', '', '', '', '', '', '', '', '']);
      
      // Row 5: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // PORT main Engine parameters (rows 6-25) with data
      const portParams = [
        ['Engines Advanced (AMS)', 'RPM', 'RPM', getValue('port.rpm')],
        ['', 'Fuel Pressure', 'kPa', getValue('port.fuelPressure')],
        ['', 'Oil Temperature', 'C', getValue('port.oilTemp')],
        ['', 'S W Pressure', 'kPa', getValue('port.swPressure')],
        ['', 'Boost Pressure', 'kPa', getValue('port.boostPressure')],
        ['', 'Scavange air', 'C', getValue('port.scavengeAir')],
        ['', 'Left Exhaust', 'C', getValue('port.leftExhaust')],
        ['', 'Right Exhaust', 'C', getValue('port.rightExhaust')],
        ['', 'Ex O/B Surface temp', 'C', getValue('port.exSurface')],
        ['', 'Fuel Differential', 'kPa', getValue('port.fuelDiff')],
        ['', 'Oil Differential', 'kPa', getValue('port.oilDiff')],
        ['', 'Coolant Temp', 'C', getValue('port.coolantTemp')],
        ['', 'Oil Pressure', 'kPa', getValue('port.oilPressure')],
        ['', 'Trans gear Temp', 'C', getValue('port.transGearTemp')],
        ['', 'Trans oil pressure', 'kPa', getValue('port.transOilPressure')],
        ['', 'Fuel consumption', 'l/h', getValue('port.fuelConsumption')],
        ['', 'Load', '%', getValue('port.loadPct')],
        ['', 'Shaft Flow', 'l/min', getValue('port.shaftFlow')],
        ['', 'Thrust bearing Temp', 'C', getValue('port.thrustBearingTemp')],
        ['', 'Ex Sea water Press', 'kPa', getValue('port.exSeaWaterPress')]
      ];
      
      // Add PORT parameters with data
      portParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Row 26: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // Row 27: STBD main Engine header
      wsData.push(['', 'STBD main Engine', '', '', '', '', '', '', '', '', '']);
      
      // Row 28: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // STBD main Engine parameters (rows 29-48) with data
      const stbdParams = [
        ['Engines Advanced (AMS)', 'RPM', 'RPM', getValue('stbd.rpm')],
        ['', 'Fuel Pressure', 'kPa', getValue('stbd.fuelPressure')],
        ['', 'Oil Temperature', 'C', getValue('stbd.oilTemp')],
        ['', 'S W Pressure', 'kPa', getValue('stbd.swPressure')],
        ['', 'Boost Pressure', 'kPa', getValue('stbd.boostPressure')],
        ['', 'Scavange air', 'C', getValue('stbd.scavengeAir')],
        ['', 'Left Exhaust', 'C', getValue('stbd.leftExhaust')],
        ['', 'Right Exhaust', 'C', getValue('stbd.rightExhaust')],
        ['', 'Ex O/B Surface temp', 'C', getValue('stbd.exSurface')],
        ['', 'Fuel Differential', 'kPa', getValue('stbd.fuelDiff')],
        ['', 'Oil Differential', 'kPa', getValue('stbd.oilDiff')],
        ['', 'Coolant Temp', 'C', getValue('stbd.coolantTemp')],
        ['', 'Oil Pressure', 'kPa', getValue('stbd.oilPressure')],
        ['', 'Trans gear Temp', 'C', getValue('stbd.transGearTemp')],
        ['', 'Trans oil pressure', 'kPa', getValue('stbd.transOilPressure')],
        ['', 'Fuel consumption', 'l/h', getValue('stbd.fuelConsumption')],
        ['', 'Load', '%', getValue('stbd.loadPct')],
        ['', 'Shaft Flow', 'l/min', getValue('stbd.shaftFlow')],
        ['', 'Thrust bearing Temp', 'C', getValue('stbd.thrustBearingTemp')],
        ['', 'Ex Sea water Press', 'kPa', getValue('stbd.exSeaWaterPress')]
      ];
      
      // Add STBD parameters with data
      stbdParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Row 49: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // Row 50: Online Generator header
      wsData.push(['', 'Online Generator', '', '', '', '', '', '', '', '', '']);
      
      // Row 51: Empty
      wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
      
      // Online Generator parameters (rows 52-68) with data
      const genParams = [
        ['Genset Electrical', 'DG1/DG2/DG3', '#', getValue('gen1.running') || getValue('gen2.running') || getValue('gen3.running') || ''],
        ['', 'kW', 'kW', getValue('gen1.kw') || getValue('gen2.kw') || getValue('gen3.kw') || ''],
        ['', 'kVAr', 'kVAr', getValue('gen1.kvar') || getValue('gen2.kvar') || getValue('gen3.kvar') || ''],
        ['', 'Hz', 'Hz', getValue('gen1.hz') || getValue('gen2.hz') || getValue('gen3.hz') || ''],
        ['', 'Amps', 'A', getValue('gen1.amps_a1') || getValue('gen2.amps_a1') || getValue('gen3.amps_a1') || ''],
        ['', 'Voltage', 'V', getValue('gen1.voltage_v1_2') || getValue('gen2.voltage_v1_2') || getValue('gen3.voltage_v1_2') || ''],
        ['', 'RPM', 'RPM', getValue('gen1.rpm') || getValue('gen2.rpm') || getValue('gen3.rpm') || ''],
        ['', 'Fuel consumption', 'l/min', getValue('gen1.fuel_consumption_l_min') || getValue('gen2.fuel_consumption_l_min') || getValue('gen3.fuel_consumption_l_min') || '']
      ];
      
      // Genset Mechanical section (rows 68-85) with data
      const genMechParams = [
        ['Genset Mechanical', 'Load', '%', getValue('gen1.load_pct') || getValue('gen2.load_pct') || getValue('gen3.load_pct') || ''],
        ['', 'Coolants Temp', 'C', getValue('gen1.coolant_temp_°c') || getValue('gen2.coolant_temp_°c') || getValue('gen3.coolant_temp_°c') || ''],
        ['', 'oil pressure', 'kPa', getValue('gen1.oil_pressure_kpa') || getValue('gen2.oil_pressure_kpa') || getValue('gen3.oil_pressure_kpa') || ''],
        ['', 'Fuel Temp', 'C', getValue('gen1.fuel_temp_°c') || getValue('gen2.fuel_temp_°c') || getValue('gen3.fuel_temp_°c') || ''],
        ['', 'Fuel Pressure', 'kPa', getValue('gen1.fuel_pressure_kpa') || getValue('gen2.fuel_pressure_kpa') || getValue('gen3.fuel_pressure_kpa') || ''],
        ['', 'Sea water Pressure', 'kPa', getValue('gen1.sea_water_pressure_kpa') || getValue('gen2.sea_water_pressure_kpa') || getValue('gen3.sea_water_pressure_kpa') || ''],
        ['', 'Oil Temperature', 'C', getValue('gen1.oil_temperature') || getValue('gen2.oil_temperature') || getValue('gen3.oil_temperature') || ''],
        ['', 'Boost Pressure', 'kPa', getValue('gen1.boost_pressure_kpa') || getValue('gen2.boost_pressure_kpa') || getValue('gen3.boost_pressure_kpa') || ''],
        ['', 'Inlet Air Temp', 'C', getValue('gen1.inlet_air_temp_°c') || getValue('gen2.inlet_air_temp_°c') || getValue('gen3.inlet_air_temp_°c') || '']
      ];
      
      // Local section (rows 86-87) with data
      const localParams = [
        ['Local', 'Visual in enclosure', 'ü', getValue('gen1.visual_in_enclosure') || getValue('gen2.visual_in_enclosure') || getValue('gen3.visual_in_enclosure') || ''],
        ['', 'Fans Operating', 'ü', getValue('gen1.fans_operating') || getValue('gen2.fans_operating') || getValue('gen3.fans_operating') || '']
      ];
      
      // Other section (rows 88-89) with data
      const otherParams = [
        ['Local', 'Sea water Temp', 'C', getValue('other.seaWaterTemp') || ''],
        ['', 'Day Tank temp', 'C', getValue('other.dayTankTemp') || '']
      ];
      
      // Add Generator parameters with data
      genParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Genset Mechanical parameters with data
      genMechParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Local parameters with data
      localParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Add Other parameters with data
      otherParams.forEach((row, index) => {
        const wsRow = [row[0], row[1], row[2], row[3]];
        // Add remaining empty columns E-K
        for (let i = 0; i < 7; i++) {
          wsRow.push('');
        }
        wsData.push(wsRow);
      });
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'ER Log Entry');
      
      // Set column widths to match reference
      ws['!cols'] = [
        { width: 20 }, // Column A (rotated labels)
        { width: 25 }, // Column B (parameters)
        { width: 15 }, // Column C (units)
        { width: 15 }, // Column D (data values)
        { width: 15 }, // Column E (empty data entry)
        { width: 15 }, // Column F (empty data entry)
        { width: 15 }, // Column G (empty data entry)
        { width: 15 }, // Column H (empty data entry)
        { width: 15 }, // Column I (empty data entry)
        { width: 15 }, // Column J (empty data entry)
        { width: 15 }  // Column K (empty data entry)
      ];
      
      // Save file
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      return true;
    } catch (e) {
      console.error('Export failed:', e);
      return false;
    }
  }

  // Make export function globally available for Past Entries page
  window.exportEntryWithData = exportEntryWithData;

  function exportHistoricalData() {
    try {
      const entries = JSON.parse(localStorage.getItem('erlog:entries') || '[]');
      if (entries.length === 0) {
        toast('No historical data to export');
        return;
      }
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Headers
      const headers = [
        'Entry Date', 'Entry Time', 'From Port', 'To Port', 'Route/Notes',
        'Generator 1 - kW', 'Generator 1 - kVAr', 'Generator 1 - Hz',
        'Generator 1 - Amps A1', 'Generator 1 - Amps A2', 'Generator 1 - Amps A3',
        'Generator 1 - Voltage V1.2', 'Generator 1 - Voltage V2.3', 'Generator 1 - Voltage V3.1',
        'Generator 1 - RPM', 'Generator 1 - Fuel Consumption', 'Generator 1 - Load %',
        'Generator 1 - Coolant Temp', 'Generator 1 - Oil Pressure', 'Generator 1 - Fuel Temp',
        'Generator 1 - Fuel Pressure', 'Generator 1 - Sea Water Pressure', 'Generator 1 - Oil Temperature',
        'Generator 1 - Boost Pressure', 'Generator 1 - Inlet Air Temp', 'Generator 1 - Engine Hours',
        'Generator 1 - Battery Voltage',
        'Generator 2 - kW', 'Generator 2 - kVAr', 'Generator 2 - Hz',
        'Generator 2 - Amps A1', 'Generator 2 - Amps A2', 'Generator 2 - Amps A3',
        'Generator 2 - Voltage V1.2', 'Generator 2 - Voltage V2.3', 'Generator 2 - Voltage V2.3',
        'Generator 2 - RPM', 'Generator 2 - Fuel Consumption', 'Generator 2 - Load %',
        'Generator 2 - Coolant Temp', 'Generator 2 - Oil Pressure', 'Generator 2 - Fuel Temp',
        'Generator 2 - Fuel Pressure', 'Generator 2 - Sea Water Pressure', 'Generator 2 - Oil Temperature',
        'Generator 2 - Boost Pressure', 'Generator 2 - Inlet Air Temp', 'Generator 2 - Engine Hours',
        'Generator 2 - Battery Voltage',
        'Generator 3 - kW', 'Generator 3 - kVAr', 'Generator 3 - Hz',
        'Generator 3 - Amps A1', 'Generator 3 - Amps A2', 'Generator 3 - Amps A3',
        'Generator 3 - Voltage V1.2', 'Generator 3 - Voltage V2.3', 'Generator 3 - Voltage V3.1',
        'Generator 3 - RPM', 'Generator 3 - Fuel Consumption', 'Generator 3 - Load %',
        'Generator 3 - Coolant Temp', 'Generator 3 - Oil Pressure', 'Generator 3 - Fuel Temp',
        'Generator 3 - Fuel Pressure', 'Generator 3 - Sea Water Pressure', 'Generator 3 - Oil Temperature',
        'Generator 3 - Boost Pressure', 'Generator 3 - Inlet Air Temp', 'Generator 3 - Engine Hours',
        'Generator 3 - Battery Voltage',
        'Port Engine - RPM', 'Port Engine - Fuel Pressure', 'Port Engine - Oil Temp',
        'Port Engine - S/W Pressure', 'Port Engine - Boost Pressure', 'Port Engine - Scavenge Air',
        'Port Engine - Left Exhaust', 'Port Engine - Right Exhaust', 'Port Engine - Ex O/B Surface',
        'Port Engine - Fuel Differential', 'Port Engine - Oil Differential', 'Port Engine - Coolant Temp',
        'Port Engine - Oil Pressure', 'Port Engine - Trans Gear Temp', 'Port Engine - Trans Oil Pressure',
        'Port Engine - Fuel Consumption', 'Port Engine - Load %', 'Port Engine - Shaft Flow',
        'Port Engine - Thrust Bearing Temp', 'Port Engine - Ex Sea Water Press',
        'Starboard Engine - RPM', 'Starboard Engine - Fuel Pressure', 'Starboard Engine - Oil Temp',
        'Starboard Engine - S/W Pressure', 'Starboard Engine - Boost Pressure', 'Starboard Engine - Scavenge Air',
        'Starboard Engine - Left Exhaust', 'Starboard Engine - Right Exhaust', 'Starboard Engine - Ex O/B Surface',
        'Starboard Engine - Fuel Differential', 'Starboard Engine - Oil Differential', 'Starboard Engine - Coolant Temp',
        'Starboard Engine - Oil Pressure', 'Starboard Engine - Trans Gear Temp', 'Starboard Engine - Trans Oil Pressure',
        'Starboard Engine - Fuel Consumption', 'Starboard Engine - Load %', 'Starboard Engine - Shaft Flow',
        'Starboard Engine - Thrust Bearing Temp', 'Starboard Engine - Ex Sea Water Press',
        'Other - Sea Water Temp', 'Other - Day Tank Temp'
      ];
      
      const wsData = [headers];
      
      // Helper function to get nested values from the entry object
      const getValue = (path) => {
        const parts = path.split('.');
        let value = entry;
        for (const part of parts) {
          if (value && typeof value === 'object') {
            value = value[part];
          } else {
            return '';
          }
        }
        return value || '';
      };

      // Add each entry as a row
      entries.forEach(entry => {
        const row = [
          getValue('date'),
          getValue('time'),
          getValue('from'),
          getValue('to'),
          getValue('route'),
          getValue('gen1.kw'), getValue('gen1.kvar'), getValue('gen1.hz'),
          getValue('gen1.amps_a1'), getValue('gen1.amps_a2'), getValue('gen1.amps_a3'),
          getValue('gen1.voltage_v1_2'), getValue('gen1.voltage_v2_3'), getValue('gen1.voltage_v3_1'),
          getValue('gen1.rpm'), getValue('gen1.fuel_consumption_l_min'), getValue('gen1.load_pct'),
          getValue('gen1.coolant_temp_°c'), getValue('gen1.oil_pressure_kpa'), getValue('gen1.fuel_temp_°c'),
          getValue('gen1.fuel_pressure_kpa'), getValue('gen1.sea_water_pressure_kpa'), getValue('gen1.oil_temperature'),
          getValue('gen1.boost_pressure_kpa'), getValue('gen1.inlet_air_temp_°c'), getValue('gen1.engine_hours'),
          getValue('gen1.battery_voltage'),
          getValue('gen2.kw'), getValue('gen2.kvar'), getValue('gen2.hz'),
          getValue('gen2.amps_a1'), getValue('gen2.amps_a2'), getValue('gen2.amps_a3'),
          getValue('gen2.voltage_v1_2'), getValue('gen2.voltage_v2_3'), getValue('gen2.voltage_v3_1'),
          getValue('gen2.rpm'), getValue('gen2.fuel_consumption_l_min'), getValue('gen2.load_pct'),
          getValue('gen2.coolant_temp_°c'), getValue('gen2.oil_pressure_kpa'), getValue('gen2.fuel_temp_°c'),
          getValue('gen2.fuel_pressure_kpa'), getValue('gen2.sea_water_pressure_kpa'), getValue('gen2.oil_temperature'),
          getValue('gen2.boost_pressure_kpa'), getValue('gen2.inlet_air_temp_°c'), getValue('gen2.engine_hours'),
          getValue('gen2.battery_voltage'),
          getValue('gen3.kw'), getValue('gen3.kvar'), getValue('gen3.hz'),
          getValue('gen3.amps_a1'), getValue('gen3.amps_a2'), getValue('gen3.amps_a3'),
          getValue('gen3.voltage_v1_2'), getValue('gen3.voltage_v2_3'), getValue('gen3.voltage_v3_1'),
          getValue('gen3.rpm'), getValue('gen3.fuel_consumption_l_min'), getValue('gen3.load_pct'),
          getValue('gen3.coolant_temp_°c'), getValue('gen3.oil_pressure_kpa'), getValue('gen3.fuel_temp_°c'),
          getValue('gen3.fuel_pressure_kpa'), getValue('gen3.sea_water_pressure_kpa'), getValue('gen3.oil_temperature'),
          getValue('gen3.boost_pressure_kpa'), getValue('gen3.inlet_air_temp_°c'), getValue('gen3.engine_hours'),
          getValue('gen3.battery_voltage'),
          getValue('port.rpm'), getValue('port.fuelPressure'), getValue('port.oilTemp'),
          getValue('port.swPressure'), getValue('port.boostPressure'), getValue('port.scavengeAir'),
          getValue('port.leftExhaust'), getValue('port.rightExhaust'), getValue('port.exSurface'),
          getValue('port.fuelDiff'), getValue('port.oilDiff'), getValue('port.coolantTemp'),
          getValue('port.oilPressure'), getValue('port.transGearTemp'), getValue('port.transOilPressure'),
          getValue('port.fuelConsumption'), getValue('port.loadPct'), getValue('port.shaftFlow'),
          getValue('port.thrustBearingTemp'), getValue('port.exSeaWaterPress'),
          getValue('stbd.rpm'), getValue('stbd.fuelPressure'), getValue('stbd.oilTemp'),
          getValue('stbd.swPressure'), getValue('stbd.boostPressure'), getValue('stbd.scavengeAir'),
          getValue('stbd.leftExhaust'), getValue('stbd.rightExhaust'), getValue('stbd.exSurface'),
          getValue('stbd.fuelDiff'), getValue('stbd.oilDiff'), getValue('stbd.coolantTemp'),
          getValue('stbd.oilPressure'), getValue('stbd.transGearTemp'), getValue('stbd.transOilPressure'),
          getValue('stbd.fuelConsumption'), getValue('stbd.loadPct'), getValue('stbd.shaftFlow'),
          getValue('stbd.thrustBearingTemp'), getValue('stbd.exSeaWaterPress'),
          getValue('other.seaWaterTemp'), getValue('other.dayTankTemp')
        ];
        wsData.push(row);
      });
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Historical Data');
      
      // Auto-size columns
      const colWidths = headers.map(h => Math.max(h.length, 15));
      ws['!cols'] = colWidths.map(w => ({ width: w }));
      
      // Save file
      XLSX.writeFile(wb, `er-log-historical-data-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast(`Exported ${entries.length} entries to Excel`);
    } catch (e) {
      console.error('Export failed:', e);
      toast('Export failed');
    }
  }
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
      
      // Show processing indicator
      const processingIndicator = document.getElementById('processingIndicator');
      if (processingIndicator) {
        processingIndicator.classList.remove('hidden');
      }
      
      await runImageIngestion(filesEl.files);
      
      // Hide processing indicator after completion
      if (processingIndicator) {
        processingIndicator.classList.add('hidden');
      }
      
      toast('Photos processed successfully!');
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

})();

// Toast function - moved outside IIFE for global access
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
      // Map the display labels to the correct field names
      let fieldName = rowLabel.toLowerCase().replace(/[^a-z0-9]+/gi,'_');
      
      // Handle special cases for the new three-phase fields
      if (rowLabel === 'Amps A1 (A)') fieldName = 'amps_a1';
      else if (rowLabel === 'Amps A2 (A)') fieldName = 'amps_a2';
      else if (rowLabel === 'Amps A3 (A)') fieldName = 'amps_a3';
      else if (rowLabel === 'Voltage V1.2 (V)') fieldName = 'voltage_v1_2';
      else if (rowLabel === 'Voltage V2.3 (V)') fieldName = 'voltage_v2_3';
      else if (rowLabel === 'Voltage V3.1 (V)') fieldName = 'voltage_v3_1';
      else if (rowLabel === 'Hz') fieldName = 'hz';
      else if (rowLabel === 'Engine Hours (hrs)') fieldName = 'engine_hours';
      else if (rowLabel === 'Battery Voltage (V)') fieldName = 'battery_voltage';
      else if (rowLabel === 'Coolant Temp (°C)') fieldName = 'coolant_temp_°c';
      else if (rowLabel === 'Oil Pressure (kPa)') fieldName = 'oil_pressure_kpa';
      else if (rowLabel === 'Fuel Temp (°C)') fieldName = 'fuel_temp_°c';
      else if (rowLabel === 'Fuel Pressure (kPa)') fieldName = 'fuel_pressure_kpa';
      else if (rowLabel === 'Sea water Pressure (kPa)') fieldName = 'sea_water_pressure_kpa';
      else if (rowLabel === 'Oil Temperature (°C)') fieldName = 'oil_temperature';
      else if (rowLabel === 'Boost Pressure (kPa)') fieldName = 'boost_pressure_kpa';
      else if (rowLabel === 'Inlet Air Temp (°C)') fieldName = 'inlet_air_temp_°c';
      else if (rowLabel === 'Fuel consumption (L/min)') fieldName = 'fuel_consumption_l_min';
      else if (rowLabel === 'Load (%)') fieldName = 'load_pct';
      
      const key = `gen${id}.${fieldName}`;
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


