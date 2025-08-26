# CxAlloy Equipment Mapping - AI Agent Development Standards

## Project Overview

### Technology Stack

*   **Framework**: Next.js 14 with TypeScript
*   **Database**: MySQL with custom EquipmentDatabaseService
*   **UI Library**: shadcn/ui components
*   **Processing**: BACnet TRIO file parsing and equipment classification
*   **AI Integration**: Memory bank system for context tracking

### Core Functionality

*   Upload and process BACnet TRIO files
*   Classify equipment types and normalize point data
*   Store processed data in MySQL database
*   Provide dashboard interface for equipment management
*   Generate semantic tags for Project Haystack integration

## Critical File Architecture

### Type Definitions (`types/`)

*   **MUST import all types consistently across modules**
*   **NEVER modify interfaces without updating all dependent files**
*   Key files: `equipment.ts`, `point.ts`, `normalized.ts`, `trio.ts`

### Database Layer (`lib/database/`)

*   **ALL database operations MUST use EquipmentDatabaseService**
*   **NEVER bypass transaction management**
*   Equipment types require conversion between string and enum values

### Processing Pipeline (`lib/parsers/`, `lib/processors/`)

*   **MUST maintain session tracking throughout all processing stages**
*   **NEVER modify parser output without updating dependent processors**
*   Critical files: `trio-parser.ts`, `file-processor.ts`, `processing-service.ts`

### API Routes (`app/api/`)

*   **MUST include comprehensive error handling and logging**
*   **NEVER skip rate limiting for bulk operations**
*   Auto-process route handles complete file processing pipeline

## TypeScript & Build System Rules

### Import/Export Verification

*   **ALWAYS verify function/class exists before importing**
*   **NEVER assume method names without checking source code**
*   **MUST use exact export names from source modules**

### Static Method Access

*   **MUST qualify static methods with class names**
*   **CORRECT**: `EquipmentClassifier.getEquipmentTypeFromName()`
*   **INCORRECT**: `getEquipmentTypeFromName()`

### Enum Usage

*   **MUST verify enum values exist before use**
*   **CORRECT**: `EquipmentStatus.OPERATIONAL`, `ConnectionState.OPEN`
*   **INCORRECT**: `EquipmentStatus.ACTIVE`, `ConnectionState.CONNECTED`

### Type Assertions

*   **REQUIRED when bridging classification results to database models**
*   **EXAMPLE**: `classification.equipmentType as EquipmentType`

### Build Verification

*   **MANDATORY after ALL TypeScript changes**
*   **COMMAND**: `npm run build`
*   **MUST achieve Exit Code 0**

## Database Integration Standards

### Transaction Management

*   **ALL database operations MUST use transactions**
*   **MUST include rollback on errors**
*   **MUST log operation details with timing**

### Logging Pattern

```typescript
[DATABASE OPERATION_NAME] Executing query {
  query: "SQL statement",
  params: [...],
  timestamp: "ISO timestamp"
}
```

### Error Handling

*   **MUST convert undefined values to null for MySQL compatibility**
*   **MUST handle connection failures gracefully**
*   **MUST maintain data integrity during failures**

### Equipment Type Mapping

*   **MUST convert between human-readable strings and database ENUMs**
*   **MUST use conversion functions for type safety**
*   **NEVER store invalid enum values**

## File Processing Pipeline Requirements

### TRIO File Parsing

*   **MUST use**: `parseTrioFile(fileName, fileContent)`
*   **NEVER use**: `parseTrioFileFromContent()` (does not exist)
*   **MUST handle sections and records structure**

### Point Normalization

*   **MUST use**: `PointNormalizer.normalizePointName()` (static method)
*   **MUST convert TRIO records to BACnet points first**
*   **MUST maintain confidence scoring**

### Equipment Classification

*   **RETURNS**: `ClassificationResult` object
*   **MUST convert to Equipment object for database storage**
*   **MUST use**: `EquipmentClassifier.getEquipmentTypeFromName()` (static)

### Session Tracking

*   **MUST maintain session IDs throughout pipeline**
*   **MUST log processing statistics**
*   **MUST track file counts and error rates**

## UI Component & shadcn/ui Standards

### Component Creation

*   **MUST follow shadcn/ui patterns for new components**
*   **MUST include proper TypeScript props interface**
*   **MUST use consistent styling with existing components**

### Missing Component Handling

*   **CREATE using standard shadcn/ui template**
*   **EXAMPLE**: Alert component with variants and proper styling
*   **MUST export from components/ui/index.ts if applicable**

### File Upload Components

*   **MUST integrate with rate limiting**
*   **MUST provide progress feedback**
*   **MUST handle error states gracefully**

## Memory Bank Integration Requirements

### Progress Tracking

*   **MUST track all significant changes using mcp\_memory-bank tools**
*   **MUST include technical details and impact assessment**
*   **MUST update active context with current tasks and issues**

### Decision Logging

*   **REQUIRED for ALL architectural changes**
*   **MUST include alternatives considered and consequences**
*   **MUST provide context for future AI agents**

### Context Updates

*   **MUST update active context after major changes**
*   **MUST maintain current session notes**
*   **MUST reflect known issues and next steps**

## Multi-File Coordination Rules

### Database Service Changes

1.  Update database service methods
2.  Update API routes that use the service
3.  Update TypeScript interfaces if schema changes
4.  Verify build compilation

### Parser Modifications

1.  Update parser implementation
2.  Update processing services that use parser
3.  Update API endpoints that trigger processing
4.  Test with sample files

### Type Definition Changes

1.  Update type interfaces
2.  Update ALL importing modules
3.  Verify enum value usage across codebase
4.  Rebuild and test

### UI Component Updates

1.  Create/modify component
2.  Update component exports
3.  Verify imports in using components
4.  Test UI functionality

## Error Handling & Logging Patterns

### API Route Error Handling

```typescript
try {
  // operation
} catch (error) {
  console.error(`[API ROUTE] Operation failed:`, error);
  return NextResponse.json({ error: 'Detailed message' }, { status: 500 });
}
```

### Database Error Handling

```typescript
try {
  await db.beginTransaction();
  // operations
  await db.commit();
} catch (error) {
  await db.rollback();
  throw new Error(`Database operation failed: ${error}`);
}
```

### Processing Error Handling

*   **MUST maintain session tracking during errors**
*   **MUST provide detailed error context**
*   **MUST log processing statistics even on failure**

## Prohibited Actions

### TypeScript Violations

*   **NEVER use non-existent enum values**
*   **NEVER access non-static methods as static**
*   **NEVER skip type assertions when required**
*   **NEVER ignore build compilation errors**

### Database Violations

*   **NEVER modify database without transaction management**
*   **NEVER store undefined values (use null instead)**
*   **NEVER skip error handling and rollback**
*   **NEVER bypass EquipmentDatabaseService**

### Processing Pipeline Violations

*   **NEVER modify pipeline without session tracking**
*   **NEVER skip confidence scoring**
*   **NEVER break TRIO file → BACnet point → Normalized point flow**
*   **NEVER ignore rate limiting for bulk operations**

### UI Component Violations

*   **NEVER create components without following shadcn/ui patterns**
*   **NEVER skip TypeScript prop interfaces**
*   **NEVER ignore error state handling**

## Quality Assurance Standards

### Build Verification

*   **EVERY change MUST result in successful build**
*   **Exit Code 0 is MANDATORY**
*   **TypeScript compilation errors are BLOCKING**

### Database Integrity

*   **ALL operations MUST include proper logging**
*   **Error messages MUST include sufficient context**
*   **Transaction management is NON-NEGOTIABLE**

### Processing Pipeline Integrity

*   **Session tracking is MANDATORY**
*   **Data traceability MUST be maintained**
*   **Error rates MUST be tracked and reported**

### Memory Bank Compliance

*   **Significant changes MUST be tracked**
*   **Architectural decisions MUST be logged**
*   **Context MUST be kept current**

## Decision Trees for Common Scenarios

### When Adding New Functionality

1.  Check if existing patterns can be extended
2.  Verify all required types are available
3.  Plan multi-file coordination requirements
4.  Implement with comprehensive error handling
5.  Update memory bank with progress
6.  Verify build compilation
7.  Test end-to-end functionality

### When Fixing Build Errors

1.  Identify root cause (imports, types, methods)
2.  Verify correct function/method names
3.  Check enum value existence
4.  Ensure static method qualification
5.  Add required type assertions
6.  Test build compilation
7.  Update memory bank if architectural

### When Modifying Database Operations

1.  Plan transaction boundaries
2.  Update database service methods
3.  Modify dependent API routes
4.  Test error handling and rollback
5.  Verify logging patterns
6.  Update type definitions if needed
7.  Document decision in memory bank

## Success Metrics for AI Agents

### Technical Success

*   ✅ Build compiles without errors (Exit Code 0)
*   ✅ All tests pass
*   ✅ Database operations complete successfully
*   ✅ Processing pipeline maintains data integrity

### Process Success

*   ✅ Memory bank updated with progress
*   ✅ Architectural decisions logged
*   ✅ Multi-file coordination completed
*   ✅ Error handling implemented comprehensively

### Quality Success

*   ✅ Code follows established patterns
*   ✅ TypeScript types are properly maintained
*   ✅ Session tracking is consistent
*   ✅ User experience is preserved or improved