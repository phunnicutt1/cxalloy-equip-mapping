"use strict";
/**
 * Project Haystack v5 Interfaces
 * Based on Project Haystack v5 specification with Xeto schema support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaystackMarker = exports.HaystackTagCategory = void 0;
/**
 * Core Haystack Tag
 * Represents a single semantic tag in the Haystack taxonomy
 */
/*
export interface HaystackTagComplex {
  name: string; // Tag name (e.g., "site", "equip", "point", "temp", "sensor")
  value?: HaystackValue; // Tag value (marker tags have no value)
  
  // Metadata
  description?: string;
  category: HaystackTagCategory;
  isMarker: boolean; // True for marker tags (no value)
  
  // Haystack v5 Features
  xetoType?: string; // Xeto schema type
  inheritance?: string[]; // Inherited tag types
  composition?: string[]; // Composed tag types
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
  
  // Source Tracking
  source: "manual" | "inferred" | "template" | "ml";
  confidence: number; // 0-1 confidence score
  appliedAt: Date;
}
*/
/**
 * Haystack Tag Categories
 * High-level categorization of tag types
 */
var HaystackTagCategory;
(function (HaystackTagCategory) {
    // Entity Tags
    HaystackTagCategory["ENTITY"] = "entity";
    // Function Tags  
    HaystackTagCategory["FUNCTION"] = "function";
    // Substance Tags
    HaystackTagCategory["SUBSTANCE"] = "substance";
    // Measurement Tags
    HaystackTagCategory["MEASUREMENT"] = "measurement";
    // Relationship Tags
    HaystackTagCategory["RELATIONSHIP"] = "relationship";
    // Metadata Tags
    HaystackTagCategory["METADATA"] = "metadata";
    // System Tags
    HaystackTagCategory["SYSTEM"] = "system";
    // Custom Tags
    HaystackTagCategory["CUSTOM"] = "custom"; // Organization-specific tags
})(HaystackTagCategory || (exports.HaystackTagCategory = HaystackTagCategory = {}));
/**
 * Standard Haystack Marker Tags
 * Common marker tags used in building automation
 */
var HaystackMarker;
(function (HaystackMarker) {
    // Entity Markers
    HaystackMarker["SITE"] = "site";
    HaystackMarker["EQUIP"] = "equip";
    HaystackMarker["POINT"] = "point";
    HaystackMarker["SPACE"] = "space";
    // Function Markers
    HaystackMarker["SENSOR"] = "sensor";
    HaystackMarker["CMD"] = "cmd";
    HaystackMarker["SP"] = "sp";
    // Substance Markers
    HaystackMarker["AIR"] = "air";
    HaystackMarker["WATER"] = "water";
    HaystackMarker["STEAM"] = "steam";
    HaystackMarker["ELEC"] = "elec";
    // Measurement Markers
    HaystackMarker["TEMP"] = "temp";
    HaystackMarker["PRESSURE"] = "pressure";
    HaystackMarker["FLOW"] = "flow";
    HaystackMarker["POWER"] = "power";
    HaystackMarker["ENERGY"] = "energy";
    // Equipment Type Markers
    HaystackMarker["AHU"] = "ahu";
    HaystackMarker["VAV"] = "vav";
    HaystackMarker["FAN"] = "fan";
    HaystackMarker["PUMP"] = "pump";
    HaystackMarker["CHILLER"] = "chiller";
    HaystackMarker["BOILER"] = "boiler";
    // Point Type Markers
    HaystackMarker["SUPPLY"] = "supply";
    HaystackMarker["RETURN"] = "return";
    HaystackMarker["EXHAUST"] = "exhaust";
    HaystackMarker["ZONE"] = "zone";
    HaystackMarker["DISCHARGE"] = "discharge";
    // Status Markers
    HaystackMarker["ENABLE"] = "enable";
    HaystackMarker["RUN"] = "run";
    HaystackMarker["FAULT"] = "fault";
    HaystackMarker["ALARM"] = "alarm";
})(HaystackMarker || (exports.HaystackMarker = HaystackMarker = {}));
