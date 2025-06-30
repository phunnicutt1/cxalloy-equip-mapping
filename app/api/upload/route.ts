import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.trio', '.csv', '.txt'];

interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        fileId: '',
        fileName: '',
        fileSize: 0,
        uploadedAt: new Date().toISOString(),
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        fileId: '',
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 });
    }

    // Validate file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json({
        success: false,
        fileId: '',
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        error: `File type not allowed. Supported types: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 });
    }

    // Generate unique file ID and save file
    const fileId = uuidv4();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = join(UPLOAD_DIR, `${fileId}_${sanitizedFileName}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      message: 'File uploaded successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      fileId: '',
      fileName: '',
      fileSize: 0,
      uploadedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'File upload endpoint',
    maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    allowedExtensions: ALLOWED_EXTENSIONS,
    method: 'POST'
  });
} 