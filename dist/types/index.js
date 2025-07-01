"use strict";
/**
 * Central Type Exports
 * Building Automation Equipment Mapping UI Types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingState = void 0;
// Equipment Types (includes NormalizedPoint, EquipmentTemplate, CxAlloyEquipment, EquipmentMapping)
__exportStar(require("./equipment"), exports);
// Point Types  
__exportStar(require("./point"), exports);
// Trio File Types
__exportStar(require("./trio"), exports);
// Haystack Types
__exportStar(require("./haystack"), exports);
/**
 * Loading States
 */
var LoadingState;
(function (LoadingState) {
    LoadingState["IDLE"] = "idle";
    LoadingState["LOADING"] = "loading";
    LoadingState["SUCCESS"] = "success";
    LoadingState["ERROR"] = "error";
})(LoadingState || (exports.LoadingState = LoadingState = {}));
