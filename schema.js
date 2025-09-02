/* Schema aligned to your Running Log Day photos */
const HOURS_COLUMNS = ["04:00", "08:00", "12:00", "16:00", "19:00", "21:00", "00:00"];

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
    id: 'gen-control',
    title: 'Generators',
    type: 'generator-control',
    options: { ids: [1,2,3] }
  },
  {
    id: 'generators-summary',
    title: 'Generators — Summary',
    type: 'fields',
    columns: 3,
    groups: [
      { title: 'Generator 1', genId: 1, fields: [
        { key: 'gen1.from', label: 'From / At', input: 'text' },
        { key: 'gen1.to', label: 'To', input: 'text' },
        { key: 'gen1.hours', label: 'Hours', input: 'number', step: '0.1' }
      ]},
      { title: 'Generator 2', genId: 2, fields: [
        { key: 'gen2.from', label: 'From / At', input: 'text' },
        { key: 'gen2.to', label: 'To', input: 'text' },
        { key: 'gen2.hours', label: 'Hours', input: 'number', step: '0.1' }
      ]},
      { title: 'Generator 3', genId: 3, fields: [
        { key: 'gen3.from', label: 'From / At', input: 'text' },
        { key: 'gen3.to', label: 'To', input: 'text' },
        { key: 'gen3.hours', label: 'Hours', input: 'number', step: '0.1' }
      ]}
    ]
  },
  {
    id: 'generators-readings',
    title: 'Generators — Hourly Readings',
    type: 'table-groups',
    columns: HOURS_COLUMNS,
    groups: [
      { title: 'Generator 1', genId: 1, keyPrefix: 'gen1', rows: [
        'DG1/DG2/DG3',
        '#',
        'kW',
        'kVAr',
        'Amps',
        'Voltage',
        'RPM',
        'Fuel consumption (l/min)',
        'Load (%)',
        'Coolants Temp (°C)',
        'Oil pressure (kPa)',
        'Fuel Temp (°C)',
        'Fuel Pressure (kPa)',
        'Sea water Pressure (kPa)',
        'Oil Temperature (°C)',
        'Boost Pressure (kPa)',
        'Inlet Air Temp (°C)',
        'Visual in enclosure (✓)',
        'Fans Operating (✓)',
        'Sea water Temp (°C)',
        'Day Tank temp (°C)'
      ] },
      { title: 'Generator 2', genId: 2, keyPrefix: 'gen2', rows: [
        'DG1/DG2/DG3',
        '#',
        'kW',
        'kVAr',
        'Amps',
        'Voltage',
        'RPM',
        'Fuel consumption (l/min)',
        'Load (%)',
        'Coolants Temp (°C)',
        'Oil pressure (kPa)',
        'Fuel Temp (°C)',
        'Fuel Pressure (kPa)',
        'Sea water Pressure (kPa)',
        'Oil Temperature (°C)',
        'Boost Pressure (kPa)',
        'Inlet Air Temp (°C)',
        'Visual in enclosure (✓)',
        'Fans Operating (✓)',
        'Sea water Temp (°C)',
        'Day Tank temp (°C)'
      ] },
      { title: 'Generator 3', genId: 3, keyPrefix: 'gen3', rows: [
        'DG1/DG2/DG3',
        '#',
        'kW',
        'kVAr',
        'Amps',
        'Voltage',
        'RPM',
        'Fuel consumption (l/min)',
        'Load (%)',
        'Coolants Temp (°C)',
        'Oil pressure (kPa)',
        'Fuel Temp (°C)',
        'Fuel Pressure (kPa)',
        'Sea water Pressure (kPa)',
        'Oil Temperature (°C)',
        'Boost Pressure (kPa)',
        'Inlet Air Temp (°C)',
        'Visual in enclosure (✓)',
        'Fans Operating (✓)',
        'Sea water Temp (°C)',
        'Day Tank temp (°C)'
      ] }
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



