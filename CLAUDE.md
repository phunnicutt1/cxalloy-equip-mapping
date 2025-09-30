# CLAUDE.md - AI Assistant Documentation

## Project Overview
CxAlloy Equipment Mapping & Analytics Platform - A Next.js application for mapping BACnet equipment points to CxAlloy equipment with template-based bulk operations and comprehensive analytics.

## Current State (September 2025)

### ✅ Working Features
- **Auto-Process System**: Processes 23 TRIO files (~31,400 lines) from `/public/sample_data/` directory
- **Equipment Mapping Interface**: Three-panel UI for mapping BACnet to CxAlloy equipment
- **Point Tracking System**: Select and manage individual points with persistent state across equipment
- **Bulk Apply Tracked Points**: Copy tracked points from source equipment to multiple target equipment with merge/replace options
- **Smart Mapping Suggestions**: Intelligent equipment pairing suggestions shown in middle column header (confidence-based)
- **Template Database**: Full MySQL persistence for equipment mapping templates
- **Database Integration**: Full MySQL persistence with proper relationships
- **CSV Enhancement**: ConnectorData.csv integration for improved classification
- **Auto-Classification**: Automatic equipment type detection (AHU, VAV, CV, etc.)
- **Point Normalization**: Converts BACnet names to human-readable formats

### 🔧 Recent Work Completed (September 2025)
- **Simplified Point Tracking**: Removed complex point tracking template system in favor of direct bulk apply
- **Bulk Apply Dialog**: New modal for copying tracked points to multiple equipment with clear/merge options
- **Smart Suggestions UI**: Moved equipment mapping suggestions from left panel to middle column header
- **Persistent Point State**: Tracked points automatically restore when switching between equipment
- **Save All Mappings Fix**: Fixed to save tracked points for ALL mapped equipment, not just selected one
- **UI Cleanup**: Removed template dropdown from middle column, simplified header layout
- **State Synchronization**: Added useEffect to sync displayed points with persisted tracked points
- Successfully processing 23 TRIO files with ~31,400 lines of BACnet data
- Enhanced CSV processing with ConnectorData.csv integration
- 15 API endpoints for full functionality

### 📁 Key Files & Locations

#### Components
- `/components/points/BulkApplyDialog.tsx` - Bulk apply tracked points to multiple equipment (NEW)
- `/components/points/PointDetails.tsx` - Point selection, tracking, and smart suggestions display
- `/components/equipment/EquipmentBrowser.tsx` - Equipment selection (data sources, left panel)
- `/components/mapping/CxAlloyPanel.tsx` - CxAlloy equipment mapping (right panel)
- `/components/points/CompactPointRow.tsx` - Individual point display and tracking
- `/components/auto-process/AutoProcessButton.tsx` - Auto-processing trigger
- `/components/ui/switch.tsx` - Toggle switch for bulk apply options (NEW)

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
3. **Map to CxAlloy**:
   - Click Map button on CxAlloy equipment in right panel
   - OR use Smart Suggestion button that appears in middle column header
4. **Track Points**: Click Track button on individual points in middle column
5. **Bulk Apply Points**: Click "Bulk Apply Tracked Points" button to copy points to other equipment
6. **Save Mappings**: Click "Save Mappings" to persist all equipment mappings and tracked points to database

### 🐛 Known Issues & Considerations

1. **Database Dependency**: Requires active MySQL connection configured in `.env.local`
2. **Initial Setup Required**: Run `node scripts/setup-templates.js` to initialize template database
3. **Sample Data Processing**: 23 TRIO files in `/public/sample_data/` totaling ~31,400 lines
4. **Processing Performance**: Large file processing may take several seconds
5. **Point State Persistence**: Tracked points are stored in `trackedPointsByEquipment` and automatically restored when switching equipment
6. **Bulk Apply**: Target equipment must already be mapped to appear in bulk apply dialog

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
- **Key State Properties**:
  - `equipment`: BACnet equipment list with points
  - `cxAlloyEquipment`: CxAlloy equipment list
  - `equipmentMappings`: Current equipment mappings
  - `selectedEquipment`: Currently selected equipment
  - `selectedPoints`: Currently displayed point selections (UI state)
  - `trackedPointsByEquipment`: Persistent tracked points for each equipment (Record<equipmentId, Set<pointId>>)
  - `showBulkApplyDialog`: Controls bulk apply dialog visibility
- **Point Tracking Logic**:
  - When points are tracked, they're stored in both `selectedPoints` (current view) and `trackedPointsByEquipment` (persistent)
  - When equipment changes, `selectedPoints` is synced from `trackedPointsByEquipment`
  - Bulk apply reads from `trackedPointsByEquipment` to get all tracked points for each equipment

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
- When Save Mappings is clicked:

  1. Equipment Update (Working before):
    - Updates equipment table with ek_skyspark = bacnetEquipmentId
  2. Point Persistence (Fixed now):
    - For each tracked point:
        - Inserts/updates point table with point name and description
      - Retrieves point_id from database
      - Inserts/updates equipmentpoint table with:
            - fk_equipment = CxAlloy equipment ID
        - fk_point = point_id from point table
        - ek_skyspark = BACnet point ID (from point.id)
        - name = display name
        - is_tracked = 1
  3. Error Handling:
    - Catches and logs each point failure without stopping the process
    - Reports all errors back to user
    - Shows detailed error messages for debugging