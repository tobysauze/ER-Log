/*
  This schema defines all data points for the Engine Room Log.
  It is intentionally verbose and editable so we can match the paper log exactly.
  You can tweak labels/keys without touching app logic.
*/

const HOURS_COLUMNS = ["0000","0200","0400","0600","0800","1000","1200","1400","1600","1800","2000","2200"];

const ENGINE_ROOM_SCHEMA = [
  {
    id: 'header',
    title: 'Header',
    type: 'fields',
    columns: 4,
    fields: [
      { key: 'date', label: 'Date', input: 'date', required: true },
      { key: 'from', label: 'From / At', input: 'text' },
      { key: 'to', label: 'To', input: 'text' },
      { key: 'eow', label: 'Engineer on Watch', input: 'text' },
      { key: 'position', label: 'Position / Location', input: 'text', span: 2 },
      { key: 'weather', label: 'Weather', input: 'text' },
      { key: 'seaState', label: 'Sea State', input: 'text' }
    ]
  },
  {
    id: 'generators-summary',
    title: 'Generators — Summary',
    type: 'fields',
    columns: 3,
    groups: [
      {
        title: 'Generator 1',
        fields: [
          { key: 'gen1.from', label: 'From / At', input: 'text' },
          { key: 'gen1.to', label: 'To', input: 'text' },
          { key: 'gen1.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      },
      {
        title: 'Generator 2',
        fields: [
          { key: 'gen2.from', label: 'From / At', input: 'text' },
          { key: 'gen2.to', label: 'To', input: 'text' },
          { key: 'gen2.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      },
      {
        title: 'Generator 3',
        fields: [
          { key: 'gen3.from', label: 'From / At', input: 'text' },
          { key: 'gen3.to', label: 'To', input: 'text' },
          { key: 'gen3.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      }
    ]
  },
  {
    id: 'generators-readings',
    title: 'Generators — Hourly Readings',
    type: 'table-groups',
    columns: HOURS_COLUMNS,
    groups: [
      {
        title: 'Generator 1',
        rows: ['kW', 'Amps', 'Voltage', 'RPM', 'Oil Pressure (bar)', 'Coolant Temp (°C)']
      },
      {
        title: 'Generator 2',
        rows: ['kW', 'Amps', 'Voltage', 'RPM', 'Oil Pressure (bar)', 'Coolant Temp (°C)']
      },
      {
        title: 'Generator 3',
        rows: ['kW', 'Amps', 'Voltage', 'RPM', 'Oil Pressure (bar)', 'Coolant Temp (°C)']
      }
    ]
  },
  {
    id: 'air-compressors',
    title: 'Air Compressors',
    type: 'fields',
    columns: 3,
    groups: [
      {
        title: 'Comp 1',
        fields: [
          { key: 'air.comp1.hp', label: 'HP (bar)', input: 'number', step: '0.1' },
          { key: 'air.comp1.temp', label: 'Temp (°C)', input: 'number', step: '0.1' },
          { key: 'air.comp1.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      },
      {
        title: 'Comp 2',
        fields: [
          { key: 'air.comp2.hp', label: 'HP (bar)', input: 'number', step: '0.1' },
          { key: 'air.comp2.temp', label: 'Temp (°C)', input: 'number', step: '0.1' },
          { key: 'air.comp2.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      }
    ]
  },
  {
    id: 'chilled-water',
    title: 'Chilled Water Plant',
    type: 'fields',
    columns: 6,
    fields: [
      { key: 'cwp.brineIn', label: 'Brine In (°C)', input: 'number', step: '0.1' },
      { key: 'cwp.brineOut', label: 'Brine Out (°C)', input: 'number', step: '0.1' },
      { key: 'cwp.chillTemp', label: 'Chilled Water Temp (°C)', input: 'number', step: '0.1' },
      { key: 'cwp.swp', label: 'S/W Press (bar)', input: 'number', step: '0.1' },
      { key: 'cwp.comp1Hours', label: 'Comp 1 Hours', input: 'number', step: '0.1' },
      { key: 'cwp.comp2Hours', label: 'Comp 2 Hours', input: 'number', step: '0.1' }
    ]
  },
  {
    id: 'water-makers',
    title: 'Water Makers',
    type: 'fields',
    columns: 6,
    groups: [
      {
        title: 'Water Maker No.1',
        fields: [
          { key: 'wm1.lp', label: 'LP (bar)', input: 'number', step: '0.1' },
          { key: 'wm1.hp', label: 'HP (bar)', input: 'number', step: '0.1' },
          { key: 'wm1.flow', label: 'Flow (L/h)', input: 'number', step: '0.1' },
          { key: 'wm1.salinity', label: 'Product Salinity (ppm)', input: 'number', step: '1' },
          { key: 'wm1.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      },
      {
        title: 'Water Maker No.2',
        fields: [
          { key: 'wm2.lp', label: 'LP (bar)', input: 'number', step: '0.1' },
          { key: 'wm2.hp', label: 'HP (bar)', input: 'number', step: '0.1' },
          { key: 'wm2.flow', label: 'Flow (L/h)', input: 'number', step: '0.1' },
          { key: 'wm2.salinity', label: 'Product Salinity (ppm)', input: 'number', step: '1' },
          { key: 'wm2.hours', label: 'Hours', input: 'number', step: '0.1' }
        ]
      }
    ]
  },
  {
    id: 'temperatures',
    title: 'Temperatures',
    type: 'fields',
    columns: 4,
    fields: [
      { key: 'temps.erAmbient', label: 'ER Ambient (°C)', input: 'number', step: '0.1' },
      { key: 'temps.engineRoomBilge', label: 'Bilge (°C)', input: 'number', step: '0.1' },
      { key: 'temps.coolingIn', label: 'Cooling In (°C)', input: 'number', step: '0.1' },
      { key: 'temps.coolingOut', label: 'Cooling Out (°C)', input: 'number', step: '0.1' }
    ]
  },
  {
    id: 'domestic-water',
    title: 'Domestic Fresh Water',
    type: 'fields',
    columns: 5,
    fields: [
      { key: 'domestic.filterIn', label: 'Filter In (bar)', input: 'number', step: '0.1' },
      { key: 'domestic.filterOut', label: 'Filter Out (bar)', input: 'number', step: '0.1' },
      { key: 'domestic.uv', label: 'UV Status', input: 'text' },
      { key: 'domestic.pump', label: 'Pump Status', input: 'text' },
      { key: 'domestic.tankTemp', label: 'Tank Temp (°C)', input: 'number', step: '0.1' }
    ]
  },
  {
    id: 'domestic-hot',
    title: 'Domestic Hot Water',
    type: 'fields',
    columns: 4,
    fields: [
      { key: 'hot.supplyTemp', label: 'Supply Temp (°C)', input: 'number', step: '0.1' },
      { key: 'hot.returnTemp', label: 'Return Temp (°C)', input: 'number', step: '0.1' },
      { key: 'hot.circPump', label: 'Circ Pump', input: 'text' },
      { key: 'hot.booster', label: 'Booster', input: 'text' }
    ]
  },
  {
    id: 'preheating',
    title: 'Preheating Plant',
    type: 'fields',
    columns: 4,
    fields: [
      { key: 'preheat.temp', label: 'Temp (°C)', input: 'number', step: '0.1' },
      { key: 'preheat.press', label: 'Pressure (bar)', input: 'number', step: '0.1' },
      { key: 'preheat.status', label: 'Status', input: 'text' },
      { key: 'preheat.notes', label: 'Notes', input: 'text' }
    ]
  },
  {
    id: 'tanks',
    title: 'Tank Levels',
    type: 'fields',
    columns: 6,
    fields: [
      { key: 'tanks.fuel.day', label: 'Fuel Day Tank (%)', input: 'number', step: '0.1' },
      { key: 'tanks.fuel.storageP', label: 'Fuel Storage Port (%)', input: 'number', step: '0.1' },
      { key: 'tanks.fuel.storageS', label: 'Fuel Storage Stbd (%)', input: 'number', step: '0.1' },
      { key: 'tanks.lo.service', label: 'Lube Oil Service (%)', input: 'number', step: '0.1' },
      { key: 'tanks.hydraulic', label: 'Hydraulic Oil (%)', input: 'number', step: '0.1' },
      { key: 'tanks.fresh', label: 'Fresh Water (%)', input: 'number', step: '0.1' },
      { key: 'tanks.bilge', label: 'Bilge / Sludge (%)', input: 'number', step: '0.1' },
      { key: 'tanks.blackGrey', label: 'Black/Grey Water (%)', input: 'number', step: '0.1' }
    ]
  },
  {
    id: 'operations',
    title: 'Operations & Transfers',
    type: 'fields',
    columns: 3,
    fields: [
      { key: 'ops.fuelTransfer', label: 'Fuel Transfer (details)', input: 'text', span: 3 },
      { key: 'ops.loRenewQty', label: 'LO Renew / Qty', input: 'text' },
      { key: 'ops.loTransfer', label: 'LO Transfer', input: 'text' },
      { key: 'ops.sewage', label: 'Sewage/Black Water', input: 'text', span: 3 }
    ]
  },
  {
    id: 'remarks',
    title: 'Remarks',
    type: 'textarea',
    rows: 8,
    key: 'remarks'
  }
];

// UMD-style export
if (typeof window !== 'undefined') {
  window.ENGINE_ROOM_SCHEMA = ENGINE_ROOM_SCHEMA;
  window.HOURS_COLUMNS = HOURS_COLUMNS;
}



