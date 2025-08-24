# CLAUDE.md - AI Assistant Documentation

## Project Overview
CxAlloy Equipment Mapping & Analytics Platform - A Next.js application for mapping BACnet equipment points to CxAlloy equipment with template-based bulk operations and comprehensive analytics.

## Current State (January 2025)

### ✅ Working Features
- **Auto-Process System**: Processes TRIO files from `/public/sample_data/` directory
- **Equipment Mapping**: Maps BACnet equipment to CxAlloy equipment with point tracking
- **Template System**: Create templates from mapped equipment for reuse
- **Bulk Mapping Wizard**: 3-step wizard for applying templates to multiple equipment pairs
- **Analytics Dashboard**: Comprehensive analytics for template effectiveness and usage patterns
- **Database Integration**: MySQL database storing equipment, points, templates, and mappings
- **CSV Enhancement**: Processes ConnectorData.csv for enhanced point classification

### 🔧 Recent Work Completed
- Fixed and verified bulk mapping functionality (wizard is fully operational)
- Processed 9 equipment items with 368 total points successfully
- Implemented template creation from mapped equipment
- Added analytics system for tracking template performance
- Enhanced CSV processing integrated into auto-process workflow

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

#### API Routes
- `/app/api/auto-process/route.ts` - Main processing endpoint
- `/app/api/auto-map/route.ts` - Auto-mapping endpoint
- `/app/api/analytics/route.ts` - Analytics data endpoint

### 🎯 Workflow

1. **Process Data**: Click "Process All Files" to load TRIO files
2. **Select Equipment**: Choose BACnet equipment from left panel
3. **Map to CxAlloy**: Select corresponding CxAlloy equipment from right panel
4. **Track Points**: Select points to include in the mapping
5. **Create Template**: Save the mapping as a reusable template
6. **Bulk Operations**: Use templates for bulk mapping similar equipment

### 🐛 Known Issues & Considerations

1. **Template Availability**: Bulk mapping requires existing templates (shows "No templates available" when none exist - this is expected behavior)
2. **Local Storage**: Templates currently stored in localStorage (not persistent across browsers)
3. **Database Connection**: Requires MySQL database configuration in `.env.local`
4. **Sample Data**: Located in `/public/sample_data/` directory

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
-- Key tables
equipment (id, name, type, totalPoints, ...)
equipment_points (id, equipment_id, originalName, normalizedName, ...)
equipment_templates (id, name, equipment_type, point_signatures, ...)
template_applications (id, template_id, equipment_id, confidence_score, ...)
mapping_templates (id, name, sourceEquipmentId, pointMappings, ...)
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
- The bulk mapping wizard is fully functional but requires templates to be created first
- Templates are created from successfully mapped equipment pairs
- The system uses confidence scoring for automatic matching
- Analytics provide insights into template effectiveness
- CSV enhancement adds vendor-specific rules and metadata

## Environment Variables
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Contact & Support
For issues or questions about this codebase, refer to the README.md for usage instructions or check the GitHub repository issues.