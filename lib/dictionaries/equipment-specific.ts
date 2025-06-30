/**
 * Equipment-Specific Acronym Dictionaries
 * Context-aware acronym mappings based on equipment type
 */

// Air Handling Unit (AHU) specific acronyms
export const AHU_SPECIFIC_ACRONYMS: Record<string, string> = {
  // AHU-specific temperature points
  'MAT': 'Mixed Air Temperature',
  'SAT': 'Supply Air Temperature',
  'RAT': 'Return Air Temperature',
  'OAT': 'Outside Air Temperature',
  'LAT': 'Leaving Air Temperature',
  'EAT': 'Entering Air Temperature',
  
  // AHU-specific pressure points
  'SASP': 'Supply Air Static Pressure',
  'RASP': 'Return Air Static Pressure',
  'MASP': 'Mixed Air Static Pressure',
  'DASP': 'Discharge Air Static Pressure',
  'FilterDP': 'Filter Differential Pressure',
  
  // AHU-specific flow points
  'SAF': 'Supply Air Flow',
  'RAF': 'Return Air Flow',
  'OAF': 'Outside Air Flow',
  'EAF': 'Exhaust Air Flow',
  'MAF': 'Mixed Air Flow',
  
  // AHU-specific control points
  'OADMP': 'Outside Air Damper',
  'RADMP': 'Return Air Damper',
  'EADMP': 'Exhaust Air Damper',
  'MADMP': 'Mixed Air Damper',
  'PREHEAT': 'Preheat Coil',
  'COOLING': 'Cooling Coil',
  'HEATING': 'Heating Coil',
  
  // AHU-specific equipment
  'SF': 'Supply Fan',
  'RF': 'Return Fan',
  'EF': 'Exhaust Fan',
  'SFVFD': 'Supply Fan VFD',
  'RFVFD': 'Return Fan VFD'
};

// Variable Air Volume (VAV) specific acronyms
export const VAV_SPECIFIC_ACRONYMS: Record<string, string> = {
  // VAV-specific temperature points
  'ZT': 'Zone Temperature',
  'ZNT': 'Zone Temperature',
  'ZN-T': 'Zone Temperature',
  'DAT': 'Discharge Air Temperature',
  'RHT': 'Reheat Temperature',
  
  // VAV-specific flow points
  'AF': 'Airflow',
  'CFM': 'Airflow CFM',
  'DAF': 'Discharge Airflow',
  'AIRFLOW': 'Airflow',
  'FLOW': 'Airflow',
  
  // VAV-specific control points
  'DMP': 'Damper',
  'DMPR': 'Damper',
  'DAMPER': 'Damper',
  'POS': 'Position',
  'POSITION': 'Position',
  'RH': 'Reheat',
  'REHEAT': 'Reheat',
  'RHVLV': 'Reheat Valve',
  'HTGVLV': 'Heating Valve',
  
  // VAV-specific setpoints
  'ZTSP': 'Zone Temperature Setpoint',
  'ZN-TSP': 'Zone Temperature Setpoint',
  'AFSP': 'Airflow Setpoint',
  'CFMSP': 'Airflow Setpoint CFM',
  'MINAF': 'Minimum Airflow',
  'MAXAF': 'Maximum Airflow'
};

// Rooftop Unit (RTU) specific acronyms
export const RTU_SPECIFIC_ACRONYMS: Record<string, string> = {
  // RTU-specific temperature points
  'SAT': 'Supply Air Temperature',
  'RAT': 'Return Air Temperature',
  'OAT': 'Outside Air Temperature',
  'ZT': 'Zone Temperature',
  'CSAT': 'Cooling Supply Air Temperature',
  'HSAT': 'Heating Supply Air Temperature',
  
  // RTU-specific pressure points
  'SASP': 'Supply Air Static Pressure',
  'SUCT': 'Suction Pressure',
  'DISCH': 'Discharge Pressure',
  'REFRIG': 'Refrigerant Pressure',
  
  // RTU-specific control points
  'COMP': 'Compressor',
  'COMP1': 'Compressor 1',
  'COMP2': 'Compressor 2',
  'HEATSTG': 'Heat Stage',
  'COOLSTG': 'Cool Stage',
  'ECON': 'Economizer',
  'OADMP': 'Outside Air Damper',
  
  // RTU-specific equipment
  'SF': 'Supply Fan',
  'SFVFD': 'Supply Fan VFD',
  'COND': 'Condenser',
  'EVAP': 'Evaporator',
  'GAS': 'Gas Heat',
  'ELEC': 'Electric Heat'
};

// Fan Coil Unit (FCU) specific acronyms
export const FCU_SPECIFIC_ACRONYMS: Record<string, string> = {
  // FCU-specific temperature points
  'ZT': 'Zone Temperature',
  'SAT': 'Supply Air Temperature',
  'CWT': 'Chilled Water Temperature',
  'HWT': 'Hot Water Temperature',
  'EWT': 'Entering Water Temperature',
  'LWT': 'Leaving Water Temperature',
  
  // FCU-specific control points
  'FAN': 'Fan',
  'FANSPD': 'Fan Speed',
  'CWVLV': 'Chilled Water Valve',
  'HWVLV': 'Hot Water Valve',
  'CLGVLV': 'Cooling Valve',
  'HTGVLV': 'Heating Valve',
  
  // FCU-specific setpoints
  'ZTSP': 'Zone Temperature Setpoint',
  'FANSP': 'Fan Speed Setpoint',
  'CLGSP': 'Cooling Setpoint',
  'HTGSP': 'Heating Setpoint'
};

// Chiller specific acronyms
export const CHILLER_SPECIFIC_ACRONYMS: Record<string, string> = {
  // Chiller-specific temperature points
  'CHWST': 'Chilled Water Supply Temperature',
  'CHWRT': 'Chilled Water Return Temperature',
  'CWST': 'Condenser Water Supply Temperature',
  'CWRT': 'Condenser Water Return Temperature',
  'EWT': 'Entering Water Temperature',
  'LWT': 'Leaving Water Temperature',
  'SUCT': 'Suction Temperature',
  'DISCH': 'Discharge Temperature',
  
  // Chiller-specific pressure points
  'SUCTP': 'Suction Pressure',
  'DISCHP': 'Discharge Pressure',
  'OILP': 'Oil Pressure',
  'REFP': 'Refrigerant Pressure',
  
  // Chiller-specific control points
  'COMP': 'Compressor',
  'EVAP': 'Evaporator',
  'COND': 'Condenser',
  'EXPV': 'Expansion Valve',
  'CHWP': 'Chilled Water Pump',
  'CWP': 'Condenser Water Pump',
  'CT': 'Cooling Tower',
  
  // Chiller-specific measurements
  'KW': 'Power',
  'TONS': 'Cooling Capacity',
  'EFF': 'Efficiency',
  'COP': 'Coefficient of Performance'
};

// Boiler specific acronyms
export const BOILER_SPECIFIC_ACRONYMS: Record<string, string> = {
  // Boiler-specific temperature points
  'HWST': 'Hot Water Supply Temperature',
  'HWRT': 'Hot Water Return Temperature',
  'ST': 'Steam Temperature',
  'FGT': 'Flue Gas Temperature',
  'AMB': 'Ambient Temperature',
  
  // Boiler-specific pressure points
  'STP': 'Steam Pressure',
  'GASP': 'Gas Pressure',
  'WP': 'Water Pressure',
  'FGP': 'Flue Gas Pressure',
  
  // Boiler-specific control points
  'BURN': 'Burner',
  'IGN': 'Ignition',
  'PILOT': 'Pilot Light',
  'GASV': 'Gas Valve',
  'AIRF': 'Air Flow',
  'GASF': 'Gas Flow',
  'HWP': 'Hot Water Pump',
  
  // Boiler-specific measurements
  'BTU': 'BTU Output',
  'EFF': 'Efficiency',
  'O2': 'Oxygen',
  'CO': 'Carbon Monoxide'
};

// Pump specific acronyms
export const PUMP_SPECIFIC_ACRONYMS: Record<string, string> = {
  // Pump-specific points
  'FLOW': 'Flow Rate',
  'GPM': 'Flow Rate GPM',
  'HEAD': 'Pump Head',
  'PRESS': 'Pressure',
  'DISCHP': 'Discharge Pressure',
  'SUCTP': 'Suction Pressure',
  'VFD': 'Variable Frequency Drive',
  'SPEED': 'Pump Speed',
  'RPM': 'Pump RPM',
  'AMP': 'Motor Current',
  'KW': 'Power',
  'EFF': 'Efficiency'
};

// Combined equipment-specific dictionary
export const EQUIPMENT_SPECIFIC_ACRONYMS = {
  AHU: AHU_SPECIFIC_ACRONYMS,
  VAV: VAV_SPECIFIC_ACRONYMS,
  RTU: RTU_SPECIFIC_ACRONYMS,
  FCU: FCU_SPECIFIC_ACRONYMS,
  CHILLER: CHILLER_SPECIFIC_ACRONYMS,
  BOILER: BOILER_SPECIFIC_ACRONYMS,
  PUMP: PUMP_SPECIFIC_ACRONYMS
};

/**
 * Get equipment-specific acronyms for a given equipment type
 */
export function getEquipmentAcronyms(equipmentType: string): Record<string, string> {
  const normalizedType = equipmentType.toUpperCase();
  
  // Direct match
  if (EQUIPMENT_SPECIFIC_ACRONYMS[normalizedType as keyof typeof EQUIPMENT_SPECIFIC_ACRONYMS]) {
    return EQUIPMENT_SPECIFIC_ACRONYMS[normalizedType as keyof typeof EQUIPMENT_SPECIFIC_ACRONYMS];
  }
  
  // Fuzzy matching for common variations
  if (normalizedType.includes('AHU') || normalizedType.includes('AIR HANDLING')) {
    return AHU_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('VAV') || normalizedType.includes('VARIABLE AIR')) {
    return VAV_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('RTU') || normalizedType.includes('ROOFTOP')) {
    return RTU_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('FCU') || normalizedType.includes('FAN COIL')) {
    return FCU_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('CHILLER')) {
    return CHILLER_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('BOILER')) {
    return BOILER_SPECIFIC_ACRONYMS;
  }
  if (normalizedType.includes('PUMP')) {
    return PUMP_SPECIFIC_ACRONYMS;
  }
  
  return {};
}

/**
 * Get all applicable acronyms for an equipment type with priority scoring
 */
export function getEquipmentAcronymsWithPriority(equipmentType: string): Array<{
  acronym: string;
  expansion: string;
  priority: number;
  source: string;
}> {
  const equipmentAcronyms = getEquipmentAcronyms(equipmentType);
  const results: Array<{
    acronym: string;
    expansion: string;
    priority: number;
    source: string;
  }> = [];
  
  // Add equipment-specific acronyms with high priority
  Object.entries(equipmentAcronyms).forEach(([acronym, expansion]) => {
    results.push({
      acronym,
      expansion,
      priority: 100, // Equipment-specific gets highest priority
      source: `${equipmentType.toUpperCase()}_SPECIFIC`
    });
  });
  
  return results.sort((a, b) => b.priority - a.priority);
}

export default EQUIPMENT_SPECIFIC_ACRONYMS; 