# CxAlloy Equipment Mapping - Quick Start

## What This Is
Next.js app for mapping BACnet equipment points to CxAlloy equipment with point tracking and bulk operations.

## Critical Architecture

### State Management (Zustand)
- **Store**: `/store/app-store.ts`
- **Key State**:
  - `selectedEquipment` - Current BACnet equipment being viewed
  - `equipmentMappings` - BACnet → CxAlloy mappings
  - `selectedPoints` - Currently displayed point selections (UI state)
  - `trackedPointsByEquipment` - Persistent tracked points per equipment `Record<equipmentId, Set<pointId>>`
  - Point syncing happens in `setSelectedEquipment()` action (lines 181-233)

### Main Components
- `/app/dashboard/page.tsx` - Main 3-panel UI
- `/components/equipment/EquipmentBrowser.tsx` - Left panel (BACnet equipment)
- `/components/points/PointDetails.tsx` - Middle panel (points list)
- `/components/mapping/CxAlloyPanel.tsx` - Right panel (CxAlloy equipment)
- `/components/points/BulkApplyDialog.tsx` - Copy tracked points to multiple equipment

### Save Mappings Flow
When "Save Mappings" clicked (`/app/api/save-mappings/route.ts`):
1. Updates `equipment` table: `ek_skyspark = bacnetEquipmentId`
2. For each tracked point:
   - Insert/update `point` table (name, description)
   - Get `point_id` from database
   - Insert/update `equipmentpoint` table:
     - `fk_equipment` = CxAlloy equipment ID
     - `fk_point` = point_id
     - `ek_skyspark` = BACnet point ID
     - `is_tracked = 1`

### Database
MySQL connection via `.env.local`:
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Key tables: `equipment`, `point`, `equipmentpoint`

**Critical Development Facts - External Keys (`ek_skyspark`)**:
- The `ek_skyspark` field exists in MULTIPLE tables (equipment, equipmentpoint, etc.)
- It serves as an external key AND mapping indicator throughout the system
- **Equipment Mapping**: When equipment is mapped to a BACnet device, we update:
  - `equipment.ek_skyspark = bacnetEquipmentId` (the device ID from SkySpark/BACnet)
  - This links the CxAlloy equipment record to its physical data source
- **Point Tracking**: When points are tracked, we update:
  - `equipmentpoint.ek_skyspark = bacnetPointId` (the point ID from SkySpark/BACnet)
  - This links the CxAlloy point record to its actual data point on the device
  - The point has its OWN external key to the point ID in SkySpark
  - The equipmentpoint record ties together: CxAlloy equipment + CxAlloy point + external device point
- In summary: `ek_skyspark` is the universal "link to external system" field used consistently across the database to indicate mapped/linked records

## Common Issues

### Infinite Loop Errors
- **Never put arrays/objects in useEffect deps** - they get new references every render
- Use primitive values instead: `equipment.id` not `equipment`, `items.length` not `items`
- Call functions inside the effect, don't depend on computed values
- See [REACT_PATTERNS.md](./REACT_PATTERNS.md) for examples

### Point Tracking
- DO NOT add `useEffect` in PointDetails.tsx that syncs tracked points
- Syncing is already handled in store's `setSelectedEquipment()`
- `trackedPointsByEquipment` object reference changes on every toggle

## Dev Commands
```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run typecheck  # TypeScript check
```

## Workflow
1. Process files → Select BACnet equipment (left)
2. Map to CxAlloy equipment (right panel "Map" button)
3. Track points (middle panel "Track" button)
4. Bulk apply tracked points to other equipment
5. Save Mappings → Persists to database
