# CLAUDE.md - AI Assistant Documentation

## Project Overview
CxAlloy Equipment Mapping & Analytics Platform - A Next.js application for mapping BACnet equipment points to CxAlloy equipment with template-based bulk operations and comprehensive analytics.

## Current State (August 2025)

### ✅ Working Features
- **Auto-Process System**: Processes 23 TRIO files (~31,400 lines) from `/public/sample_data/` directory
- **Equipment Mapping Interface**: Dual-panel UI for mapping BACnet to CxAlloy equipment
- **Point Tracking System**: Select and manage individual points within mappings
- **Template System**: Create and manage reusable templates from successful mappings
- **Bulk Mapping Wizard**: 3-step wizard for applying templates to multiple equipment pairs
- **Analytics Dashboard**: Comprehensive insights into template effectiveness and usage
- **Database Integration**: Full MySQL persistence with proper relationships
- **CSV Enhancement**: ConnectorData.csv integration for improved classification
- **Auto-Classification**: Automatic equipment type detection (AHU, VAV, CV, etc.)
- **Point Normalization**: Converts BACnet names to human-readable formats

### 🔧 Recent Work Completed
- Fixed and verified bulk mapping functionality (wizard is fully operational)
- Successfully processing 23 TRIO files with ~31,400 lines of BACnet data
- Implemented comprehensive template creation and application system
- Added analytics system for tracking template performance and usage
- Enhanced CSV processing with ConnectorData.csv integration
- Expanded API endpoints to 15 different routes for full functionality
- Implemented MySQL database with proper schema and relationships

### 📁 Key Files & Locations

#### Components
- `/components/templates/BulkMappingModal.tsx` - Bulk mapping wizard implementation
- `/components/equipment/EquipmentBrowser.tsx` - Equipment selection and mapping UI
- `/components/points/CompactPointRow.tsx` - Point display and tracking
- `/components/auto-process/AutoProcessButton.tsx` - Auto-processing trigger
- `/components/analytics/TemplateAnalyticsDashboard.tsx` - Analytics visualization

#### Services & Logic
- `/lib/services/template-mapping-service.ts` - Template creation and application logic
- `/lib/services/auto-mapping-service.ts` - Automatic mapping algorithms
- `/database/db-service.ts` - Database operations
- `/lib/processors/trio-processor.ts` - TRIO file parsing
- `/lib/processors/enhanced-csv-processor.ts` - CSV enhancement processing

#### Types
- `/types/template-mapping.ts` - Template system type definitions
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

1. **Template Creation Workflow**: Bulk mapping requires creating templates from mapped equipment first
2. **Database Dependency**: Requires active MySQL connection configured in `.env.local`
3. **Sample Data Processing**: 23 TRIO files in `/public/sample_data/` totaling ~31,400 lines
4. **Processing Performance**: Large file processing may take several seconds
5. **Template Persistence**: Templates stored in database, not localStorage

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
- Key state includes:
  - `equipment`: BACnet equipment list
  - `cxAlloyEquipment`: CxAlloy equipment list
  - `equipmentMappings`: Current mappings
  - `selectedEquipment`: Currently selected items
  - `templateApplications`: Template usage history

### 📊 Database Schema
```sql
-- Core tables for equipment and point management
equipment (id, name, type, totalPoints, processed_at, ...)
equipment_points (id, equipment_id, originalName, normalizedName, haystackTags, ...)
equipment_templates (id, name, equipment_type, point_signatures, created_at, ...)
template_applications (id, template_id, equipment_id, confidence_score, applied_at, ...)
mapping_templates (id, name, sourceEquipmentId, pointMappings, metadata, ...)

-- Analytics and tracking
audit_trail (id, entity_type, entity_id, action, changes, timestamp, ...)
processing_logs (id, file_name, status, processed_count, errors, ...)
```

### 🚀 Next Steps Recommendations
1. Implement database persistence for templates (currently localStorage)
2. Add template versioning and history
3. Enhance matching algorithms with ML-based suggestions
4. Add export functionality for mapped data
5. Implement user authentication and multi-tenancy
6. Add real-time collaboration features
7. Create comprehensive test suite

### 📝 Notes for Future Development
- Bulk mapping wizard requires template creation workflow to be completed first
- Template system supports confidence scoring for automatic application
- Analytics engine tracks template effectiveness and optimization opportunities
- CSV enhancement provides vendor-specific classification rules
- System supports 23 TRIO files with comprehensive equipment type detection
- Point normalization converts BACnet naming to human-readable formats
- Database persistence ensures all mappings and templates survive browser sessions

## Environment Variables
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Contact & Support
For issues or questions about this codebase, refer to the README.md for usage instructions or check the GitHub repository issues.