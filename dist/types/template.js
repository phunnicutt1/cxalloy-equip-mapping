"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateScope = exports.TemplateType = void 0;
/**
 * Template Type Enumeration
 */
var TemplateType;
(function (TemplateType) {
    TemplateType["EQUIPMENT"] = "equipment";
    TemplateType["POINT_CONFIGURATION"] = "point_configuration";
    TemplateType["NORMALIZATION_RULES"] = "normalization_rules";
    TemplateType["HAYSTACK_TAGS"] = "haystack_tags";
})(TemplateType || (exports.TemplateType = TemplateType = {}));
/**
 * Template Scope
 * Defines where and how templates can be applied
 */
var TemplateScope;
(function (TemplateScope) {
    TemplateScope["GLOBAL"] = "global";
    TemplateScope["PROJECT"] = "project";
    TemplateScope["ORGANIZATION"] = "organization";
    TemplateScope["PERSONAL"] = "personal"; // User-specific
})(TemplateScope || (exports.TemplateScope = TemplateScope = {}));
