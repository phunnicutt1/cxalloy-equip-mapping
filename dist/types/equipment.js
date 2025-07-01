"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionState = exports.EquipmentStatus = exports.EquipmentType = void 0;
/**
 * Equipment Type Enumeration
 * Based on filename patterns from sample data analysis
 */
var EquipmentType;
(function (EquipmentType) {
    EquipmentType["LAB_AIR_VALVE"] = "Lab Air Valve";
    EquipmentType["VAV_CONTROLLER"] = "VAV Controller";
    EquipmentType["RTU_CONTROLLER"] = "RTU Controller";
    EquipmentType["AIR_HANDLER_UNIT"] = "Air Handler Unit";
    EquipmentType["EXHAUST_FAN"] = "Exhaust Fan";
    EquipmentType["CHILLER"] = "Chiller";
    EquipmentType["BOILER"] = "Boiler";
    EquipmentType["UNIT_HEATER"] = "Unit Heater";
    EquipmentType["HUMIDIFIER"] = "Humidifier";
    EquipmentType["RETURN_VAV"] = "Return VAV";
    EquipmentType["AHU_CONTROLLER"] = "AHU Controller";
    EquipmentType["CHILLER_SYSTEM"] = "Chiller System";
    EquipmentType["BOILER_SYSTEM"] = "Boiler System";
    EquipmentType["PUMP_CONTROLLER"] = "Pump Controller";
    EquipmentType["UNKNOWN"] = "Unknown";
})(EquipmentType || (exports.EquipmentType = EquipmentType = {}));
/**
 * Equipment Status from BACnet Device
 */
var EquipmentStatus;
(function (EquipmentStatus) {
    EquipmentStatus["OPERATIONAL"] = "OPERATIONAL";
    EquipmentStatus["FAULT"] = "FAULT";
    EquipmentStatus["OFFLINE"] = "OFFLINE";
    EquipmentStatus["DISABLED"] = "DISABLED";
    EquipmentStatus["UNKNOWN"] = "UNKNOWN";
})(EquipmentStatus || (exports.EquipmentStatus = EquipmentStatus = {}));
/**
 * Connection State for BACnet Communication
 */
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["OPEN"] = "open";
    ConnectionState["CLOSED"] = "closed";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["ERROR"] = "error";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
