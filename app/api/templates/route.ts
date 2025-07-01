import { NextRequest, NextResponse } from 'next/server';

export interface Template {
  id: string;
  name: string;
  description: string;
  equipmentType: string;
  points: TemplatePoint[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePoint {
  id: string;
  name: string;
  description: string;
  objectType: string;
  unit?: string;
  dataType: string;
  required: boolean;
  haystackTags: string[];
}

interface TemplateResponse {
  success: boolean;
  templates?: Template[];
  template?: Template;
  error?: string;
}

interface CreateTemplateRequest {
  name: string;
  description: string;
  equipmentType: string;
  points: Omit<TemplatePoint, 'id'>[];
}

interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  equipmentType?: string;
  points?: Omit<TemplatePoint, 'id'>[];
}

// In-memory storage for templates (use database in production)
const templatesStore = new Map<string, Template>();

// Initialize with some default templates
const initializeDefaultTemplates = () => {
  if (templatesStore.size === 0) {
    const defaultTemplates: Template[] = [
      {
        id: 'vav-standard',
        name: 'VAV Standard',
        description: 'Standard Variable Air Volume box template',
        equipmentType: 'VAV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        points: [
          {
            id: 'room-temp',
            name: 'Room Temperature',
            description: 'Zone temperature sensor',
            objectType: 'AI',
            unit: '°F',
            dataType: 'Number',
            required: true,
            haystackTags: ['sensor', 'temp', 'zone', 'room']
          },
          {
            id: 'damper-pos',
            name: 'Damper Position',
            description: 'Supply air damper position command',
            objectType: 'AO',
            unit: '%',
            dataType: 'Number',
            required: true,
            haystackTags: ['cmd', 'damper', 'position', 'supply', 'air']
          },
          {
            id: 'airflow',
            name: 'Air Flow',
            description: 'Supply air flow measurement',
            objectType: 'AI',
            unit: 'cfm',
            dataType: 'Number',
            required: false,
            haystackTags: ['sensor', 'flow', 'air', 'supply']
          }
        ]
      },
      {
        id: 'vav-reheat',
        name: 'VAV with Reheat',
        description: 'Variable Air Volume box with reheat coil',
        equipmentType: 'VAV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        points: [
          {
            id: 'room-temp',
            name: 'Room Temperature',
            description: 'Zone temperature sensor',
            objectType: 'AI',
            unit: '°F',
            dataType: 'Number',
            required: true,
            haystackTags: ['sensor', 'temp', 'zone', 'room']
          },
          {
            id: 'damper-pos',
            name: 'Damper Position',
            description: 'Supply air damper position command',
            objectType: 'AO',
            unit: '%',
            dataType: 'Number',
            required: true,
            haystackTags: ['cmd', 'damper', 'position', 'supply', 'air']
          },
          {
            id: 'reheat-valve',
            name: 'Reheat Valve',
            description: 'Hot water reheat valve position',
            objectType: 'AO',
            unit: '%',
            dataType: 'Number',
            required: true,
            haystackTags: ['cmd', 'valve', 'position', 'hotWater', 'reheat']
          }
        ]
      },
      {
        id: 'ahu-basic',
        name: 'AHU Basic',
        description: 'Basic Air Handling Unit template',
        equipmentType: 'AHU',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        points: [
          {
            id: 'supply-temp',
            name: 'Supply Air Temperature',
            description: 'Discharge air temperature sensor',
            objectType: 'AI',
            unit: '°F',
            dataType: 'Number',
            required: true,
            haystackTags: ['sensor', 'temp', 'air', 'discharge', 'supply']
          },
          {
            id: 'return-temp',
            name: 'Return Air Temperature',
            description: 'Return air temperature sensor',
            objectType: 'AI',
            unit: '°F',
            dataType: 'Number',
            required: true,
            haystackTags: ['sensor', 'temp', 'air', 'return']
          },
          {
            id: 'supply-fan',
            name: 'Supply Fan',
            description: 'Supply fan start/stop command',
            objectType: 'BO',
            dataType: 'Boolean',
            required: true,
            haystackTags: ['cmd', 'fan', 'supply']
          }
        ]
      }
    ];

    defaultTemplates.forEach(template => {
      templatesStore.set(template.id, template);
    });
  }
};

export async function GET(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    initializeDefaultTemplates();

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const equipmentType = searchParams.get('type');

    if (templateId) {
      // Get specific template
      const template = templatesStore.get(templateId);
      
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        template
      });
    }

    // Get all templates or filter by equipment type
    let templates = Array.from(templatesStore.values());

    if (equipmentType) {
      templates = templates.filter(t => 
        t.equipmentType.toLowerCase() === equipmentType.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const body = await request.json() as CreateTemplateRequest;
    const { name, description, equipmentType, points } = body;

    if (!name || !description || !equipmentType || !points) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if template already exists
    if (templatesStore.has(id)) {
      return NextResponse.json(
        { success: false, error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    // Create template points with IDs
    const templatePoints: TemplatePoint[] = points.map((point, index) => ({
      ...point,
      id: `${id}-point-${index}`
    }));

    const template: Template = {
      id,
      name,
      description,
      equipmentType,
      points: templatePoints,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    templatesStore.set(id, template);

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const existingTemplate = templatesStore.get(templateId);
    
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const updates = await request.json() as UpdateTemplateRequest;

    // Update template points with IDs if provided
    let updatedPoints = existingTemplate.points;
    if (updates.points) {
      updatedPoints = updates.points.map((point, index) => ({
        ...point,
        id: `${templateId}-point-${index}`
      }));
    }

    const updatedTemplate: Template = {
      ...existingTemplate,
      ...updates,
      points: updatedPoints,
      id: templateId, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    };

    templatesStore.set(templateId, updatedTemplate);

    return NextResponse.json({
      success: true,
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Templates PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = templatesStore.get(templateId);
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    templatesStore.delete(templateId);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Templates DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 