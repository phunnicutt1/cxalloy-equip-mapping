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

// Map database enum types to simplified Haystack types (uppercase)
function simplifyEquipmentType(dbType: string): string {
  const typeMap: { [key: string]: string } = {
    'AIR_HANDLER_UNIT': 'AHU',
    'RTU_CONTROLLER': 'RTU',
    'VAV_CONTROLLER': 'VAV',
    'FAN_COIL_UNIT': 'FCU',
    'LAB_AIR_VALVE': 'LAB-EXHAUST',
    'EXHAUST_FAN': 'EXHAUST-FAN',
    'SUPPLY_FAN': 'SUPPLY-FAN',
    'RETURN_FAN': 'RETURN-FAN',
    'FAN': 'FAN',
    'CHILLER': 'CHILLER',
    'BOILER': 'BOILER',
    'COOLING_TOWER': 'COOLING-TOWER',
    'HEAT_EXCHANGER': 'HEAT-PUMP',
    'PUMP': 'PUMP',
    'UNIT_HEATER': 'UNIT-HEATER',
    'CONTROLLER': 'CONTROLLER',
    'ZONE_CONTROLLER': 'CONTROLLER',
    'FUME_HOOD': 'FUME-HOOD',
    'SENSOR': 'SENSOR',
    'VALVE': 'VALVE',
    'DAMPER': 'DAMPER',
    'ACTUATOR': 'ACTUATOR',
    'UNKNOWN': 'UNKNOWN'
  };
  
  return typeMap[dbType] || dbType.replace(/_/g, '-');
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
    
    // Transform equipment types to simplified format
    const simplifiedEquipment = result.equipment.map(eq => ({
      ...eq,
      type: simplifyEquipmentType(eq.type)
    }));

    return NextResponse.json({
      success: true,
      equipment: simplifiedEquipment,
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