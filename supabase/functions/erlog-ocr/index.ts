// Supabase Edge Function (Deno) — erlog-ocr
// Uses OpenAI Vision to extract readings from one or more photos
// Returns: { activeGenerators?: number[], entries: { path: string, value: string | number | boolean }[] }

// Deploy:
// supabase functions deploy erlog-ocr
// supabase secrets set OPENAI_API_KEY=...

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MODEL = 'gpt-4o-mini';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function bad(msg: string, code = 400) {
  return new Response(msg, { status: code, headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain;charset=UTF-8' } });
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const ALLOWED_KEYS = [
  // Main engines (PORT/STBD)
  'port.rpm','port.fuelPressure','port.oilTemp','port.swPressure','port.boostPressure','port.scavengeAir','port.leftExhaust','port.rightExhaust','port.exSurface','port.fuelDiff','port.oilDiff','port.coolantTemp','port.oilPressure','port.transGearTemp','port.transOilPressure','port.fuelConsumption','port.loadPct','port.shaftFlow','port.thrustBearingTemp','port.exSeaWaterPress',
  'stbd.rpm','stbd.fuelPressure','stbd.oilTemp','stbd.swPressure','stbd.boostPressure','stbd.scavengeAir','stbd.leftExhaust','stbd.rightExhaust','stbd.exSurface','stbd.fuelDiff','stbd.oilDiff','stbd.coolantTemp','stbd.oilPressure','stbd.transGearTemp','stbd.transOilPressure','stbd.fuelConsumption','stbd.loadPct','stbd.shaftFlow','stbd.thrustBearingTemp','stbd.exSeaWaterPress',
  // Generators matrix (free-form; one-valued, not hourly)
  'gen1.kw','gen1.kvar','gen1.amps_a','gen1.voltage_v','gen1.rpm','gen1.fuel_consumption_l_min','gen1.load_pct','gen1.coolant_temp_°c','gen1.oil_pressure_kpa','gen1.fuel_temp_°c','gen1.fuel_pressure_kpa','gen1.sea_water_pressure_kpa','gen1.oil_temperature','gen1.boost_pressure_kpa','gen1.inlet_air_temp_°c','gen1.visual_in_enclosure_check','gen1.fans_operating_check','gen1.engine_hours','gen1.battery_voltage','gen1.fuel_consumption_lt_h',
  'gen2.kw','gen2.kvar','gen2.amps_a','gen2.voltage_v','gen2.rpm','gen2.fuel_consumption_l_min','gen2.load_pct','gen2.coolant_temp_°c','gen2.oil_pressure_kpa','gen2.fuel_temp_°c','gen2.fuel_pressure_kpa','gen2.sea_water_pressure_kpa','gen2.oil_temperature','gen2.boost_pressure_kpa','gen2.inlet_air_temp_°c','gen2.visual_in_enclosure_check','gen2.fans_operating_check','gen2.engine_hours','gen2.battery_voltage','gen2.fuel_consumption_lt_h',
  'gen3.kw','gen3.kvar','gen3.amps_a','gen3.voltage_v','gen3.rpm','gen3.fuel_consumption_l_min','gen3.load_pct','gen3.coolant_temp_°c','gen3.oil_pressure_kpa','gen3.fuel_temp_°c','gen3.fuel_pressure_kpa','gen3.sea_water_pressure_kpa','gen3.oil_temperature','gen3.boost_pressure_kpa','gen3.inlet_air_temp_°c','gen3.visual_in_enclosure_check','gen3.fans_operating_check','gen3.engine_hours','gen3.battery_voltage','gen3.fuel_consumption_lt_h',
  // Other
  'other.seaWaterTemp','other.dayTankTemp'
];

const SYSTEM_PROMPT = `You are extracting numeric readings from engine room instrument photos.
Output strict JSON: { "activeGenerators": number[], "entries": [{"path": string, "value": string|number|boolean}] }

IMPORTANT: Look for ALL visible numeric values on generator control panels, including:
- Engine speed (RPM)
- Load percentage (%)
- Fuel consumption (Lt/h)
- Coolant temperature (°C)
- Oil pressure (kPa)
- Engine hours (hrs)
- Fuel temperature (°C)
- Fuel pressure (kPa)
- Oil temperature (°C)
- Sea water pressure (kPa)
- Battery voltage (V)
- Boost pressure (kPa)
- Inlet air temperature (°C)
- Voltage readings (V1.2, V2.3, V3.1)
- Current readings (A1, A2, A3)
- Power factor (PF1, PF2, PF3)
- Active power (kW)
- Reactive power (kVAr)
- Frequency (Hz)

Rules:
- Use ONLY these allowed paths when possible: ${ALLOWED_KEYS.join(', ')}
- If a value has units, convert to the numeric value only where reasonable (e.g., 624 kPa → 624, 23 Lt/h → 23).
- For STBD/PORT engine gauges, map to stbd.* or port.* accordingly.
- For generator panels, detect which generator(s) the image shows and set activeGenerators.
- Look for both analog gauge readings AND digital readouts - digital values are often more accurate.
- Pay attention to bar graphs and their associated digital values.
- If uncertain, omit that entry rather than guessing.
- Extract as many values as you can see clearly on the panel.
`;

async function callOpenAI(imageDataUrls: string[]): Promise<any> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract readings and return the JSON.' },
        ...imageDataUrls.map((u) => ({ type: 'image_url', image_url: { url: u } }))
      ]
    }
  ];

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0 })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    // Filter to allowed keys only
    const entries = Array.isArray(json.entries) ? json.entries.filter((e: any) => ALLOWED_KEYS.includes(e.path)) : [];
    const activeGenerators = Array.isArray(json.activeGenerators) ? json.activeGenerators.filter((n: any) => [1,2,3].includes(n)) : [];
    return { entries, activeGenerators };
  } catch {
    return { entries: [], activeGenerators: [] };
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') return bad('Use POST');
    if (!OPENAI_API_KEY) return bad('OPENAI_API_KEY not set', 500);
    
    const form = await req.formData();
    const files: File[] = [];
    
    // Extract files and validate
    for (const [k, v] of form.entries()) {
      if (v instanceof File && v.size > 0) {
              // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(v.type)) {
        if (v.type === 'image/heic' || v.type === 'image/heif') {
          return bad(`HEIC/HEIF format not supported. Please convert your iPhone photos to JPEG before uploading. You can do this by:
1. Opening Photos app on iPhone
2. Selecting the photo
3. Tap Share → Save to Files
4. Choose JPEG format
Or use a converter app.`, 400);
        }
        return bad(`Unsupported file type: ${v.type}. Supported types: ${allowedTypes.join(', ')}`, 400);
      }
        // Check file size (max 10MB)
        if (v.size > 10 * 1024 * 1024) {
          return bad('File too large. Maximum size: 10MB', 400);
        }
        files.push(v);
      }
    }
    
    if (files.length === 0) return bad('No valid image files found');
    
    console.log(`Processing ${files.length} files:`, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const dataUrls = await Promise.all(files.map((f) => toDataUrl(f)));
    const result = await callOpenAI(dataUrls);
    
    return new Response(JSON.stringify(result), { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });
    
  } catch (e) {
    console.error('Edge function error:', e);
    return bad(`Error: ${e.message}`, 500);
  }
});


