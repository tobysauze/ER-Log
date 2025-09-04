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
  // Generators matrix - updated for three-phase readings
  'gen1.kw','gen1.kvar','gen1.hz','gen1.amps_a1','gen1.amps_a2','gen1.amps_a3','gen1.voltage_v1_2','gen1.voltage_v2_3','gen1.voltage_v3_1','gen1.rpm','gen1.fuel_consumption_l_min','gen1.load_pct','gen1.coolant_temp_°c','gen1.oil_pressure_kpa','gen1.fuel_temp_°c','gen1.fuel_pressure_kpa','gen1.sea_water_pressure_kpa','gen1.oil_temperature','gen1.boost_pressure_kpa','gen1.inlet_air_temp_°c','gen1.engine_hours','gen1.battery_voltage','gen1.visual_in_enclosure_check','gen1.fans_operating_check',
  'gen2.kw','gen2.kvar','gen2.hz','gen2.amps_a1','gen2.amps_a2','gen2.amps_a3','gen2.voltage_v1_2','gen2.voltage_v2_3','gen2.voltage_v3_1','gen2.rpm','gen2.fuel_consumption_l_min','gen2.load_pct','gen2.coolant_temp_°c','gen2.oil_pressure_kpa','gen2.fuel_temp_°c','gen2.fuel_pressure_kpa','gen2.sea_water_pressure_kpa','gen2.oil_temperature','gen2.boost_pressure_kpa','gen2.inlet_air_temp_°c','gen2.engine_hours','gen2.battery_voltage','gen2.visual_in_enclosure_check','gen2.fans_operating_check',
  'gen3.kw','gen3.kvar','gen3.hz','gen3.amps_a1','gen3.amps_a2','gen3.amps_a3','gen3.voltage_v1_2','gen3.voltage_v2_3','gen3.voltage_v3_1','gen3.rpm','gen3.fuel_consumption_l_min','gen3.load_pct','gen3.coolant_temp_°c','gen3.oil_pressure_kpa','gen3.fuel_temp_°c','gen3.fuel_pressure_kpa','gen3.sea_water_pressure_kpa','gen3.oil_temperature','gen3.boost_pressure_kpa','gen3.inlet_air_temp_°c','gen3.engine_hours','gen3.battery_voltage','gen3.visual_in_enclosure_check','gen3.fans_operating_check',
  // Other
  'other.seaWaterTemp','other.dayTankTemp'
];

const SYSTEM_PROMPT = `You are extracting numeric readings from engine room instrument photos.
Output strict JSON: { "activeGenerators": number[], "entries": [{"path": string, "value": string|number|boolean}] }

**CRITICAL INSTRUCTION: TAKE YOUR TIME AND BE EXTREMELY THOROUGH. This is a generator control panel with many critical readings. Examine every single detail methodically.**

**ANALYSIS STRATEGY:**
1. Start with the large circular gauges (RPM, Coolant Temp, Oil Pressure)
2. Look at all bar graphs (Load %, Fuel consumption)
3. Examine every rectangular box and digital display
4. Scan for any text labels followed by numbers
5. Look for both analog and digital readings
6. Check corners, edges, and small displays
7. Read every single number you can see

**MUST FIND THESE READINGS:**
- Engine speed (RPM) - usually large circular gauge
- Load percentage (%) - often bar graph
- Fuel consumption (Lt/h) - often bar graph
- Coolant temperature (°C) - circular gauge + digital display
- Oil pressure (kPa) - circular gauge + digital display
- Engine hours (hrs) - rectangular box display
- Fuel temperature (°C) - rectangular box display
- Fuel pressure (kPa) - rectangular box display
- Oil temperature (°C) - rectangular box display
- Sea water pressure (kPa) - rectangular box display
- Battery voltage (V) - rectangular box display
- Boost pressure (kPa) - rectangular box display
- Inlet air temperature (°C) - rectangular box display
- **Three-phase voltage readings: V1.2, V2.3, V3.1 (capture ALL three)**
- **Three-phase current readings: A1, A2, A3 (capture ALL three)**
- Power factor (PF1, PF2, PF3)
- Active power (kW)
- Reactive power (kVAr)
- Frequency (Hz)

**LOOK EVERYWHERE:**
- Main gauges (circular)
- Bar graphs (vertical/horizontal)
- Digital displays (rectangular boxes)
- Small text labels with numbers
- Corner displays
- Status indicators
- Any numeric value visible

**CRITICAL for three-phase monitoring:**
- Capture ALL voltage readings (V1.2, V2.3, V3.1) - don't just pick one
- Capture ALL current readings (A1, A2, A3) - don't just pick one
- These are essential for detecting phase imbalances

**IMPORTANT for gauge readings:**
- Look for BOTH analog needle positions AND digital readouts
- Digital readouts are usually more accurate than analog needle positions
- Pay attention to units (°C, kPa, V, A, etc.) and convert to numeric values
- For temperature gauges, look for the digital display in the center
- For pressure gauges, look for both analog and digital readings

**CRITICAL for generator panel data extraction:**
- Look for ALL rectangular boxes and digital displays showing values
- Common readings to find: Engine Hours (hrs), Fuel Temp (°C), Fuel Pressure (kPa), Oil Temp (°C), Sea Water Press (kPa), Battery Voltage (V), Boost Pressure (kPa), Inlet Air Temp (°C)
- These readings are often displayed in small rectangular boxes or digital readouts
- Don't just focus on the large circular gauges - scan the entire panel for any numeric values
- Look for both the main gauge readings AND the smaller digital displays
- Pay special attention to any text labels followed by numbers (e.g., "Fuel Temp 38°C")

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
  // First pass: Comprehensive extraction
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'ANALYZE THOROUGHLY: This is a generator control panel. Take your time to examine EVERY detail. Look at every number, every gauge, every digital display, every rectangular box, every label. Extract ALL possible readings. Be methodical and thorough.' },
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
    body: JSON.stringify({ 
      model: MODEL, 
      messages, 
      temperature: 0,
      max_tokens: 2000, // Increased from default
      presence_penalty: 0.1, // Encourage more comprehensive responses
      frequency_penalty: 0.1 // Encourage variety in extraction
    })
  });
  
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    
    // Filter to allowed keys only
    let entries = Array.isArray(json.entries) ? json.entries.filter((e: any) => ALLOWED_KEYS.includes(e.path)) : [];
    const activeGenerators = Array.isArray(json.activeGenerators) ? json.activeGenerators.filter((n: any) => [1,2,3].includes(n)) : [];
    
    // If we got very few entries, try a second pass with more specific instructions
    if (entries.length < 8 && imageDataUrls.length > 0) {
      console.log('First pass yielded few entries, attempting second pass...');
      
      const secondPassMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'SECOND PASS - EMERGENCY RECOVERY: The first analysis was incomplete. This is your last chance to extract ALL data. Look at this image with MAXIMUM intensity. Examine EVERY pixel, EVERY corner, EVERY display. Look for: Engine Hours (hrs), Fuel Temp (°C), Fuel Pressure (kPa), Oil Temp (°C), Sea Water Press (kPa), Battery Voltage (V), Boost Pressure (kPa), Inlet Air Temp (°C), RPM, Load (%), Fuel consumption (Lt/h), Coolant Temp (°C), Oil Pressure (kPa), Voltage readings (V1.2, V2.3, V3.1), Current readings (A1, A2, A3), Power (kW, kVAr), Frequency (Hz). Extract EVERY SINGLE NUMBER you can see. Be exhaustive.' },
            ...imageDataUrls.map((u) => ({ type: 'image_url', image_url: { url: u } }))
          ]
        }
      ];
      
      const secondResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          model: MODEL, 
          messages: secondPassMessages, 
          temperature: 0,
          max_tokens: 2000
        })
      });
      
      if (secondResp.ok) {
        const secondData = await secondResp.json();
        const secondText = secondData.choices?.[0]?.message?.content ?? '';
        try {
          const secondJsonStart = secondText.indexOf('{');
          const secondJsonEnd = secondText.lastIndexOf('}');
          const secondJson = JSON.parse(secondText.slice(secondJsonStart, secondJsonEnd + 1));
          const secondEntries = Array.isArray(secondJson.entries) ? secondJson.entries.filter((e: any) => ALLOWED_KEYS.includes(e.path)) : [];
          
          // Combine entries, avoiding duplicates
          const combinedEntries = [...entries];
          secondEntries.forEach(entry => {
            if (!combinedEntries.some(e => e.path === entry.path)) {
              combinedEntries.push(entry);
            }
          });
          
          entries = combinedEntries;
          console.log(`Second pass added ${secondEntries.length} entries, total: ${entries.length}`);
          
          // If still missing data, try a third pass with different approach
          if (entries.length < 12 && imageDataUrls.length > 0) {
            console.log('Still missing data, attempting third pass...');
            
            const thirdPassMessages = [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'THIRD PASS - FINAL ATTEMPT: Use a completely different approach. Instead of looking for specific readings, scan the image systematically: top to bottom, left to right. Look for ANY number, ANY display, ANY gauge, ANY text with numbers. Focus on: 1) Large circular gauges, 2) Bar graphs, 3) Rectangular digital displays, 4) Small text labels, 5) Corner displays, 6) Status indicators. Extract EVERY numeric value visible, regardless of what it represents. Be methodical and thorough.' },
                  ...imageDataUrls.map((u) => ({ type: 'image_url', image_url: { url: u } }))
                ]
              }
            ];
            
            const thirdResp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                model: MODEL, 
                messages: thirdPassMessages, 
                temperature: 0,
                max_tokens: 2000
              })
            });
            
            if (thirdResp.ok) {
              const thirdData = await thirdResp.json();
              const thirdText = thirdData.choices?.[0]?.message?.content ?? '';
              try {
                const thirdJsonStart = thirdText.indexOf('{');
                const thirdJsonEnd = thirdText.lastIndexOf('}');
                const thirdJson = JSON.parse(thirdText.slice(thirdJsonStart, thirdJsonEnd + 1));
                const thirdEntries = Array.isArray(thirdJson.entries) ? thirdJson.entries.filter((e: any) => ALLOWED_KEYS.includes(e.path)) : [];
                
                // Combine entries, avoiding duplicates
                thirdEntries.forEach(entry => {
                  if (!combinedEntries.some(e => e.path === entry.path)) {
                    combinedEntries.push(entry);
                  }
                });
                
                entries = combinedEntries;
                console.log(`Third pass added ${thirdEntries.length} entries, total: ${entries.length}`);
              } catch (e) {
                console.log('Third pass parsing failed:', e);
              }
            }
          }
        } catch (e) {
          console.log('Second pass parsing failed:', e);
        }
      }
    }
    
    return { entries, activeGenerators };
  } catch (e) {
    console.error('OpenAI response parsing failed:', e);
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


