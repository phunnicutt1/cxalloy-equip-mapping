import { NextRequest, NextResponse } from 'next/server';
import type { EquipmentTemplate } from '@/types/equipment';

// Mock template storage (in a real application, this would be a database)
const templates: EquipmentTemplate[] = [
  {
    id: 'vav-no-reheat',
    name: 'VAV No Reheat',
    equipmentType: 'VAV Controller',
    description: 'Standard VAV controller without reheat coil',
    pointPatterns: [],
    requiredPoints: [],
    optionalPoints: [],
    pointMappings: [
      {
        pointName: 'ROOM TEMP',
        normalizedName: 'Room Temperature Sensor',
        objectType: 'AI',
        unit: '°F',
        required: true,
        haystackTags: ['sensor', 'temp', 'room', 'zone']
      },
      {
        pointName: 'DAMPER POS',
        normalizedName: 'Supply Air Damper Position',
        objectType: 'AO',
        unit: '%',
        required: true,
        haystackTags: ['cmd', 'damper', 'position', 'supply', 'air']
      },
      {
        pointName: 'AIRFLOW',
        normalizedName: 'Supply Air Flow Rate',
        objectType: 'AI',
        unit: 'cfm',
        required: true,
        haystackTags: ['sensor', 'flow', 'air', 'supply']
      }
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isBuiltIn: true
  },
  {
    id: 'vav-with-reheat',
    name: 'VAV with Reheat',
    equipmentType: 'VAV Controller',
    description: 'VAV controller with hot water reheat coil',
    pointPatterns: [],
    requiredPoints: [],
    optionalPoints: [],
    pointMappings: [
      {
        pointName: 'ROOM TEMP',
        normalizedName: 'Room Temperature Sensor',
        objectType: 'AI',
        unit: '°F',
        required: true,
        haystackTags: ['sensor', 'temp', 'room', 'zone']
      },
      {
        pointName: 'DAMPER POS',
        normalizedName: 'Supply Air Damper Position',
        objectType: 'AO',
        unit: '%',
        required: true,
        haystackTags: ['cmd', 'damper', 'position', 'supply', 'air']
      },
      {
        pointName: 'REHEAT VALVE',
        normalizedName: 'Reheat Valve Position',
        objectType: 'AO',
        unit: '%',
        required: true,
        haystackTags: ['cmd', 'valve', 'position', 'reheat', 'hot', 'water']
      }
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isBuiltIn: true
  },
  {
    id: 'lab-air-valve',
    name: 'Lab Air Valve',
    equipmentType: 'Lab Air Valve',
    description: 'Laboratory exhaust air valve controller',
    pointPatterns: [],
    requiredPoints: [],
    optionalPoints: [],
    pointMappings: [
      {
        pointName: 'EX DIFF P',
        normalizedName: 'Extract Air Differential Pressure',
        objectType: 'AI',
        unit: 'inH₂O',
        required: true,
        haystackTags: ['sensor', 'pressure', 'diff', 'extract', 'air']
      },
      {
        pointName: 'VALVE POS',
        normalizedName: 'Extract Air Valve Position',
        objectType: 'AO',
        unit: '%',
        required: true,
        haystackTags: ['cmd', 'valve', 'position', 'extract', 'air']
      }
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isBuiltIn: true
  }
];

interface TemplateResponse {
  success: boolean;
  message: string;
  templates?: EquipmentTemplate[];
  template?: EquipmentTemplate;
  error?: string;
}

interface CreateTemplateRequest {
  name: string;
  equipmentType: string;
  description?: string;
  pointMappings: EquipmentTemplate['pointMappings'];
}

export async function GET(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const equipmentType = searchParams.get('equipmentType');
    const templateId = searchParams.get('id');

    if (templateId) {
      // Get specific template
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return NextResponse.json({
          success: false,
          message: 'Template not found',
          error: 'Template with specified ID not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Template retrieved successfully',
        template
      });
    }

    // Filter by equipment type if specified
    let filteredTemplates = templates;
    if (equipmentType) {
      filteredTemplates = templates.filter(t => 
        t.equipmentType?.toLowerCase() === equipmentType.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Templates retrieved successfully',
      templates: filteredTemplates
    });

  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const body: CreateTemplateRequest = await request.json();
    const { name, equipmentType, description, pointMappings } = body;

    if (!name || !equipmentType || !pointMappings || !Array.isArray(pointMappings) || pointMappings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, equipmentType, and pointMappings',
        error: 'Invalid request parameters'
      }, { status: 400 });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Check if template with this ID already exists
    if (templates.find(t => t.id === id)) {
      return NextResponse.json({
        success: false,
        message: 'Template with this name already exists',
        error: 'Duplicate template name'
      }, { status: 409 });
    }

    const newTemplate: EquipmentTemplate = {
      id,
      name,
      equipmentType,
      description: description || '',
      pointMappings,
      pointPatterns: [],
      requiredPoints: [],
      optionalPoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isBuiltIn: false
    };

    templates.push(newTemplate);

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    }, { status: 201 });

  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required',
        error: 'Missing template ID in query parameters'
      }, { status: 400 });
    }

    const updates: Partial<CreateTemplateRequest> = await request.json();
    const templateIndex = templates.findIndex(t => t.id === templateId);

    if (templateIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Template not found',
        error: 'Template with specified ID not found'
      }, { status: 404 });
    }

    const existingTemplate = templates[templateIndex];

    // Prevent updating built-in templates
    if (existingTemplate.isBuiltIn) {
      return NextResponse.json({
        success: false,
        message: 'Cannot update built-in templates',
        error: 'Built-in templates are read-only'
      }, { status: 403 });
    }

    // Update template
    const updatedTemplate: EquipmentTemplate = {
      ...existingTemplate,
      ...updates,
      id: templateId, // Prevent ID changes
      updatedAt: new Date()
    };

    templates[templateIndex] = updatedTemplate;

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Templates PUT error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; message: string; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required',
        error: 'Missing template ID in query parameters'
      }, { status: 400 });
    }

    const templateIndex = templates.findIndex(t => t.id === templateId);

    if (templateIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Template not found',
        error: 'Template with specified ID not found'
      }, { status: 404 });
    }

    const template = templates[templateIndex];

    // Prevent deleting built-in templates
    if (template.isBuiltIn) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete built-in templates',
        error: 'Built-in templates cannot be deleted'
      }, { status: 403 });
    }

    templates.splice(templateIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Templates DELETE error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 