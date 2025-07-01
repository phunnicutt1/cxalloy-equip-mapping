"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointFunction = exports.NormalizationConfidence = void 0;
/**
 * Normalization Confidence Levels
 */
var NormalizationConfidence;
(function (NormalizationConfidence) {
    NormalizationConfidence["HIGH"] = "high";
    NormalizationConfidence["MEDIUM"] = "medium";
    NormalizationConfidence["LOW"] = "low";
    NormalizationConfidence["UNKNOWN"] = "unknown"; // <0.2 - No reliable match found
})(NormalizationConfidence || (exports.NormalizationConfidence = NormalizationConfidence = {}));
/**
 * Point Function Categories
 * High-level categorization of point functions
 */
var PointFunction;
(function (PointFunction) {
    PointFunction["Sensor"] = "sensor";
    PointFunction["Setpoint"] = "setpoint";
    PointFunction["Command"] = "command";
    PointFunction["Status"] = "status";
    PointFunction["Unknown"] = "unknown";
})(PointFunction || (exports.PointFunction = PointFunction = {}));
