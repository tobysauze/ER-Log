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
      { key: 'from', label: 'From (Port)', input: 'text' },
      { key: 'to', label: 'To (Port)', input: 'text' },
      { key: 'route', label: 'Route / Notes', input: 'text', span: 2 }
    ]
  },
  {
    id: 'main-engines',
    title: 'Main Engines — Running Log Day',
    type: 'table-groups',
    columns: HOURS_COLUMNS,
    groups: [
      {
        title: 'PORT main Engine',
        keyPrefix: 'port',
        rows: [
          'RPM',
          'Fuel Pressure (kPa)',
          'Oil Temperature (°C)',
          'S/W Pressure (kPa)',
          'Boost Pressure (kPa)',
          'Scavenge air (°C)',
          'Left Exhaust (°C)',
          'Right Exhaust (°C)',
          'Ex O/B Surface temp (°C)',
          'Fuel Differential (kPa)',
          'Oil Differential (kPa)',
          'Coolant Temp (°C)',
          'Oil Pressure (kPa)',
          'Trans gear Temp (°C)',
          'Trans oil pressure (kPa)',
          'Fuel consumption (L/h)',
          'Load (%)',
          'Shaft Flow (L/min)',
          'Thrust bearing Temp (°C)',
          'Ex Sea water press (kPa)'
        ]
      },
      {
        title: 'STBD main Engine',
        keyPrefix: 'stbd',
        rows: [
          'RPM',
          'Fuel Pressure (kPa)',
          'Oil Temperature (°C)',
          'S/W Pressure (kPa)',
          'Boost Pressure (kPa)',
          'Scavenge air (°C)',
          'Left Exhaust (°C)',
          'Right Exhaust (°C)',
          'Ex O/B Surface temp (°C)',
          'Fuel Differential (kPa)',
          'Oil Differential (kPa)',
          'Coolant Temp (°C)',
          'Oil Pressure (kPa)',
          'Trans gear Temp (°C)',
          'Trans oil pressure (kPa)',
          'Fuel consumption (L/h)',
          'Load (%)',
          'Shaft Flow (L/min)',
          'Thrust bearing Temp (°C)',
          'Ex Sea water press (kPa)'
        ]
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.ENGINE_ROOM_SCHEMA = ENGINE_ROOM_SCHEMA;
  window.HOURS_COLUMNS = HOURS_COLUMNS;
}



