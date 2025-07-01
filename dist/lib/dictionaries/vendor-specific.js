"use strict";
/**
 * Vendor-Specific Acronym Dictionaries
 * Different vendors often use unique acronyms and naming conventions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENDOR_SPECIFIC_ACRONYMS = exports.SCHNEIDER_ACRONYMS = exports.HONEYWELL_ACRONYMS = exports.TRANE_ACRONYMS = exports.SIEMENS_ACRONYMS = exports.JOHNSON_CONTROLS_ACRONYMS = void 0;
exports.getVendorAcronyms = getVendorAcronyms;
exports.getVendorAcronymsWithPriority = getVendorAcronymsWithPriority;
exports.inferVendorFromPattern = inferVendorFromPattern;
// Johnson Controls specific acronyms
exports.JOHNSON_CONTROLS_ACRONYMS = {
    // JCI-specific temperature points
    'ZNT': 'Zone Temperature',
    'ZNSP': 'Zone Setpoint',
    'OATEMP': 'Outside Air Temperature',
    'SATEMP': 'Supply Air Temperature',
    'RATEMP': 'Return Air Temperature',
    'MATEMP': 'Mixed Air Temperature',
    'DATEMP': 'Discharge Air Temperature',
    // JCI-specific control points
    'OADMPR': 'Outside Air Damper',
    'RADMPR': 'Return Air Damper',
    'EADMPR': 'Exhaust Air Damper',
    'CLGVLV': 'Cooling Valve',
    'HTGVLV': 'Heating Valve',
    'CHWVLV': 'Chilled Water Valve',
    'HWVLV': 'Hot Water Valve',
    // JCI-specific flow points
    'SAFLOW': 'Supply Air Flow',
    'RAFLOW': 'Return Air Flow',
    'OAFLOW': 'Outside Air Flow',
    'EAFLOW': 'Exhaust Air Flow',
    'AIRFLW': 'Air Flow',
    // JCI-specific pressure points
    'SAPRESS': 'Supply Air Pressure',
    'RAPRESS': 'Return Air Pressure',
    'STPRESS': 'Static Pressure',
    'DIFFPR': 'Differential Pressure',
    // JCI-specific equipment
    'SUPFAN': 'Supply Fan',
    'RETFAN': 'Return Fan',
    'EXHFAN': 'Exhaust Fan',
    'COMPRS': 'Compressor',
    'CNDSR': 'Condenser',
    'EVAPRT': 'Evaporator',
    // JCI-specific status points
    'FANSTS': 'Fan Status',
    'COMPSTS': 'Compressor Status',
    'ALMSTS': 'Alarm Status',
    'RUNSTS': 'Run Status',
    'ENBSTS': 'Enable Status'
};
// Siemens specific acronyms
exports.SIEMENS_ACRONYMS = {
    // Siemens-specific temperature points
    'T_ZONE': 'Zone Temperature',
    'T_SUPPLY': 'Supply Temperature',
    'T_RETURN': 'Return Temperature',
    'T_OUTSIDE': 'Outside Temperature',
    'T_MIXED': 'Mixed Temperature',
    'T_DISCHARGE': 'Discharge Temperature',
    'T_SETPOINT': 'Temperature Setpoint',
    // Siemens-specific pressure points
    'P_STATIC': 'Static Pressure',
    'P_DIFF': 'Differential Pressure',
    'P_SUPPLY': 'Supply Pressure',
    'P_RETURN': 'Return Pressure',
    // Siemens-specific flow points
    'F_AIR': 'Air Flow',
    'F_SUPPLY': 'Supply Flow',
    'F_RETURN': 'Return Flow',
    'F_OUTSIDE': 'Outside Air Flow',
    'F_EXHAUST': 'Exhaust Flow',
    // Siemens-specific control points
    'D_OUTSIDE': 'Outside Air Damper',
    'D_RETURN': 'Return Air Damper',
    'D_EXHAUST': 'Exhaust Air Damper',
    'V_COOLING': 'Cooling Valve',
    'V_HEATING': 'Heating Valve',
    'V_CHWATER': 'Chilled Water Valve',
    'V_HOTWATER': 'Hot Water Valve',
    // Siemens-specific equipment
    'FAN_SUPPLY': 'Supply Fan',
    'FAN_RETURN': 'Return Fan',
    'FAN_EXHAUST': 'Exhaust Fan',
    'PUMP_CHW': 'Chilled Water Pump',
    'PUMP_HW': 'Hot Water Pump',
    // Siemens-specific status
    'STS_FAN': 'Fan Status',
    'STS_PUMP': 'Pump Status',
    'STS_ALARM': 'Alarm Status',
    'STS_RUN': 'Run Status'
};
// Trane specific acronyms
exports.TRANE_ACRONYMS = {
    // Trane-specific temperature points
    'ZoneTemp': 'Zone Temperature',
    'SupplyTemp': 'Supply Temperature',
    'ReturnTemp': 'Return Temperature',
    'OutdoorTemp': 'Outdoor Temperature',
    'MixedTemp': 'Mixed Air Temperature',
    'DischargeTemp': 'Discharge Temperature',
    'ZoneTempSP': 'Zone Temperature Setpoint',
    'SupplyTempSP': 'Supply Temperature Setpoint',
    // Trane-specific pressure points
    'StaticPress': 'Static Pressure',
    'DiffPress': 'Differential Pressure',
    'SupplyPress': 'Supply Pressure',
    'ReturnPress': 'Return Pressure',
    'StaticPressSP': 'Static Pressure Setpoint',
    // Trane-specific flow points
    'AirFlow': 'Air Flow',
    'SupplyFlow': 'Supply Air Flow',
    'ReturnFlow': 'Return Air Flow',
    'OutdoorFlow': 'Outdoor Air Flow',
    'ExhaustFlow': 'Exhaust Air Flow',
    'AirFlowSP': 'Air Flow Setpoint',
    'MinAirFlow': 'Minimum Air Flow',
    'MaxAirFlow': 'Maximum Air Flow',
    // Trane-specific control points
    'OutdoorDamper': 'Outdoor Air Damper',
    'ReturnDamper': 'Return Air Damper',
    'ExhaustDamper': 'Exhaust Air Damper',
    'CoolingValve': 'Cooling Valve',
    'HeatingValve': 'Heating Valve',
    'ChilledWaterValve': 'Chilled Water Valve',
    'HotWaterValve': 'Hot Water Valve',
    'ReheatValve': 'Reheat Valve',
    // Trane-specific equipment
    'SupplyFan': 'Supply Fan',
    'ReturnFan': 'Return Fan',
    'ExhaustFan': 'Exhaust Fan',
    'SupplyFanVFD': 'Supply Fan VFD',
    'ReturnFanVFD': 'Return Fan VFD',
    'Compressor1': 'Compressor 1',
    'Compressor2': 'Compressor 2',
    // Trane-specific status
    'FanStatus': 'Fan Status',
    'CompressorStatus': 'Compressor Status',
    'AlarmStatus': 'Alarm Status',
    'RunStatus': 'Run Status',
    'EnableStatus': 'Enable Status'
};
// Honeywell specific acronyms
exports.HONEYWELL_ACRONYMS = {
    // Honeywell-specific temperature points
    'RMTEMP': 'Room Temperature',
    'SPTEMP': 'Supply Temperature',
    'RTTEMP': 'Return Temperature',
    'OATEMP': 'Outside Air Temperature',
    'MXTEMP': 'Mixed Air Temperature',
    'DCTEMP': 'Discharge Temperature',
    'RMTSP': 'Room Temperature Setpoint',
    'SPTSP': 'Supply Temperature Setpoint',
    // Honeywell-specific pressure points
    'STPRES': 'Static Pressure',
    'DFPRES': 'Differential Pressure',
    'SPPRES': 'Supply Pressure',
    'RTPRES': 'Return Pressure',
    'STPSP': 'Static Pressure Setpoint',
    // Honeywell-specific flow points
    'AIRFL': 'Air Flow',
    'SPAIRFL': 'Supply Air Flow',
    'RTAIRFL': 'Return Air Flow',
    'OAAIRFL': 'Outside Air Flow',
    'EXAIRFL': 'Exhaust Air Flow',
    'AIRFLSP': 'Air Flow Setpoint',
    // Honeywell-specific control points
    'OADMP': 'Outside Air Damper',
    'RTDMP': 'Return Air Damper',
    'EXDMP': 'Exhaust Air Damper',
    'CLGVLV': 'Cooling Valve',
    'HTGVLV': 'Heating Valve',
    'CHWVLV': 'Chilled Water Valve',
    'HTWVLV': 'Hot Water Valve',
    // Honeywell-specific equipment
    'SPFAN': 'Supply Fan',
    'RTFAN': 'Return Fan',
    'EXFAN': 'Exhaust Fan',
    'SPFVFD': 'Supply Fan VFD',
    'RTFVFD': 'Return Fan VFD',
    'COMP1': 'Compressor 1',
    'COMP2': 'Compressor 2'
};
// Schneider Electric (Andover Continuum) specific acronyms
exports.SCHNEIDER_ACRONYMS = {
    // Schneider-specific temperature points
    'ZN_TEMP': 'Zone Temperature',
    'SA_TEMP': 'Supply Air Temperature',
    'RA_TEMP': 'Return Air Temperature',
    'OA_TEMP': 'Outside Air Temperature',
    'MA_TEMP': 'Mixed Air Temperature',
    'DA_TEMP': 'Discharge Air Temperature',
    'ZN_TEMP_SP': 'Zone Temperature Setpoint',
    'SA_TEMP_SP': 'Supply Air Temperature Setpoint',
    // Schneider-specific pressure points
    'SA_PRESS': 'Supply Air Pressure',
    'RA_PRESS': 'Return Air Pressure',
    'STATIC_PRESS': 'Static Pressure',
    'DIFF_PRESS': 'Differential Pressure',
    'SA_PRESS_SP': 'Supply Air Pressure Setpoint',
    // Schneider-specific flow points
    'SA_FLOW': 'Supply Air Flow',
    'RA_FLOW': 'Return Air Flow',
    'OA_FLOW': 'Outside Air Flow',
    'EA_FLOW': 'Exhaust Air Flow',
    'SA_FLOW_SP': 'Supply Air Flow Setpoint',
    'MIN_FLOW': 'Minimum Flow',
    'MAX_FLOW': 'Maximum Flow',
    // Schneider-specific control points
    'OA_DAMPER': 'Outside Air Damper',
    'RA_DAMPER': 'Return Air Damper',
    'EA_DAMPER': 'Exhaust Air Damper',
    'CLG_VALVE': 'Cooling Valve',
    'HTG_VALVE': 'Heating Valve',
    'CHW_VALVE': 'Chilled Water Valve',
    'HW_VALVE': 'Hot Water Valve',
    // Schneider-specific equipment
    'SA_FAN': 'Supply Air Fan',
    'RA_FAN': 'Return Air Fan',
    'EA_FAN': 'Exhaust Air Fan',
    'SA_FAN_VFD': 'Supply Air Fan VFD',
    'RA_FAN_VFD': 'Return Air Fan VFD'
};
// Combined vendor-specific dictionary
exports.VENDOR_SPECIFIC_ACRONYMS = {
    'Johnson Controls': exports.JOHNSON_CONTROLS_ACRONYMS,
    'JCI': exports.JOHNSON_CONTROLS_ACRONYMS,
    'Siemens': exports.SIEMENS_ACRONYMS,
    'Trane': exports.TRANE_ACRONYMS,
    'Honeywell': exports.HONEYWELL_ACRONYMS,
    'Schneider': exports.SCHNEIDER_ACRONYMS,
    'Schneider Electric': exports.SCHNEIDER_ACRONYMS,
    'Andover': exports.SCHNEIDER_ACRONYMS,
    'Continuum': exports.SCHNEIDER_ACRONYMS
};
/**
 * Get vendor-specific acronyms for a given vendor
 */
function getVendorAcronyms(vendorName) {
    if (!vendorName)
        return {};
    const normalizedVendor = vendorName.trim();
    // Direct match
    if (exports.VENDOR_SPECIFIC_ACRONYMS[normalizedVendor]) {
        return exports.VENDOR_SPECIFIC_ACRONYMS[normalizedVendor];
    }
    // Fuzzy matching for common variations
    const lowerVendor = normalizedVendor.toLowerCase();
    if (lowerVendor.includes('johnson') || lowerVendor.includes('jci')) {
        return exports.JOHNSON_CONTROLS_ACRONYMS;
    }
    if (lowerVendor.includes('siemens')) {
        return exports.SIEMENS_ACRONYMS;
    }
    if (lowerVendor.includes('trane')) {
        return exports.TRANE_ACRONYMS;
    }
    if (lowerVendor.includes('honeywell')) {
        return exports.HONEYWELL_ACRONYMS;
    }
    if (lowerVendor.includes('schneider') || lowerVendor.includes('andover') || lowerVendor.includes('continuum')) {
        return exports.SCHNEIDER_ACRONYMS;
    }
    return {};
}
/**
 * Get all applicable vendor acronyms with priority scoring
 */
function getVendorAcronymsWithPriority(vendorName) {
    const vendorAcronyms = getVendorAcronyms(vendorName);
    const results = [];
    // Add vendor-specific acronyms with high priority
    Object.entries(vendorAcronyms).forEach(([acronym, expansion]) => {
        results.push({
            acronym,
            expansion,
            priority: 90, // Vendor-specific gets high priority (but lower than equipment-specific)
            source: `VENDOR_${vendorName.toUpperCase().replace(/\s+/g, '_')}`
        });
    });
    return results.sort((a, b) => b.priority - a.priority);
}
/**
 * Determine vendor from common naming patterns
 */
function inferVendorFromPattern(pointName) {
    const name = pointName.toLowerCase();
    // Johnson Controls patterns
    if (name.includes('znt') || name.includes('znsp') || name.includes('oatemp') ||
        name.includes('dmpr') || name.includes('airflw')) {
        return 'Johnson Controls';
    }
    // Siemens patterns
    if (name.includes('t_') || name.includes('p_') || name.includes('f_') ||
        name.includes('d_') || name.includes('v_')) {
        return 'Siemens';
    }
    // Trane patterns
    if (name.includes('zonetemp') || name.includes('supplytemp') ||
        name.includes('outdoortemp') || name.includes('staticpress')) {
        return 'Trane';
    }
    // Honeywell patterns
    if (name.includes('rmtemp') || name.includes('sptemp') ||
        name.includes('airfl') || name.includes('stpres')) {
        return 'Honeywell';
    }
    // Schneider patterns
    if (name.includes('_temp') || name.includes('_press') ||
        name.includes('_flow') || name.includes('_damper')) {
        return 'Schneider Electric';
    }
    return null;
}
exports.default = exports.VENDOR_SPECIFIC_ACRONYMS;
