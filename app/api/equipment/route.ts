import { NextRequest, NextResponse } from 'next/server';
import type { Equipment } from '../../../types/equipment';
import { getAllEquipment } from '../../../lib/stores/equipment-store';

interface EquipmentListResponse {
  success: boolean;
  equipment?: Equipment[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<EquipmentListResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build filters object
    const filters = {
      equipmentType: type,
      status,
      searchTerm: search
    };

    // Get equipment with filters - the store function returns { equipment, total }
    const result = await getAllEquipment(limit, offset, filters);

    return NextResponse.json({
      success: true,
      equipment: result.equipment,
      total: result.total,
      page,
      limit
    });

  } catch (error) {
    console.error('Equipment list GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 