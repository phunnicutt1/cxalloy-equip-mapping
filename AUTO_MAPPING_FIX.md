# Auto-Mapping Fix - October 2, 2025

## Problem
The auto-mapping functionality was reporting way too many pieces of equipment with incorrect exact matches because:

1. **Wrong Data Source**: The auto-map API was querying the database tables (`equipment_mapping` and `equipment`) instead of using the current in-memory equipment data from the store
2. **Stale Data**: The database might have had old/incorrect equipment data that didn't match what was currently loaded in the UI
3. **Mock Data Not Used**: Even when using mock CxAlloy equipment in the UI, auto-mapping was still using real database queries

## Solution

Changed the auto-mapping to use **client-side equipment data** instead of database queries:

### 1. Updated Auto-Map API (`app/api/auto-map/route.ts`)

**Before:**
```typescript
// Queried database tables directly
const bacnetQuery = `SELECT ... FROM equipment_mapping ...`;
const cxAlloyQuery = `SELECT ... FROM equipment ...`;
const [bacnetResults, cxAlloyResults] = await Promise.all([
  executeQuery(bacnetQuery, []),
  executeQuery(cxAlloyQuery, [])
]);
```

**After:**
```typescript
// Receives equipment data from client
const body = await request.json();
const bacnetEquipment: Equipment[] = body.bacnetEquipment || [];
const cxAlloyEquipment: CxAlloyEquipment[] = body.cxAlloyEquipment || [];
```

### 2. Updated Store (`store/app-store.ts`)

**Before:**
```typescript
const response = await fetch('/api/auto-map', { method: 'POST' });
```

**After:**
```typescript
const state = get();
const response = await fetch('/api/auto-map', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bacnetEquipment: state.equipment,
    cxAlloyEquipment: state.cxAlloyEquipment
  })
});
```

### 3. Updated API Adapter (`lib/api-adapter.ts`)

**Before:**
```typescript
async performAutoMapping(confidenceThreshold: number = 80) {
  const response = await fetch('/api/auto-map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confidenceThreshold }),
  });
}
```

**After:**
```typescript
async performAutoMapping(bacnetEquipment: any[], cxAlloyEquipment: any[], confidenceThreshold: number = 80) {
  const response = await fetch('/api/auto-map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bacnetEquipment,
      cxAlloyEquipment,
      confidenceThreshold
    }),
  });
}
```

## Benefits

1. **Accurate Matching**: Auto-mapping now uses the exact equipment data currently displayed in the UI
2. **Mock Data Compatible**: Works correctly with mock CxAlloy equipment data
3. **No Database Dependency**: Auto-mapping works even if database is empty or unavailable
4. **Real-time Data**: Always uses the most current equipment data from the store
5. **Consistent Results**: Matching is based on what the user actually sees in the UI

## Testing

To verify the fix:

1. Load the dashboard with mock data (`useMock = true`)
2. Click "Auto Map Equipment" button
3. Verify that:
   - Equipment counts match what's displayed in the UI
   - Exact matches are correct (e.g., VAV-01-21 → VAV-01-21)
   - Suggested matches make sense
   - No duplicate or phantom equipment

## Files Changed

- `app/api/auto-map/route.ts` - Changed to accept equipment data from request body
- `store/app-store.ts` - Pass equipment data from store to API
- `lib/api-adapter.ts` - Updated signature to include equipment arrays
