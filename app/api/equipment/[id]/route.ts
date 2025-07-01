import { NextRequest, NextResponse } from 'next/server';
import type { Equipment } from '../../../../types/equipment';
import type { NormalizedPoint } from '../../../../types/normalized';
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

    const equipment = await getEquipment(id);
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const points = await getEquipmentPoints(id);

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

    const existingEquipment = await getEquipment(id);
    
    if (!existingEquipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Update equipment with provided fields (id cannot be changed)
    await updateEquipment(id, updates);

    // Get updated equipment and points
    const updatedEquipment = await getEquipment(id);
    const points = await getEquipmentPoints(id);

    if (!updatedEquipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found after update' },
        { status: 500 }
      );
    }

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

    if (!(await equipmentExists(id))) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Delete equipment and associated points
    await deleteEquipment(id);

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

 