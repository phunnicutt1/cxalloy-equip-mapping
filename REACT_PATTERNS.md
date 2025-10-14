# React Patterns & Common Pitfalls

## Infinite Loop Prevention in useEffect

### The Problem
Objects and arrays get new references on every render, causing useEffect to run infinitely.

### Rules
1. **Never put arrays/objects in dependency arrays** unless memoized
2. **Use primitive values**: IDs, lengths, strings, numbers
3. **Call functions inside effects** to get fresh data

### Examples

#### Bad: Array/Object Dependencies
```tsx
// ❌ Creates infinite loop
const filteredItems = getFiltered();
useEffect(() => {
  doSomething(filteredItems);
}, [filteredItems]); // New array reference every render!

// ❌ Object dependency
useEffect(() => {
  updateName(equipment.name);
}, [equipment]); // Object reference changes!
```

#### Good: Primitive Dependencies
```tsx
// ✅ Use primitive values
useEffect(() => {
  const items = getFiltered(); // Get fresh inside
  doSomething(items);
}, [searchTerm]); // Only when search changes

// ✅ Use object properties
useEffect(() => {
  updateName(equipment.name);
}, [equipment.id, equipment.name]); // Only when ID/name changes
```

### Fixed Locations in Codebase
- `app/dashboard/page.tsx:412` - Empty deps for mount-only
- `components/equipment/EquipmentBrowser.tsx:175,195` - Removed function/array deps
- `components/mapping/CxAlloyPanel.tsx:722` - Changed to primitive values

## Other React Best Practices

### State Updates
- Don't call `setState` during render - only in events or effects
- Use functional updates when new state depends on old: `setState(prev => prev + 1)`

### Memoization
- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props to memoized children
- Don't overuse - measure first!
