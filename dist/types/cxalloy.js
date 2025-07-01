"use strict";
/**
 * CxAlloy Integration Interfaces
 * For mapping BACnet equipment to CxAlloy project equipment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CxAlloyEquipmentCategory = exports.CxAlloyProjectPhase = exports.CxAlloyEquipmentStatus = void 0;
/**
 * CxAlloy Equipment Status
 */
var CxAlloyEquipmentStatus;
(function (CxAlloyEquipmentStatus) {
    CxAlloyEquipmentStatus["ACTIVE"] = "active";
    CxAlloyEquipmentStatus["INACTIVE"] = "inactive";
    CxAlloyEquipmentStatus["UNDER_CONSTRUCTION"] = "under_construction";
    CxAlloyEquipmentStatus["COMMISSIONED"] = "commissioned";
    CxAlloyEquipmentStatus["TESTING"] = "testing";
    CxAlloyEquipmentStatus["DEFICIENT"] = "deficient";
    CxAlloyEquipmentStatus["COMPLETE"] = "complete";
})(CxAlloyEquipmentStatus || (exports.CxAlloyEquipmentStatus = CxAlloyEquipmentStatus = {}));
/**
 * CxAlloy Project Phase
 */
var CxAlloyProjectPhase;
(function (CxAlloyProjectPhase) {
    CxAlloyProjectPhase["DESIGN"] = "design";
    CxAlloyProjectPhase["CONSTRUCTION"] = "construction";
    CxAlloyProjectPhase["COMMISSIONING"] = "commissioning";
    CxAlloyProjectPhase["STARTUP"] = "startup";
    CxAlloyProjectPhase["WARRANTY"] = "warranty";
    CxAlloyProjectPhase["OPERATIONS"] = "operations";
})(CxAlloyProjectPhase || (exports.CxAlloyProjectPhase = CxAlloyProjectPhase = {}));
/**
 * CxAlloy Equipment Category
 */
var CxAlloyEquipmentCategory;
(function (CxAlloyEquipmentCategory) {
    CxAlloyEquipmentCategory["HVAC"] = "hvac";
    CxAlloyEquipmentCategory["ELECTRICAL"] = "electrical";
    CxAlloyEquipmentCategory["PLUMBING"] = "plumbing";
    CxAlloyEquipmentCategory["FIRE_SAFETY"] = "fire_safety";
    CxAlloyEquipmentCategory["SECURITY"] = "security";
    CxAlloyEquipmentCategory["BUILDING_AUTOMATION"] = "building_automation";
    CxAlloyEquipmentCategory["OTHER"] = "other";
})(CxAlloyEquipmentCategory || (exports.CxAlloyEquipmentCategory = CxAlloyEquipmentCategory = {}));
