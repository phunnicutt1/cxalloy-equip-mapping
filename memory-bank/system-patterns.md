# System Patterns & Best Practices

## Database Integration Patterns

### Additive Database Strategy
```typescript
// Add supplementary tables without modifying existing schema
CREATE TABLE equipment_mapping (
  id VARCHAR(255) PRIMARY KEY,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(100) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  status ENUM('processing', 'active', 'inactive') DEFAULT 'active',
  connection_state ENUM('open', 'closed', 'connecting', 'error') DEFAULT 'closed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

// Use connection pooling for performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cxalloy',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});
```

### Database Service Pattern
```typescript
export class EquipmentDatabaseService {
  async storeEquipmentWithPoints(
    fileId: string,
    equipment: Equipment,
    points: NormalizedPoint[],
    sessionId?: string
  ): Promise<{ equipmentId: string; pointIds: string[] }> {
    // Use transactions for data consistency
    return executeTransaction(async (connection) => {
      // Store equipment first
      // Then store related points
      // Return IDs for reference
    });
  }
}
```

## Type Safety Patterns

### Interface Unification
```typescript
// Single source of truth for complex types
// types/normalized.ts
export interface NormalizedPoint {
  originalPointId: string;
  equipmentId: string;
  originalName: string;
  originalDescription: string;
  objectName: string;
  objectType: BACnetObjectType;
  // ... comprehensive field set
}

// Remove duplicates from other files
// Import consistently across codebase
import type { NormalizedPoint } from '../types/normalized';
```

### Database Record Mapping
```typescript
// Map database records to TypeScript interfaces
return pointRecords.map(record => {
  const haystackTags = Array.isArray(haystackTagsData) 
    ? haystackTagsData.map(tag => typeof tag === 'string' 
        ? { 
            name: tag, 
            value: undefined, 
            category: HaystackTagCategory.CUSTOM,
            isMarker: true,
            isValid: true,
            source: 'inferred' as const,
            confidence: 0.8,
            appliedAt: new Date()
          }
        : tag)
    : [];

  return {
    originalPointId: record.original_point_id,
    equipmentId: record.equipment_id,
    // Map all required fields with proper types
  };
});
```

## Error Handling Patterns

### Database Error Handling
```typescript
export async function executeQuery<T>(
  query: string, 
  params: any[] = [], 
  operation: string = 'QUERY'
): Promise<T[]> {
  try {
    console.log(`[DB] ${operation}:`, { query, params });
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error(`[DB] ${operation} Error:`, error);
    throw new Error(`Database ${operation.toLowerCase()} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Processing Service Error Handling
```typescript
async processFile(fileId: string, filename: string): Promise<ProcessingResult> {
  const debugInfo = { processingId: nanoid(), stages: {} };
  
  try {
    // Process with comprehensive error handling at each stage
    debugLog(processingId, 'STARTING', 'File processing started');
    
    // Stage 1: Parse with error capture
    // Stage 2: Classify with fallbacks
    // Stage 3: Normalize with validation
    // Stage 4: Tag with error recovery
    
    return { success: true, equipment, points, debug: debugInfo };
  } catch (error) {
    debugLog(processingId, 'ERROR', 'Processing failed', { error });
    return { success: false, error: error.message, debug: debugInfo };
  }
}
```

## Rate Limiting Patterns

### Server-Side Rate Limiting
```typescript
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}
```

### Client-Side Rate Management
```typescript
// Sequential processing with delays
for (let i = 0; i < files.length; i++) {
  await processFile(files[i]);
  if (i < files.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
  }
}

// Exponential backoff retry logic
async function uploadWithRetry(file: File, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFile(file);
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## Debugging Patterns

### Comprehensive Logging
```typescript
function debugLog(processingId: string, stage: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${processingId}] [${stage}] ${message}`, data || '');
}

// Usage throughout processing pipeline
debugLog(processingId, 'PARSING', 'Trio file parsed successfully', {
  recordCount: trioRecords.length,
  sectionCount: Object.keys(sections).length
});
```

### Debug API Endpoint
```typescript
// GET /api/debug - System status monitoring
export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    database: await getDatabaseStatus(),
    rateLimiting: getRateLimitStatus(),
    processing: getProcessingStatus()
  });
}
```

## Component Architecture Patterns

### Three-Panel Layout
```typescript
// Reusable layout component with responsive panels
export function ThreePanelLayout({
  header,
  leftPanel,
  middlePanel,
  rightPanel
}: ThreePanelLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      <header>{header}</header>
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          {leftPanel}
        </ResizablePanel>
        <ResizablePanel defaultSize={50}>
          {middlePanel}
        </ResizablePanel>
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          {rightPanel}
        </ResizablePanel>
      </div>
    </div>
  );
}
```

### State Management with Zustand
```typescript
export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      equipment: [],
      selectedEquipment: null,
      
      setEquipment: (equipment) => set({ equipment }),
      setSelectedEquipment: (equipment) => set({ selectedEquipment: equipment }),
      
      // Computed properties
      getSelectedEquipmentPoints: () => {
        const { selectedEquipment } = get();
        return selectedEquipment?.points || [];
      }
    }),
    { name: 'app-store' }
  )
);
```

## Testing Patterns

### Comprehensive Test Suites
```typescript
const testSuites = [
  {
    name: 'Upload & Processing Pipeline',
    tests: [
      { name: 'File Upload API', endpoint: '/api/upload' },
      { name: 'File Processing', endpoint: '/api/process' },
      { name: 'Rate Limiting', endpoint: '/api/upload' }
    ]
  },
  {
    name: 'Database Integration',
    tests: [
      { name: 'Database Connection', endpoint: '/api/database' },
      { name: 'Equipment Storage', endpoint: '/api/equipment' },
      { name: 'Point Retrieval', endpoint: '/api/equipment/test-id' }
    ]
  }
];
```

## Performance Patterns

### File Processing Optimization
```typescript
// Stream processing for large files
const stream = fs.createReadStream(filePath);
const lines = readline.createInterface({ input: stream });

for await (const line of lines) {
  // Process line by line to avoid memory issues
  processTrioLine(line);
}

// Batch database operations
const batchSize = 100;
for (let i = 0; i < points.length; i += batchSize) {
  const batch = points.slice(i, i + batchSize);
  await insertPointsBatch(batch);
}
```

### Connection Pooling
```typescript
// Reuse database connections
export const databaseConfig = {
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  idleTimeout: 300000
};
```

These patterns provide a robust foundation for building scalable, maintainable equipment mapping systems with proper error handling, type safety, and performance optimization.