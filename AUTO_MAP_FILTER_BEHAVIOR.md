# Auto-Map Filter Behavior

## Overview
After running auto-mapping, the left panel automatically filters to show only unmapped equipment, giving users an immediate visual of what's left to map.

## Behavior

### Before Auto-Mapping
- **Left Panel Filter**: "All" - Shows all BACnet equipment
- **Right Panel Filter**: "All" - Shows all CxAlloy equipment

### After Auto-Mapping Runs
- **Left Panel Filter**: Automatically switches to **"Unmapped"** - Shows only unmapped BACnet equipment
- **Right Panel Filter**: Stays on **"All"** - Shows all CxAlloy equipment

## Why This Makes Sense

1. **Shows Progress**: Users immediately see which BACnet equipment still needs to be mapped
2. **Dramatic Impact**: If 20 out of 25 devices were auto-mapped, the left panel will only show 5 items instead of 25
3. **Clear Next Steps**: Users can focus on the unmapped equipment that needs manual attention
4. **Right Panel Context**: Keeping the right panel on "All" shows the full CxAlloy equipment list for manual mapping of remaining items

## When This Happens

The filter automatically changes to "Unmapped Only" in these scenarios:

1. **Auto-Map Button**: When user clicks "Auto Map Equipment" and the process completes
2. **Apply Exact Matches**: When user applies exact matches from the auto-mapping results modal

## Resetting Filters

Users can always change the filter back to "All Equipment" or "Mapped Only" using the dropdown in each panel's header.

## Implementation

The filter change is implemented in the store's auto-mapping actions:

```typescript
// In performAutoMapping() and applyExactMappings()
set({
  // ... other state updates
  equipmentFilter: 'unmapped' // Automatically filter to unmapped
});
```

The `equipmentFilter` state is now stored globally in Zustand, allowing:
- Auto-mapping to control the filter automatically
- Users to manually change the filter at any time
- The filter state to persist across component re-renders

This provides immediate visual feedback showing the effectiveness of the auto-mapping process.
