"use strict";
/**
 * Comprehensive BACnet Acronym Dictionary
 * This file centralizes all acronyms used for point normalization.
 * The structure is a single array of AcronymMapping objects, which allows for
 * more context, prioritization, and detailed categorization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACRONYM_PRIORITIES = exports.ACRONYM_CATEGORIES = exports.CONTROL_EQUIPMENT_ACRONYMS = exports.SAFETY_ACRONYMS = exports.STATE_ACRONYMS = exports.UNIT_ACRONYMS = exports.COMPONENT_ACRONYMS = exports.WATER_ACRONYMS = exports.EQUIPMENT_ACRONYMS = exports.CONTROL_ACRONYMS = exports.PRESSURE_ACRONYMS = exports.AIRFLOW_ACRONYMS = exports.SPACE_ACRONYMS = exports.TEMPERATURE_ACRONYMS = exports.BACNET_ACRONYMS = void 0;
exports.BACNET_ACRONYMS = [
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
    // Add more as needed based on analysis of trio files...
];
// Temperature related acronyms
exports.TEMPERATURE_ACRONYMS = {
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
exports.SPACE_ACRONYMS = {
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
exports.AIRFLOW_ACRONYMS = {
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
exports.PRESSURE_ACRONYMS = {
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
exports.CONTROL_ACRONYMS = {
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
exports.EQUIPMENT_ACRONYMS = {
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
exports.WATER_ACRONYMS = {
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
exports.COMPONENT_ACRONYMS = {
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
exports.UNIT_ACRONYMS = {
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
exports.STATE_ACRONYMS = {
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
exports.SAFETY_ACRONYMS = {
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
exports.CONTROL_EQUIPMENT_ACRONYMS = {
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
exports.ACRONYM_CATEGORIES = {
    temperature: exports.TEMPERATURE_ACRONYMS,
    airflow: exports.AIRFLOW_ACRONYMS,
    pressure: exports.PRESSURE_ACRONYMS,
    control: exports.CONTROL_ACRONYMS,
    equipment: exports.EQUIPMENT_ACRONYMS,
    water: exports.WATER_ACRONYMS,
    component: exports.COMPONENT_ACRONYMS,
    unit: exports.UNIT_ACRONYMS,
    state: exports.STATE_ACRONYMS,
    safety: exports.SAFETY_ACRONYMS,
    controlEquipment: exports.CONTROL_EQUIPMENT_ACRONYMS
};
// Priority mappings for disambiguation
exports.ACRONYM_PRIORITIES = {
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
exports.default = exports.BACNET_ACRONYMS;
