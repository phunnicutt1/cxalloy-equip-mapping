/**
 * Comprehensive BACnet Acronym Dictionary
 * This file centralizes all acronyms used for point normalization.
 * The structure is a single array of AcronymMapping objects, which allows for
 * more context, prioritization, and detailed categorization.
 */

export interface AcronymMapping {
  acronym: string;        // The abbreviation (e.g., "SAT")
  expansion: string;      // The full term (e.g., "Supply Air Temperature")
  category: string;       // Broad category (e.g., "Temperature", "Control")
  priority: number;       // Matching priority (1-10, 10 is highest)
  tags?: string[];        // Suggested Haystack tags (e.g., ["supply", "air", "temp"])
  pointFunction?: 'Sensor' | 'Setpoint' | 'Command' | 'Status'; // Implied function
}

export const BACNET_ACRONYMS: AcronymMapping[] = [
  // --- High Priority & Specific ---
  { acronym: 'ZN-T', expansion: 'Zone Temperature', category: 'Temperature', priority: 10, tags: ['zone', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'SAT', expansion: 'Supply Air Temperature', category: 'Temperature', priority: 10, tags: ['supply', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'RAT', expansion: 'Return Air Temperature', category: 'Temperature', priority: 10, tags: ['return', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'OAT', expansion: 'Outside Air Temperature', category: 'Temperature', priority: 10, tags: ['outside', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'MAT', expansion: 'Mixed Air Temperature', category: 'Temperature', priority: 10, tags: ['mixed', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'DMPR_POS', expansion: 'Damper Position', category: 'Control', priority: 10, tags: ['damper', 'position'], pointFunction: 'Sensor' },
  { acronym: 'VLV_POS', expansion: 'Valve Position', category: 'Control', priority: 10, tags: ['valve', 'position'], pointFunction: 'Sensor' },
  { acronym: 'SF_SPD', expansion: 'Supply Fan Speed', category: 'Control', priority: 10, tags: ['supply', 'fan', 'speed', 'cmd'], pointFunction: 'Command' },

  // --- Point Functions (High Priority) ---
  { acronym: 'CMD', expansion: 'Command', category: 'Control', priority: 9, tags: ['cmd'], pointFunction: 'Command' },
  { acronym: 'SP', expansion: 'Setpoint', category: 'Control', priority: 9, tags: ['sp'], pointFunction: 'Setpoint' },
  { acronym: 'SPT', expansion: 'Setpoint', category: 'Control', priority: 9, tags: ['sp'], pointFunction: 'Setpoint' },
  { acronym: 'ST', expansion: 'Status', category: 'Status', priority: 9, tags: ['status'], pointFunction: 'Status' },
  { acronym: 'STS', expansion: 'Status', category: 'Status', priority: 9, tags: ['status'], pointFunction: 'Status' },
  { acronym: 'STAT', expansion: 'Status', category: 'Status', priority: 9, tags: ['status'], pointFunction: 'Status' },
  { acronym: 'SEN', expansion: 'Sensor', category: 'Sensor', priority: 9, tags: ['sensor'], pointFunction: 'Sensor' },
  { acronym: 'FB', expansion: 'Feedback', category: 'Sensor', priority: 9, tags: ['sensor', 'feedback'], pointFunction: 'Sensor' },

  // --- General Temperature ---
  { acronym: 'TEMP', expansion: 'Temperature', category: 'Temperature', priority: 8, tags: ['temp'] },
  { acronym: 'TMP', expansion: 'Temperature', category: 'Temperature', priority: 8, tags: ['temp'] },
  
  // --- Airflow & Position ---
  { acronym: 'DMPR', expansion: 'Damper', category: 'Equipment', priority: 8, tags: ['damper'] },
  { acronym: 'DMP', expansion: 'Damper', category: 'Equipment', priority: 8, tags: ['damper'] },
  { acronym: 'POS', expansion: 'Position', category: 'State', priority: 8, tags: ['position'] },
  { acronym: 'VLV', expansion: 'Valve', category: 'Equipment', priority: 8, tags: ['valve'] },
  { acronym: 'FAN', expansion: 'Fan', category: 'Equipment', priority: 8, tags: ['fan'] },
  { acronym: 'SPD', expansion: 'Speed', category: 'State', priority: 8, tags: ['speed'] },
  { acronym: 'FLOW', expansion: 'Flow', category: 'Measurement', priority: 8, tags: ['flow'] },
  
  // --- Air Types ---
  { acronym: 'SA', expansion: 'Supply Air', category: 'Substance', priority: 7, tags: ['supply', 'air'] },
  { acronym: 'RA', expansion: 'Return Air', category: 'Substance', priority: 7, tags: ['return', 'air'] },
  { acronym: 'OA', expansion: 'Outside Air', category: 'Substance', priority: 7, tags: ['outside', 'air'] },
  { acronym: 'MA', expansion: 'Mixed Air', category: 'Substance', priority: 7, tags: ['mixed', 'air'] },
  { acronym: 'EA', expansion: 'Exhaust Air', category: 'Substance', priority: 7, tags: ['exhaust', 'air'] },
  { acronym: 'DA', expansion: 'Discharge Air', category: 'Substance', priority: 7, tags: ['discharge', 'air'] },

  // --- Location ---
  { acronym: 'ZN', expansion: 'Zone', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'RM', expansion: 'Room', category: 'Location', priority: 8, tags: ['room'] },
  { acronym: 'ROOM', expansion: 'Room', category: 'Location', priority: 8, tags: ['room'] },

  // --- Water Systems ---
  { acronym: 'CHW', expansion: 'Chilled Water', category: 'Substance', priority: 8, tags: ['chilled', 'water'] },
  { acronym: 'HW', expansion: 'Hot Water', category: 'Substance', priority: 8, tags: ['hot', 'water'] },
  
  // --- Miscellaneous ---
  { acronym: 'OCC', expansion: 'Occupancy', category: 'State', priority: 7, tags: ['occ'], pointFunction: 'Status' },
  { acronym: 'RH', expansion: 'Relative Humidity', category: 'Measurement', priority: 7, tags: ['humidity', 'rh'], pointFunction: 'Sensor' },
  { acronym: 'CO2', expansion: 'CO2', category: 'Measurement', priority: 7, tags: ['co2'], pointFunction: 'Sensor' },
  { acronym: 'PRESS', expansion: 'Pressure', category: 'Measurement', priority: 7, tags: ['press'], pointFunction: 'Sensor' },
  
  // --- New Additions from script ---
  { acronym: 'ADJ', expansion: 'Adjust', category: 'Control', priority: 6, tags: ['adjust'] },
  { acronym: 'AIRFLOW', expansion: 'Airflow', category: 'Measurement', priority: 8, tags: ['air', 'flow'] },
  { acronym: 'ALARM', expansion: 'Alarm', category: 'Status', priority: 8, tags: ['alarm'], pointFunction: 'Status' },
  { acronym: 'ALM1', expansion: 'Alarm 1', category: 'Status', priority: 7, tags: ['alarm'], pointFunction: 'Status' },
  { acronym: 'ALM2', expansion: 'Alarm 2', category: 'Status', priority: 7, tags: ['alarm'], pointFunction: 'Status' },
  { acronym: 'ALRM', expansion: 'Alarm', category: 'Status', priority: 7, tags: ['alarm'], pointFunction: 'Status' },
  { acronym: 'AO', expansion: 'Analog Output', category: 'BACnet', priority: 5, tags: ['analog', 'output'] },
  { acronym: 'AVG', expansion: 'Average', category: 'Calculation', priority: 6, tags: ['average'] },
  { acronym: 'BLDG', expansion: 'Building', category: 'Location', priority: 7, tags: ['building'] },
  { acronym: 'BSP', expansion: 'Building Static Pressure', category: 'Pressure', priority: 8, tags: ['building', 'static', 'press'] },
  { acronym: 'CAPACITY', expansion: 'Capacity', category: 'State', priority: 7, tags: ['capacity'] },
  { acronym: 'CD', expansion: 'Condenser', category: 'Equipment', priority: 7, tags: ['condenser'] },
  { acronym: 'CL', expansion: 'Cooling', category: 'State', priority: 8, tags: ['cool'] },
  { acronym: 'CLG', expansion: 'Cooling', category: 'State', priority: 8, tags: ['cool'] },
  { acronym: 'CMND', expansion: 'Command', category: 'Control', priority: 9, tags: ['cmd'], pointFunction: 'Command' },
  { acronym: 'CMODE', expansion: 'Cooling Mode', category: 'Mode', priority: 7, tags: ['cool', 'mode'] },
  { acronym: 'COMM', expansion: 'Communication', category: 'Status', priority: 7, tags: ['comm', 'status'] },
  { acronym: 'COOL', expansion: 'Cooling', category: 'State', priority: 8, tags: ['cool'] },
  { acronym: 'CSAT', expansion: 'Cooling Supply Air Temperature', category: 'Temperature', priority: 9, tags: ['cool', 'supply', 'air', 'temp'] },
  { acronym: 'DAMPER', expansion: 'Damper', category: 'Equipment', priority: 8, tags: ['damper'] },
  { acronym: 'DBL', expansion: 'Double', category: 'State', priority: 6, tags: ['double'] },
  { acronym: 'DCV', expansion: 'Demand Controlled Ventilation', category: 'Control', priority: 8, tags: ['demand', 'control', 'ventilation'] },
  { acronym: 'DETECT', expansion: 'Detector', category: 'Sensor', priority: 7, tags: ['detector'] },
  { acronym: 'DIRTY', expansion: 'Dirty', category: 'Status', priority: 7, tags: ['dirty', 'status'] },
  { acronym: 'DISABLE', expansion: 'Disable', category: 'Control', priority: 7, tags: ['disable'] },
  { acronym: 'DMD', expansion: 'Demand', category: 'Control', priority: 7, tags: ['demand'] },
  { acronym: 'DOOR', expansion: 'Door', category: 'Equipment', priority: 7, tags: ['door'] },
  { acronym: 'DPSP', expansion: 'Duct Pressure Setpoint', category: 'Pressure', priority: 8, tags: ['duct', 'press', 'sp'] },
  { acronym: 'DSGN', expansion: 'Design', category: 'Configuration', priority: 6, tags: ['design'] },
  { acronym: 'DUCT', expansion: 'Duct', category: 'Equipment', priority: 7, tags: ['duct'] },
  { acronym: 'DX', expansion: 'Direct Expansion', category: 'Equipment', priority: 8, tags: ['dx', 'equip'] },
  { acronym: 'DX1', expansion: 'Direct Expansion Stage 1', category: 'Equipment', priority: 8, tags: ['dx', 'equip', 'stage'] },
  { acronym: 'DX2', expansion: 'Direct Expansion Stage 2', category: 'Equipment', priority: 8, tags: ['dx', 'equip', 'stage'] },
  { acronym: 'ECON', expansion: 'Economizer', category: 'Control', priority: 8, tags: ['economizer'] },
  { acronym: 'EF', expansion: 'Exhaust Fan', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF1', expansion: 'Exhaust Fan 1', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF1A', expansion: 'Exhaust Fan 1A', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF1B', expansion: 'Exhaust Fan 1B', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF1C', expansion: 'Exhaust Fan 1C', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF1D', expansion: 'Exhaust Fan 1D', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF2', expansion: 'Exhaust Fan 2', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF3', expansion: 'Exhaust Fan 3', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EF4', expansion: 'Exhaust Fan 4', category: 'Equipment', priority: 8, tags: ['exhaust', 'fan', 'equip'] },
  { acronym: 'EFF', expansion: 'Effective', category: 'State', priority: 7, tags: ['effective'] },
  { acronym: 'ENABLE', expansion: 'Enable', category: 'Control', priority: 7, tags: ['enable'] },
  { acronym: 'EXHAUST', expansion: 'Exhaust', category: 'Substance', priority: 7, tags: ['exhaust'] },
  { acronym: 'FAIL', expansion: 'Fail', category: 'Status', priority: 8, tags: ['fail', 'status'], pointFunction: 'Status' },
  { acronym: 'FILTER', expansion: 'Filter', category: 'Equipment', priority: 7, tags: ['filter'] },
  { acronym: 'FILTERED', expansion: 'Filtered', category: 'State', priority: 6, tags: ['filtered'] },
  { acronym: 'FIX', expansion: 'Fixed', category: 'State', priority: 6, tags: ['fixed'] },
  { acronym: 'FLO', expansion: 'Flow', category: 'Measurement', priority: 8, tags: ['flow'] },
  { acronym: 'FOR', expansion: 'For', category: 'Logic', priority: 3 },
  { acronym: 'FREQ', expansion: 'Frequency', category: 'Measurement', priority: 7, tags: ['freq'] },
  { acronym: 'FSD1', expansion: 'Fire Smoke Damper 1', category: 'Equipment', priority: 8, tags: ['fire', 'smoke', 'damper', 'equip'] },
  { acronym: 'FSD2', expansion: 'Fire Smoke Damper 2', category: 'Equipment', priority: 8, tags: ['fire', 'smoke', 'damper', 'equip'] },
  { acronym: 'FSD3', expansion: 'Fire Smoke Damper 3', category: 'Equipment', priority: 8, tags: ['fire', 'smoke', 'damper', 'equip'] },
  { acronym: 'FSDA1', expansion: 'Fire Smoke Damper Alarm 1', category: 'Status', priority: 8, tags: ['fire', 'smoke', 'damper', 'alarm'], pointFunction: 'Status' },
  { acronym: 'FSDA2', expansion: 'Fire Smoke Damper Alarm 2', category: 'Status', priority: 8, tags: ['fire', 'smoke', 'damper', 'alarm'], pointFunction: 'Status' },
  { acronym: 'FSDA3', expansion: 'Fire Smoke Damper Alarm 3', category: 'Status', priority: 8, tags: ['fire', 'smoke', 'damper', 'alarm'], pointFunction: 'Status' },
  { acronym: 'HAND', expansion: 'Hand', category: 'Mode', priority: 7, tags: ['hand', 'mode'] },
  { acronym: 'HEAT', expansion: 'Heating', category: 'State', priority: 8, tags: ['heat'] },
  { acronym: 'HI', expansion: 'High', category: 'State', priority: 7, tags: ['high'] },
  { acronym: 'HMODE', expansion: 'Heating Mode', category: 'Mode', priority: 7, tags: ['heat', 'mode'] },
  { acronym: 'HRS', expansion: 'Hours', category: 'Unit', priority: 6, tags: ['hours'] },
  { acronym: 'HT', expansion: 'Heating', category: 'State', priority: 8, tags: ['heat'] },
  { acronym: 'HTG', expansion: 'Heating', category: 'State', priority: 8, tags: ['heat'] },
  { acronym: 'IN', expansion: 'Input', category: 'Logic', priority: 4, tags: ['input'] },
  { acronym: 'INPUT', expansion: 'Input', category: 'Logic', priority: 4, tags: ['input'] },
  { acronym: 'LIMIT', expansion: 'Limit', category: 'State', priority: 7, tags: ['limit'] },
  { acronym: 'LINK', expansion: 'Link', category: 'State', priority: 6, tags: ['link'] },
  { acronym: 'LO', expansion: 'Low', category: 'State', priority: 7, tags: ['low'] },
  { acronym: 'LOCK', expansion: 'Lock', category: 'Control', priority: 7, tags: ['lock'] },
  { acronym: 'LOG', expansion: 'Log', category: 'Data', priority: 5, tags: ['log'] },
  { acronym: 'LOOP', expansion: 'Loop', category: 'Control', priority: 6, tags: ['loop'] },
  { acronym: 'LOW', expansion: 'Low', category: 'State', priority: 7, tags: ['low'] },
  { acronym: 'M061', expansion: 'M061', category: 'Misc', priority: 1 },
  { acronym: 'M231', expansion: 'M231', category: 'Misc', priority: 1 },
  { acronym: 'M234', expansion: 'M234', category: 'Misc', priority: 1 },
  { acronym: 'M258', expansion: 'M258', category: 'Misc', priority: 1 },
  { acronym: 'M280', expansion: 'M280', category: 'Misc', priority: 1 },
  { acronym: 'M309', expansion: 'M309', category: 'Misc', priority: 1 },
  { acronym: 'M329', expansion: 'M329', category: 'Misc', priority: 1 },
  { acronym: 'M590', expansion: 'M590', category: 'Misc', priority: 1 },
  { acronym: 'M599', expansion: 'M599', category: 'Misc', priority: 1 },
  { acronym: 'M628', expansion: 'M628', category: 'Misc', priority: 1 },
  { acronym: 'M636', expansion: 'M636', category: 'Misc', priority: 1 },
  { acronym: 'M659', expansion: 'M659', category: 'Misc', priority: 1 },
  { acronym: 'MAN', expansion: 'Manual', category: 'Mode', priority: 7, tags: ['manual', 'mode'] },
  { acronym: 'MAT1', expansion: 'Mixed Air Temperature 1', category: 'Temperature', priority: 9, tags: ['mixed', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'MIN', expansion: 'Minimum', category: 'State', priority: 7, tags: ['min'] },
  { acronym: 'MODE', expansion: 'Mode', category: 'State', priority: 7, tags: ['mode'] },
  { acronym: 'OAD', expansion: 'Outside Air Damper', category: 'Equipment', priority: 8, tags: ['outside', 'air', 'damper', 'equip'] },
  { acronym: 'OFF', expansion: 'Off', category: 'State', priority: 7, tags: ['off'] },
  { acronym: 'OK', expansion: 'OK', category: 'Status', priority: 7, tags: ['ok', 'status'] },
  { acronym: 'OSA', expansion: 'Outside Air', category: 'Substance', priority: 7, tags: ['outside', 'air'] },
  { acronym: 'OUTPUT', expansion: 'Output', category: 'Control', priority: 6, tags: ['output'] },
  { acronym: 'OVRD', expansion: 'Override', category: 'Control', priority: 8, tags: ['override'] },
  { acronym: 'OVRDE', expansion: 'Override', category: 'Control', priority: 8, tags: ['override'] },
  { acronym: 'PCT', expansion: 'Percent', category: 'Unit', priority: 6, tags: ['percent'] },
  { acronym: 'PERCENT', expansion: 'Percent', category: 'Unit', priority: 6, tags: ['percent'] },
  { acronym: 'PID', expansion: 'PID', category: 'Control', priority: 7, tags: ['pid', 'control'] },
  { acronym: 'PIDOUT', expansion: 'PID Output', category: 'Control', priority: 7, tags: ['pid', 'output'] },
  { acronym: 'PURGE', expansion: 'Purge', category: 'Control', priority: 7, tags: ['purge'] },
  { acronym: 'PWR', expansion: 'Power', category: 'Measurement', priority: 8, tags: ['power'] },
  { acronym: 'RAD', expansion: 'Return Air Damper', category: 'Equipment', priority: 8, tags: ['return', 'air', 'damper', 'equip'] },
  { acronym: 'RAT1', expansion: 'Return Air Temperature 1', category: 'Temperature', priority: 9, tags: ['return', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'RD', expansion: 'Return Damper', category: 'Equipment', priority: 8, tags: ['return', 'damper', 'equip'] },
  { acronym: 'RELIEF', expansion: 'Relief', category: 'Control', priority: 7, tags: ['relief'] },
  { acronym: 'REQ', expansion: 'Request', category: 'Control', priority: 7, tags: ['request'] },
  { acronym: 'REQUEST', expansion: 'Request', category: 'Control', priority: 7, tags: ['request'] },
  { acronym: 'RET', expansion: 'Return', category: 'Substance', priority: 7, tags: ['return'] },
  { acronym: 'RET2', expansion: 'Return 2', category: 'Substance', priority: 7, tags: ['return'] },
  { acronym: 'RET3', expansion: 'Return 3', category: 'Substance', priority: 7, tags: ['return'] },
  { acronym: 'RET4', expansion: 'Return 4', category: 'Substance', priority: 7, tags: ['return'] },
  { acronym: 'RF', expansion: 'Return Fan', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RF1', expansion: 'Return Fan 1', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RF2', expansion: 'Return Fan 2', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RF3', expansion: 'Return Fan 3', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RF4', expansion: 'Return Fan 4', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RFAN', expansion: 'Return Fan', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RFAN2', expansion: 'Return Fan 2', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RFAN3', expansion: 'Return Fan 3', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RFAN4', expansion: 'Return Fan 4', category: 'Equipment', priority: 8, tags: ['return', 'fan', 'equip'] },
  { acronym: 'RN', expansion: 'Run', category: 'State', priority: 7, tags: ['run'] },
  { acronym: 'RNTM', expansion: 'Runtime', category: 'Measurement', priority: 7, tags: ['runtime'] },
  { acronym: 'ROLLUP', expansion: 'Rollup', category: 'State', priority: 6, tags: ['rollup'] },
  { acronym: 'RUN', expansion: 'Run', category: 'State', priority: 7, tags: ['run'] },
  { acronym: 'S', expansion: 'Status', category: 'Status', priority: 5, tags: ['status'] },
  { acronym: 'SAFETY', expansion: 'Safety', category: 'Status', priority: 8, tags: ['safety', 'status'] },
  { acronym: 'SAT1', expansion: 'Supply Air Temperature 1', category: 'Temperature', priority: 9, tags: ['supply', 'air', 'temp'], pointFunction: 'Sensor' },
  { acronym: 'SATISFIED', expansion: 'Satisfied', category: 'Status', priority: 7, tags: ['satisfied', 'status'] },
  { acronym: 'SCHEDULE', expansion: 'Schedule', category: 'Control', priority: 7, tags: ['schedule'] },
  { acronym: 'SD', expansion: 'Smoke Detector', category: 'Sensor', priority: 8, tags: ['smoke', 'detector'] },
  { acronym: 'SELECT', expansion: 'Select', category: 'Control', priority: 6, tags: ['select'] },
  { acronym: 'SENS', expansion: 'Sensor', category: 'Sensor', priority: 9, tags: ['sensor'], pointFunction: 'Sensor' },
  { acronym: 'SEQ', expansion: 'Sequence', category: 'Control', priority: 6, tags: ['sequence'] },
  { acronym: 'SETPT', expansion: 'Setpoint', category: 'Control', priority: 9, tags: ['sp'], pointFunction: 'Setpoint' },
  { acronym: 'SF', expansion: 'Supply Fan', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SF1', expansion: 'Supply Fan 1', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SF2', expansion: 'Supply Fan 2', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SF3', expansion: 'Supply Fan 3', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SF4', expansion: 'Supply Fan 4', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SFAN1', expansion: 'Supply Fan 1', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SFAN2', expansion: 'Supply Fan 2', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SFAN3', expansion: 'Supply Fan 3', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SFAN4', expansion: 'Supply Fan 4', category: 'Equipment', priority: 8, tags: ['supply', 'fan', 'equip'] },
  { acronym: 'SMOKE', expansion: 'Smoke', category: 'Sensor', priority: 8, tags: ['smoke'] },
  { acronym: 'SMOKEDETECTOR', expansion: 'Smoke Detector', category: 'Sensor', priority: 8, tags: ['smoke', 'detector'] },
  { acronym: 'SOURCE', expansion: 'Source', category: 'Data', priority: 5, tags: ['source'] },
  { acronym: 'SPACE', expansion: 'Space', category: 'Location', priority: 7, tags: ['space'] },
  { acronym: 'SSP', expansion: 'Static Pressure Setpoint', category: 'Pressure', priority: 8, tags: ['static', 'press', 'sp'] },
  { acronym: 'STAGE', expansion: 'Stage', category: 'State', priority: 7, tags: ['stage'] },
  { acronym: 'STATE', expansion: 'State', category: 'State', priority: 6, tags: ['state'] },
  { acronym: 'STATIC', expansion: 'Static', category: 'Measurement', priority: 7, tags: ['static'] },
  { acronym: 'STPT', expansion: 'Setpoint', category: 'Control', priority: 9, tags: ['sp'], pointFunction: 'Setpoint' },
  { acronym: 'SVFD', expansion: 'Supply VFD', category: 'Equipment', priority: 8, tags: ['supply', 'vfd', 'equip'] },
  { acronym: 'SYS', expansion: 'System', category: 'System', priority: 6, tags: ['system'] },
  { acronym: 'T', expansion: 'Temperature', category: 'Temperature', priority: 5, tags: ['temp'] },
  { acronym: 'TEMPERATURE', expansion: 'Temperature', category: 'Temperature', priority: 8, tags: ['temp'] },
  { acronym: 'THEATRE', expansion: 'Theatre', category: 'Location', priority: 7, tags: ['theatre'] },
  { acronym: 'THR', expansion: 'Theatre', category: 'Location', priority: 7, tags: ['theatre'] },
  { acronym: 'THRATRE', expansion: 'Theatre', category: 'Location', priority: 7, tags: ['theatre'] },
  { acronym: 'THTR', expansion: 'Theatre', category: 'Location', priority: 7, tags: ['theatre'] },
  { acronym: 'TIME', expansion: 'Time', category: 'Measurement', priority: 6, tags: ['time'] },
  { acronym: 'TN', expansion: 'Trend', category: 'Data', priority: 5, tags: ['trend'] },
  { acronym: 'TOTAL', expansion: 'Total', category: 'Calculation', priority: 6, tags: ['total'] },
  { acronym: 'TRANSITION', expansion: 'Transition', category: 'State', priority: 6, tags: ['transition'] },
  { acronym: 'TREND', expansion: 'Trend', category: 'Data', priority: 5, tags: ['trend'] },
  { acronym: 'TRENDLOG', expansion: 'Trend Log', category: 'Data', priority: 5, tags: ['trend', 'log'] },
  { acronym: 'TRN', expansion: 'Trend', category: 'Data', priority: 5, tags: ['trend'] },
  { acronym: 'UNIT', expansion: 'Unit', category: 'Equipment', priority: 7, tags: ['unit'] },
  { acronym: 'UNOCC', expansion: 'Unoccupied', category: 'State', priority: 7, tags: ['unoccupied'] },
  { acronym: 'UP', expansion: 'Up', category: 'Direction', priority: 4 },
  { acronym: 'VAL', expansion: 'Value', category: 'Data', priority: 4, tags: ['value'] },
  { acronym: 'VFD', expansion: 'VFD', category: 'Equipment', priority: 8, tags: ['vfd', 'equip'] },
  { acronym: 'WARMUP', expansion: 'Warmup', category: 'Mode', priority: 7, tags: ['warmup', 'mode'] },
  { acronym: 'Z1', expansion: 'Zone 1', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'Z2', expansion: 'Zone 2', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZCO2', expansion: 'Zone CO2', category: 'Measurement', priority: 8, tags: ['zone', 'co2'] },
  { acronym: 'ZN1', expansion: 'Zone 1', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZN2', expansion: 'Zone 2', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZONE', expansion: 'Zone', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZONE2', expansion: 'Zone 2', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZONE3A', expansion: 'Zone 3A', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZONE3B', expansion: 'Zone 3B', category: 'Location', priority: 8, tags: ['zone'] },
  { acronym: 'ZOVD', expansion: 'Zone Override', category: 'Control', priority: 8, tags: ['zone', 'override'] },
  { acronym: 'ZS', expansion: 'Zone Sensor', category: 'Sensor', priority: 8, tags: ['zone', 'sensor'] },
  { acronym: 'ZST', expansion: 'Zone Sensor Temperature', category: 'Temperature', priority: 8, tags: ['zone', 'sensor', 'temp'] },
  { acronym: 'ZTMP', expansion: 'Zone Temperature', category: 'Temperature', priority: 8, tags: ['zone', 'temp'] },

  // Add more as needed based on analysis of trio files...
];

// Temperature related acronyms
export const TEMPERATURE_ACRONYMS: Record<string, string> = {
  'Tmp': 'Temperature',
  'Temp': 'Temperature',
  'TEMP': 'Temperature',
  'Temperature': 'Temperature',
  'Oat': 'Outside Air Temperature',
  'oat': 'Outside Air Temperature',
  'Rat': 'Return Air Temperature',
  'rat': 'Return Air Temperature',
  'Sat': 'Supply Air Temperature',
  'sat': 'Supply Air Temperature',
  'Mat': 'Mixed Air Temperature',
  'mat': 'Mixed Air Temperature',
  'Zat': 'Zone Air Temperature',
  'zat': 'Zone Air Temperature',
  'Znt': 'Zone Temperature',
  'znt': 'Zone Temperature',
  'ZN-T': 'Zone Temperature',
  'zn-t': 'Zone Temperature',
  'ZnT': 'Zone Temperature',
  'Ent': 'Entering',
  'Lvg': 'Leaving',
  'Suct': 'Suction',
  'Disch': 'Discharge',
  'Saturation': 'Saturation'
};

// Space and location acronyms
export const SPACE_ACRONYMS: Record<string, string> = {
  'Room': 'Room',
  'ROOM': 'Room',
  'Rm': 'Room',
  'RM': 'Room',
  'Zone': 'Zone',
  'ZONE': 'Zone',
  'Zn': 'Zone',
  'ZN': 'Zone',
  'Space': 'Space',
  'SPACE': 'Space',
  'Area': 'Area',
  'AREA': 'Area',
  'Floor': 'Floor',
  'FLOOR': 'Floor',
  'Flr': 'Floor',
  'FLR': 'Floor'
};

// Air handling acronyms
export const AIRFLOW_ACRONYMS: Record<string, string> = {
  'Sa': 'Supply Air',
  'Su': 'Supply',
  'Sply': 'Supply',
  'Ra': 'Return Air',
  'Ma': 'Mixed Air',
  'Oa': 'Outside Air',
  'Osa': 'Outside Air',
  'osa': 'Outside Air',
  'Ea': 'Exhaust Air',
  'Ex': 'Exhaust',
  'Air': 'Air',
  'Vol': 'Volume',
  'Fl': 'Flow',
  'Flow': 'Flow',
  'Cfm': 'CFM',
  'Spd': 'Speed',
  'Vel': 'Velocity',
  'Fan': 'Fan',
  'SF': 'Supply Fan',
  'EF': 'Exhaust Fan',
  'Dpr': 'Damper',
  'Dmp': 'Damper',
  'Dmpr': 'Damper',
  'DAMPER': 'Damper',
  'Damper': 'Damper',
  'Da': 'Discharge Air',
  'Radmp': 'Return Air Damper',
  'Pos': 'Position',
  'POS': 'Position',
  'Position': 'Position'
};

// Pressure and flow acronyms
export const PRESSURE_ACRONYMS: Record<string, string> = {
  'Pr': 'Pressure',
  'Press': 'Pressure',
  'StPr': 'Static Pressure',
  'DiffPr': 'Differential Pressure',
  'Diff': 'Differential',
  'P': 'Pressure',
  'Psi': 'PSI',
  'InH2O': 'Inches Water Column',
  'Gpm': 'GPM'
};

// Control and status acronyms
export const CONTROL_ACRONYMS: Record<string, string> = {
  'Spt': 'Setpoint',
  'Sp': 'Setpoint',
  'SP': 'Setpoint',
  'Stpt': 'Setpoint',
  'SetPt': 'Setpoint',
  'SetPoint': 'Setpoint',
  'Fb': 'Feedback',
  'Sts': 'Status',
  'Stat': 'Status',
  'Req': 'Request',
  'Trck': 'Track',
  'Alm': 'Alarm',
  'Alarm': 'Alarm',
  'Cmd': 'Command',
  'En': 'Enable',
  'Enb': 'Enable',
  'Occ': 'Occupied',
  'Unocc': 'Unoccupied',
  'Ovr': 'Override',
  'Ovrd': 'Override',
  'Rem': 'Remote',
  'Lt': 'Light',
  'Lmt': 'Limit',
  'Sen': 'Sensor',
  'Ofs': 'Offset',
  'Dmd': 'Demand'
};

// Equipment type acronyms
export const EQUIPMENT_ACRONYMS: Record<string, string> = {
  'Ahu': 'Air Handling Unit',
  'AHU': 'Air Handling Unit',
  'Vav': 'VAV',
  'VAV': 'VAV',
  'Fcu': 'Fan Coil Unit',
  'FCU': 'Fan Coil Unit',
  'Rtu': 'Rooftop Unit',
  'RTU': 'Rooftop Unit',
  'Cuh': 'Cabinet Unit Heater',
  'CUH': 'Cabinet Unit Heater',
  'Uh': 'Unit Heater',
  'UH': 'Unit Heater',
  'Boiler': 'Boiler',
  'Chiller': 'Chiller',
  'Pump': 'Pump',
  'Tower': 'Cooling Tower'
};

// Water system acronyms
export const WATER_ACRONYMS: Record<string, string> = {
  'Chw': 'Chilled Water',
  'CHW': 'Chilled Water',
  'Hhw': 'Hot Water',
  'HHW': 'Hot Water',
  'Hw': 'Hot Water',
  'HW': 'Hot Water',
  'Cw': 'Condenser Water',
  'CW': 'Condenser Water',
  'Evap': 'Evaporator',
  'Cond': 'Condenser',
  'Ref': 'Refrigerant',
  'VL': 'Valve',
  'Vlv': 'Valve',
  'Valve': 'Valve'
};

// Coil and component acronyms
export const COMPONENT_ACRONYMS: Record<string, string> = {
  'Clg': 'Cooling',
  'clg': 'Cooling',
  'Cl': 'Cooling',
  'cl': 'Cooling',
  'Htg': 'Heating',
  'htg': 'Heating',
  'Ht': 'Heating',
  'ht': 'Heating',
  'Pht': 'Preheat',
  'Reheat': 'Reheat',
  'Coil': 'Coil',
  'Comp': 'Compressor',
  'Circuit': 'Circuit',
  'C1': 'Circuit 1',
  'C2': 'Circuit 2'
};

// Units and measurements
export const UNIT_ACRONYMS: Record<string, string> = {
  'CO2': 'Carbon Dioxide',
  'Co2': 'Carbon Dioxide',
  'co2': 'Carbon Dioxide',
  'Co': 'Carbon Dioxide',
  'co': 'Carbon Dioxide',
  'Rh': 'Relative Humidity',
  'RH': 'Relative Humidity',
  'Deg': 'Degrees',
  'Pct': 'Percent',
  'Mins': 'Minutes',
  'Hr': 'Hours',
  'Sec': 'Seconds',
  'Kw': 'Kilowatts',
  'KW': 'Kilowatts',
  'Pwr': 'Power',
  'Power': 'Power'
};

// Operational states
export const STATE_ACRONYMS: Record<string, string> = {
  'Run': 'Running',
  'Auto': 'Automatic',
  'Man': 'Manual',
  'Hand': 'Manual',
  'Act': 'Active',
  'Eff': 'Effective',
  'Ef': 'Effective',
  'Eval': 'Evaluation',
  'Dly': 'Delay',
  'Delay': 'Delay',
  'Time': 'Time',
  'Timer': 'Timer',
  'Adj': 'Adjustment'
};

// Safety and protection
export const SAFETY_ACRONYMS: Record<string, string> = {
  'Frost': 'Frost',
  'Prt': 'Protection',
  'Protect': 'Protection',
  'Safety': 'Safety',
  'Limit': 'Limit',
  'High': 'High',
  'Low': 'Low',
  'Max': 'Maximum',
  'Min': 'Minimum'
};

// Control equipment
export const CONTROL_EQUIPMENT_ACRONYMS: Record<string, string> = {
  'Vfd': 'Variable Frequency Drive',
  'VFD': 'Variable Frequency Drive',
  'Dcv': 'Demand Control Ventilation',
  'dcv': 'Demand Control Ventilation',
  'DCV': 'Demand Control Ventilation',
  'Ao': 'Analog Output',
  'ao': 'Analog Output',
  'AO': 'Analog Output',
  'Ai': 'Analog Input',
  'ai': 'Analog Input',
  'AI': 'Analog Input',
  'Bo': 'Binary Output',
  'bo': 'Binary Output',
  'BO': 'Binary Output',
  'Bi': 'Binary Input',
  'bi': 'Binary Input',
  'BI': 'Binary Input'
};

// Acronym categories for context-aware matching
export const ACRONYM_CATEGORIES = {
  temperature: TEMPERATURE_ACRONYMS,
  airflow: AIRFLOW_ACRONYMS,
  pressure: PRESSURE_ACRONYMS,
  control: CONTROL_ACRONYMS,
  equipment: EQUIPMENT_ACRONYMS,
  water: WATER_ACRONYMS,
  component: COMPONENT_ACRONYMS,
  unit: UNIT_ACRONYMS,
  state: STATE_ACRONYMS,
  safety: SAFETY_ACRONYMS,
  controlEquipment: CONTROL_EQUIPMENT_ACRONYMS
};

// Priority mappings for disambiguation
export const ACRONYM_PRIORITIES: Record<string, number> = {
  // High priority - very common and unambiguous
  'Temp': 100,
  'SP': 95,
  'Setpoint': 95,
  'Fan': 90,
  'Pump': 90,
  'Valve': 90,
  
  // Medium priority - common but may need context
  'P': 70,
  'T': 70,
  'F': 70,
  'S': 70,
  
  // Lower priority - ambiguous or less common
  'C': 50,
  'H': 50,
  'L': 50
};

export default BACNET_ACRONYMS;
