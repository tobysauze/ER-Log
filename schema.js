/* Schema aligned to your Running Log Day photos */
const HOURS_COLUMNS = ["08:00", "12:00", "16:00", "19:00", "21:00", "00:00"];

const ENGINE_ROOM_SCHEMA = [
  {
    id: 'header',
    title: 'Running Log Day — Header',
    type: 'fields',
    columns: 4,
    fields: [
      { key: 'date', label: 'Date', input: 'date', required: true },
      { key: 'time', label: 'Time', input: 'time', required: true },
      { key: 'from', label: 'From (Port)', input: 'text' },
      { key: 'to', label: 'To (Port)', input: 'text' },
      { key: 'route', label: 'Route / Notes', input: 'text', span: 2 }
    ]
  },
  {
    id: 'generators',
    title: 'Generators',
    type: 'composite',
    children: [
      { subtype: 'generator-control', options: { ids: [1,2,3] } },
      { subtype: 'gen-matrix', title: 'Online Generator Readings', rows: [
        'kW',
        'kVAr',
        'Hz',
        'Amps A1 (A)',
        'Amps A2 (A)', 
        'Amps A3 (A)',
        'Voltage V1.2 (V)',
        'Voltage V2.3 (V)',
        'Voltage V3.1 (V)',
        'RPM',
        'Fuel consumption (L/min)',
        'Load (%)',
        'Coolant Temp (°C)',
        'Oil Pressure (kPa)',
        'Fuel Temp (°C)',
        'Fuel Pressure (kPa)',
        'Sea water Pressure (kPa)',
        'Oil Temperature (°C)',
        'Boost Pressure (kPa)',
        'Inlet Air Temp (°C)',
        'Engine Hours (hrs)',
        'Battery Voltage (V)',
        'Visual in enclosure (check)',
        'Fans Operating (check)'
      ] }
    ]
  },
  {
    id: 'main-engines',
    title: 'Main Engines — Running Log Day',
    type: 'fields',
    columns: 2,
    groups: [
      {
        title: 'PORT main Engine',
        fields: [
          { key: 'port.rpm', label: 'RPM', input: 'number' },
          { key: 'port.fuelPressure', label: 'Fuel Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'port.oilTemp', label: 'Oil Temperature (°C)', input: 'number', step: '0.1' },
          { key: 'port.swPressure', label: 'S/W Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'port.boostPressure', label: 'Boost Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'port.scavengeAir', label: 'Scavenge air (°C)', input: 'number', step: '0.1' },
          { key: 'port.leftExhaust', label: 'Left Exhaust (°C)', input: 'number', step: '0.1' },
          { key: 'port.rightExhaust', label: 'Right Exhaust (°C)', input: 'number', step: '0.1' },
          { key: 'port.exSurface', label: 'Ex O/B Surface temp (°C)', input: 'number', step: '0.1' },
          { key: 'port.fuelDiff', label: 'Fuel Differential (kPa)', input: 'number', step: '0.1' },
          { key: 'port.oilDiff', label: 'Oil Differential (kPa)', input: 'number', step: '0.1' },
          { key: 'port.coolantTemp', label: 'Coolant Temp (°C)', input: 'number', step: '0.1' },
          { key: 'port.oilPressure', label: 'Oil Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'port.transGearTemp', label: 'Trans gear Temp (°C)', input: 'number', step: '0.1' },
          { key: 'port.transOilPressure', label: 'Trans oil pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'port.fuelConsumption', label: 'Fuel consumption (L/h)', input: 'number', step: '0.1' },
          { key: 'port.loadPct', label: 'Load (%)', input: 'number', step: '0.1' },
          { key: 'port.shaftFlow', label: 'Shaft Flow (L/min)', input: 'number', step: '0.1' },
          { key: 'port.thrustBearingTemp', label: 'Thrust bearing Temp (°C)', input: 'number', step: '0.1' },
          { key: 'port.exSeaWaterPress', label: 'Ex Sea water press (kPa)', input: 'number', step: '0.1' }
        ]
      },
      {
        title: 'STBD main Engine',
        fields: [
          { key: 'stbd.rpm', label: 'RPM', input: 'number' },
          { key: 'stbd.fuelPressure', label: 'Fuel Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.oilTemp', label: 'Oil Temperature (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.swPressure', label: 'S/W Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.boostPressure', label: 'Boost Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.scavengeAir', label: 'Scavenge air (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.leftExhaust', label: 'Left Exhaust (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.rightExhaust', label: 'Right Exhaust (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.exSurface', label: 'Ex O/B Surface temp (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.fuelDiff', label: 'Fuel Differential (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.oilDiff', label: 'Oil Differential (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.coolantTemp', label: 'Coolant Temp (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.oilPressure', label: 'Oil Pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.transGearTemp', label: 'Trans gear Temp (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.transOilPressure', label: 'Trans oil pressure (kPa)', input: 'number', step: '0.1' },
          { key: 'stbd.fuelConsumption', label: 'Fuel consumption (L/h)', input: 'number', step: '0.1' },
          { key: 'stbd.loadPct', label: 'Load (%)', input: 'number', step: '0.1' },
          { key: 'stbd.shaftFlow', label: 'Shaft Flow (L/min)', input: 'number', step: '0.1' },
          { key: 'stbd.thrustBearingTemp', label: 'Thrust bearing Temp (°C)', input: 'number', step: '0.1' },
          { key: 'stbd.exSeaWaterPress', label: 'Ex Sea water press (kPa)', input: 'number', step: '0.1' }
        ]
      }
    ]
  }
  ,
  {
    id: 'other',
    title: 'Other',
    type: 'fields',
    columns: 2,
    fields: [
      { key: 'other.seaWaterTemp', label: 'Sea water Temp (°C)', input: 'number', step: '0.1' },
      { key: 'other.dayTankTemp', label: 'Day Tank temp (°C)', input: 'number', step: '0.1' }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.ENGINE_ROOM_SCHEMA = ENGINE_ROOM_SCHEMA;
  window.HOURS_COLUMNS = HOURS_COLUMNS;
}



