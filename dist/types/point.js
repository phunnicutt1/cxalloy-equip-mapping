"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACnetPriority = exports.PointCategory = exports.PointDataType = exports.BACnetObjectType = void 0;
/**
 * BACnet Object Types
 * Based on BACnet protocol specification and sample data analysis
 */
var BACnetObjectType;
(function (BACnetObjectType) {
    // Analog Types
    BACnetObjectType["ANALOG_INPUT"] = "AI";
    BACnetObjectType["ANALOG_OUTPUT"] = "AO";
    BACnetObjectType["ANALOG_VALUE"] = "AV";
    // Binary Types
    BACnetObjectType["BINARY_INPUT"] = "BI";
    BACnetObjectType["BINARY_OUTPUT"] = "BO";
    BACnetObjectType["BINARY_VALUE"] = "BV";
    // Multi-state Types
    BACnetObjectType["MULTISTATE_INPUT"] = "MSI";
    BACnetObjectType["MULTISTATE_OUTPUT"] = "MSO";
    BACnetObjectType["MULTISTATE_VALUE"] = "MSV";
    // Other Types
    BACnetObjectType["DEVICE"] = "DEV";
    BACnetObjectType["FILE"] = "FILE";
    BACnetObjectType["PROGRAM"] = "PRG";
    BACnetObjectType["SCHEDULE"] = "SCH";
    BACnetObjectType["CALENDAR"] = "CAL";
    BACnetObjectType["NOTIFICATION_CLASS"] = "NC";
    BACnetObjectType["LOOP"] = "LOOP";
    BACnetObjectType["TREND_LOG"] = "TL";
    BACnetObjectType["LIFE_SAFETY_POINT"] = "LSP";
    BACnetObjectType["LIFE_SAFETY_ZONE"] = "LSZ";
})(BACnetObjectType || (exports.BACnetObjectType = BACnetObjectType = {}));
/**
 * Data Types for Point Values
 */
var PointDataType;
(function (PointDataType) {
    PointDataType["NUMBER"] = "Number";
    PointDataType["BOOLEAN"] = "Bool";
    PointDataType["STRING"] = "String";
    PointDataType["ENUMERATED"] = "Enum";
    PointDataType["NULL"] = "Null";
})(PointDataType || (exports.PointDataType = PointDataType = {}));
/**
 * Point Categories for Classification
 */
var PointCategory;
(function (PointCategory) {
    PointCategory["SENSOR"] = "sensor";
    PointCategory["COMMAND"] = "command";
    PointCategory["STATUS"] = "status";
    PointCategory["SETPOINT"] = "setpoint";
    PointCategory["ALARM"] = "alarm";
    PointCategory["UNKNOWN"] = "unknown";
})(PointCategory || (exports.PointCategory = PointCategory = {}));
/**
 * Priority Array for BACnet Writable Points
 */
var BACnetPriority;
(function (BACnetPriority) {
    BACnetPriority[BACnetPriority["MANUAL_LIFE_SAFETY"] = 1] = "MANUAL_LIFE_SAFETY";
    BACnetPriority[BACnetPriority["AUTOMATIC_LIFE_SAFETY"] = 2] = "AUTOMATIC_LIFE_SAFETY";
    BACnetPriority[BACnetPriority["CRITICAL_EQUIPMENT_CONTROL"] = 3] = "CRITICAL_EQUIPMENT_CONTROL";
    BACnetPriority[BACnetPriority["MINIMUM_ON_OFF"] = 4] = "MINIMUM_ON_OFF";
    BACnetPriority[BACnetPriority["MAXIMUM_ON_OFF"] = 5] = "MAXIMUM_ON_OFF";
    BACnetPriority[BACnetPriority["CRITICAL_CONTROL"] = 6] = "CRITICAL_CONTROL";
    BACnetPriority[BACnetPriority["MINIMUM_CONTROL"] = 7] = "MINIMUM_CONTROL";
    BACnetPriority[BACnetPriority["MAXIMUM_CONTROL"] = 8] = "MAXIMUM_CONTROL";
    BACnetPriority[BACnetPriority["CRITICAL_OVERRIDE"] = 9] = "CRITICAL_OVERRIDE";
    BACnetPriority[BACnetPriority["AVAILABLE_10"] = 10] = "AVAILABLE_10";
    BACnetPriority[BACnetPriority["AVAILABLE_11"] = 11] = "AVAILABLE_11";
    BACnetPriority[BACnetPriority["AVAILABLE_12"] = 12] = "AVAILABLE_12";
    BACnetPriority[BACnetPriority["AVAILABLE_13"] = 13] = "AVAILABLE_13";
    BACnetPriority[BACnetPriority["AVAILABLE_14"] = 14] = "AVAILABLE_14";
    BACnetPriority[BACnetPriority["AVAILABLE_15"] = 15] = "AVAILABLE_15";
    BACnetPriority[BACnetPriority["FALLBACK_VALUE"] = 16] = "FALLBACK_VALUE";
})(BACnetPriority || (exports.BACnetPriority = BACnetPriority = {}));
