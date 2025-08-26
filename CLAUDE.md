# CLAUDE.md - AI Assistant Documentation

## Project Overview
CxAlloy Equipment Mapping & Analytics Platform - A Next.js application for mapping BACnet equipment points to CxAlloy equipment with template-based bulk operations and comprehensive analytics.

## Current State (August 2025)

### ✅ Working Features
- **Auto-Process System**: Processes 23 TRIO files (~31,400 lines) from `/public/sample_data/` directory
- **Equipment Mapping Interface**: Dual-panel UI for mapping BACnet to CxAlloy equipment
- **Point Tracking System**: Select and manage individual points within mappings
- **Unified Template System**: Consolidated template management with database persistence
- **Bulk Mapping Wizard**: Enhanced 3-step wizard with detailed results visualization
- **Template Database**: Full MySQL persistence replacing localStorage storage
- **Template Migration**: Automatic migration from legacy localStorage templates
- **Analytics Dashboard**: Comprehensive insights into template effectiveness and usage
- **Database Integration**: Full MySQL persistence with proper relationships
- **CSV Enhancement**: ConnectorData.csv integration for improved classification
- **Auto-Classification**: Automatic equipment type detection (AHU, VAV, CV, etc.)
- **Point Normalization**: Converts BACnet names to human-readable formats

### 🔧 Recent Work Completed
- **Unified Template System**: Consolidated point tracking and mapping templates into single system
- **Database Migration**: Moved from localStorage to MySQL database persistence
- **Enhanced Bulk Mapping**: Improved wizard with detailed results visualization and confidence scoring
- **Template Database Service**: New TemplateDbService for comprehensive template operations
- **API Consolidation**: Unified `/app/api/templates/route.ts` endpoint replacing separate systems
- **State Management Update**: Updated Zustand store for unified template handling
- **Migration Tools**: Automatic migration from legacy template formats
- **Error Handling**: Robust JSON parsing and database connection management
- Successfully processing 23 TRIO files with ~31,400 lines of BACnet data
- Enhanced CSV processing with ConnectorData.csv integration
- Expanded API endpoints to 15 different routes for full functionality

### 📁 Key Files & Locations

#### Components
- `/components/templates/BulkMappingModal.tsx` - Bulk mapping wizard implementation
- `/components/equipment/EquipmentBrowser.tsx` - Equipment selection and mapping UI
- `/components/points/CompactPointRow.tsx` - Point display and tracking
- `/components/auto-process/AutoProcessButton.tsx` - Auto-processing trigger
- `/components/analytics/TemplateAnalyticsDashboard.tsx` - Analytics visualization

#### Services & Logic
- `/lib/services/unified-template-service.ts` - Consolidated template service (replaces legacy services)
- `/database/template-db-service.ts` - Database operations for unified templates
- `/database/db-service.ts` - MySQL connection pool management
- `/lib/services/auto-mapping-service.ts` - Automatic mapping algorithms
- `/lib/processors/trio-processor.ts` - TRIO file parsing
- `/lib/processors/enhanced-csv-processor.ts` - CSV enhancement processing
- `/scripts/setup-templates.js` - Database initialization script

#### Types
- `/types/unified-template.ts` - Unified template system type definitions (NEW)
- `/types/template-mapping.ts` - Legacy template types (deprecated)
- `/types/equipment.ts` - Equipment and CxAlloyEquipment types
- `/types/normalized.ts` - Normalized point types
- `/types/auto-mapping.ts` - Auto-mapping configuration types

#### API Routes (15 endpoints)
- `/app/api/auto-process/route.ts` - Main file processing endpoint
- `/app/api/auto-map/route.ts` - Auto-mapping functionality
- `/app/api/analytics/route.ts` - Analytics data and insights
- `/app/api/templates/route.ts` - Template CRUD operations
- `/app/api/equipment/route.ts` - Equipment data management
- `/app/api/cxalloy/equipment/route.ts` - CxAlloy integration
- `/app/api/save-mappings/route.ts` - Mapping persistence
- `/app/api/database/route.ts` - Database operations
- `/app/api/refresh/route.ts` - Data refresh utilities
- Plus additional endpoints for comprehensive functionality

### 🎯 Workflow

1. **Process Data**: Click "Process All Files" to load TRIO files
2. **Select Equipment**: Choose BACnet equipment from left panel
3. **Map to CxAlloy**: Select corresponding CxAlloy equipment from right panel
4. **Track Points**: Select points to include in the mapping
5. **Create Template**: Save the mapping as a reusable template
6. **Bulk Operations**: Use templates for bulk mapping similar equipment

### 🐛 Known Issues & Considerations

1. **Database Dependency**: Requires active MySQL connection configured in `.env.local`
2. **Initial Setup Required**: Run `node scripts/setup-templates.js` to initialize template database
3. **Sample Data Processing**: 23 TRIO files in `/public/sample_data/` totaling ~31,400 lines
4. **Processing Performance**: Large file processing may take several seconds
5. **Migration Period**: Legacy localStorage templates will be automatically migrated
6. **Template Creation Workflow**: Templates can be created from both point tracking and equipment mapping

### 💡 Commands & Testing

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

### 🔄 State Management
- Uses Zustand for global state (`/store/app-store.ts`)
- **Updated for Unified Templates**:
  - `templates`: Unified template list (replaces separate template arrays)
  - `equipment`: BACnet equipment list
  - `cxAlloyEquipment`: CxAlloy equipment list
  - `equipmentMappings`: Current mappings
  - `selectedEquipment`: Currently selected items
  - `templateApplications`: Template usage history
- **Backward Compatibility**: Legacy template methods preserved during transition

### 📊 Database Schema
```sql
-- UNIFIED TEMPLATE SYSTEM (NEW)
unified_templates (
  id, name, description, equipment_type, category, vendor, model,
  source_equipment_id, source_equipment_name, source_bacnet_id, source_bacnet_name,
  template_type, is_built_in, is_default, usage_count, success_rate, effectiveness,
  created_at, updated_at, created_by, updated_by
)

template_points (
  id, template_id, template_point_id, name, description,
  point_function, object_type, units, required,
  bacnet_cur, bacnet_dis, bacnet_desc, nav_name,
  matching_facet, confidence, haystack_tags, display_order
)

template_applications (
  id, template_id, template_name, target_equipment_id, target_equipment_name, target_equipment_type,
  applied_points, matching_options, matching_results,
  application_type, is_successful, errors, applied_at, applied_by
)

-- Core equipment tables
equipment (id, name, type, totalPoints, processed_at, ...)
equipment_points (id, equipment_id, originalName, normalizedName, haystackTags, ...)

-- Analytics and tracking
audit_trail (id, entity_type, entity_id, action, changes, timestamp, ...)
processing_logs (id, file_name, status, processed_count, errors, ...)
```

### 🚀 Next Steps Recommendations
1. ✅ ~~Implement database persistence for templates~~ (COMPLETED - now using MySQL)
2. Add template versioning and history
3. Enhance matching algorithms with ML-based suggestions
4. Add export functionality for mapped data
5. Implement user authentication and multi-tenancy
6. Add real-time collaboration features
7. Create comprehensive test suite
8. Add template sharing and collaboration features
9. Implement advanced analytics and insights
10. Add template validation and testing framework

### 📝 Notes for Future Development
- **Unified Template System**: Single source of truth for all template operations
- **Database First**: All templates now persist in MySQL database, not localStorage
- **Migration Complete**: Legacy template systems have been consolidated
- **Enhanced UI**: Bulk mapping wizard shows detailed results with confidence scoring
- Template system supports confidence scoring for automatic application
- Analytics engine tracks template effectiveness and optimization opportunities
- CSV enhancement provides vendor-specific classification rules
- System supports 23 TRIO files with comprehensive equipment type detection
- Point normalization converts BACnet naming to human-readable formats
- **Robust Error Handling**: JSON parsing and database connection issues resolved
- **Backward Compatibility**: Legacy template methods preserved during transition

## Environment Variables
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Contact & Support
For issues or questions about this codebase, refer to the README.md for usage instructions or check the GitHub repository issues.