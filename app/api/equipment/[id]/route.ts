import { NextRequest, NextResponse } from 'next/server';
import type { Equipment, NormalizedPoint } from '../../../../types/equipment';
import { 
  getEquipment, 
  getEquipmentPoints, 
  updateEquipment, 
  deleteEquipment, 
  equipmentExists 
} from '../../../../lib/stores/equipment-store';

interface EquipmentResponse {
  success: boolean;
  equipment?: Equipment;
  points?: NormalizedPoint[];
  error?: string;
}

interface UpdateEquipmentRequest {
  name?: string;
  description?: string;
  vendor?: string;
  model?: string;
  type?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<EquipmentResponse>> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    const equipment = getEquipment(id);
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const points = getEquipmentPoints(id);

    return NextResponse.json({
      success: true,
      equipment,
      points
    });

  } catch (error) {
    console.error('Equipment GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<EquipmentResponse>> {
  try {
    const { id } = await params;
    const updates = await request.json() as UpdateEquipmentRequest;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    const existingEquipment = getEquipment(id);
    
    if (!existingEquipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Update equipment with provided fields
    const updatedEquipment: Equipment = {
      ...existingEquipment,
      ...updates,
      id // Ensure ID cannot be changed
    };

    updateEquipment(id, updatedEquipment);

    const points = getEquipmentPoints(id);

    return NextResponse.json({
      success: true,
      equipment: updatedEquipment,
      points
    });

  } catch (error) {
    console.error('Equipment PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    if (!equipmentExists(id)) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Delete equipment and associated points
    deleteEquipment(id);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Equipment DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

 