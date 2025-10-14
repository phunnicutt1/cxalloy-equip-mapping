# Mock CxAlloy Equipment Data

This directory contains mock data for CxAlloy equipment that can be used when a local database is not available.

## File

- `mock-cxalloy-equipment.json` - Contains 29 equipment items that roughly match the devices in `public/ConnectorData.csv`

## Equipment Breakdown

The mock data includes:
- **Exact matches**: Equipment with names matching BACnet devices (e.g., VAV-01-21, VAV-01-16, AHU-1_ERV-1)
- **Similar equipment**: Equipment of the same type but different locations/numbers
- **Different equipment**: RTUs, Chillers, Boilers, Pumps, and other equipment not in the BACnet device list

Total: 29 equipment items (within 10% variance of 28 BACnet devices)

## Usage

### In Dashboard (app/dashboard/page.tsx)

The dashboard is configured to use mock data by default:

```typescript
const useMock = true; // Set to false to use real database
```

### Via API Route

You can enable/disable mock data in several ways:

1. **Query Parameter**: `/api/cxalloy/equipment?projectId=2&useMock=true`

2. **Environment Variable**: Set `USE_MOCK_DATA=true` in `.env.local`

3. **Default Behavior**: When `useMock` parameter is not provided, the API uses the real database

## Switching Between Mock and Real Data

To use the **real database**:
1. Edit `app/dashboard/page.tsx`
2. Change `const useMock = true;` to `const useMock = false;`

To use **mock data**:
1. Keep `const useMock = true;` in `app/dashboard/page.tsx`
2. Or add `USE_MOCK_DATA=true` to `.env.local`

## Data Structure

Each equipment item has:
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "description": "string (optional)",
  "location": "string (optional)",
  "floor": "string (optional)",
  "space": "string (optional)",
  "zone": "string (optional)",
  "vendor": "string (optional)",
  "model": "string (optional)",
  "status": "string (optional)",
  "projectId": number
}
```
