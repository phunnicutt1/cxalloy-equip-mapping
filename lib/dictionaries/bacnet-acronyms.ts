/**
 * Comprehensive BACnet Acronym Dictionary
 * Based on ASHRAE 135-2024 and industry standard abbreviations
 */

export interface AcronymMapping {
  acronym: string;
  expansion: string;
  category: string;
  context?: string[];
  priority: number; // Higher priority = more likely match
}

// Temperature related acronyms
export const TEMPERATURE_ACRONYMS: Record<string, string> = {
  'Tmp': 'Temperature',
  'Temp': 'Temperature',
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
  'Da': 'Discharge Air',
  'Radmp': 'Return Air Damper',
  'Pos': 'Position'
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

// Combined master dictionary
export const BACNET_ACRONYMS: Record<string, string> = {
  ...TEMPERATURE_ACRONYMS,
  ...AIRFLOW_ACRONYMS,
  ...PRESSURE_ACRONYMS,
  ...CONTROL_ACRONYMS,
  ...EQUIPMENT_ACRONYMS,
  ...WATER_ACRONYMS,
  ...COMPONENT_ACRONYMS,
  ...UNIT_ACRONYMS,
  ...STATE_ACRONYMS,
  ...SAFETY_ACRONYMS,
  ...CONTROL_EQUIPMENT_ACRONYMS
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