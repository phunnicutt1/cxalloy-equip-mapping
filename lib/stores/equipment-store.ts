import type { Equipment, NormalizedPoint } from '../../types/equipment';

// In-memory storage for demo purposes (use database in production)
const equipmentStore = new Map<string, Equipment>();

export function storeProcessingResult(equipmentId: string, equipment: Equipment, points: NormalizedPoint[]) {
  // Store equipment with points included
  const equipmentWithPoints = { ...equipment, points };
  equipmentStore.set(equipmentId, equipmentWithPoints);
}

export function getEquipment(id: string): Equipment | undefined {
  return equipmentStore.get(id);
}

export function getEquipmentPoints(id: string): NormalizedPoint[] {
  const equipment = equipmentStore.get(id);
  return equipment?.points || [];
}

export function getAllEquipment(): Equipment[] {
  return Array.from(equipmentStore.values());
}

export function updateEquipment(id: string, equipment: Equipment): void {
  equipmentStore.set(id, equipment);
}

export function deleteEquipment(id: string): void {
  equipmentStore.delete(id);
}

export function equipmentExists(id: string): boolean {
  return equipmentStore.has(id);
} 