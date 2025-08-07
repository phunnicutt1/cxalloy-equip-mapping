# CxAlloy Equipment Mapping System - Product Context

## Project Overview

A Next.js-based web application for mapping BACnet building automation equipment and their points to CxAlloy project equipment. The system processes TRIO files, classifies equipment, normalizes point data, and generates semantic Haystack tags. This enables an integration with CxAlloy allowing live connection to a customers building automation platform.

## Current Status: ✅ PRODUCTION READY

*   **Build Status**: TypeScript compilation successful (exit code 0)
*   **Database Integration**: Complete MySQL integration with CxAlloy database
*   **Core Features**: All functional with comprehensive error handling
*   **Testing**: Full test suite implemented and operational
*   **Documentation**: Complete with setup guides and API references

## Architecture

### Technology Stack

*   **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui components
*   **Backend**: Next.js API routes with rate limiting and debugging capabilities
*   **Database**: MySQL with connection pooling (CxAlloy integration)
*   **State Management**: Zustand for client-side state
*   **File Processing**: Streaming TRIO parser with validation
*   **Testing**: Jest with comprehensive test suites

### Database Configuration (CxAlloy Integration)

```
Host: localhost:3306
User: root
Password: 567eight
Database: cxalloytq
Connection Pool: 10 connections with 60s timeout
```

### Core Components Architecture

#### File Processing Pipeline

```
TRIO Files → Parser → Classifier → Normalizer → Tagger → Database Storage
     ↓           ↓          ↓           ↓         ↓
  Validation   Equipment  Point      Haystack  MySQL
               Discovery  Normalization Tags    Persistence
```

#### Three-Panel UI Layout

```
┌─────────────────────────────────────────────────────────┐
│                    Header (Upload, Debug, Test)         │
├─────────────┬─────────────────────┬─────────────────────┤
│  Equipment  │    Point Details    │   CxAlloy Mapping   │
│   Browser   │   (Name, Metadata,  │   (Haystack Tags,   │
│             │    Description)     │    Compliance)      │
└─────────────┴─────────────────────┴─────────────────────┘
```

## Directory Structure

### Core Application (`/app`)

*   `**/api**`: REST API endpoints
    *   `/upload` - File upload with rate limiting
    *   `/process` - File processing pipeline
    *   `/equipment` - Equipment CRUD operations
    *   `/database` - Database management and testing
    *   `/debug` - System status and debugging
    *   `/export` - Data export functionality

### Business Logic (`/lib`)

*   `**/parsers**`: TRIO file parsing and validation
*   `**/classifiers**`: Equipment type classification
*   `**/normalizers**`: Point data normalization
*   `**/taggers**`: Haystack tag generation
*   `**/database**`: MySQL integration and data persistence
*   `**/services**`: Core business services

### UI Components (`/components`)

*   `**/equipment**`: Equipment browsing and management
*   `**/points**`: Point detail views and editing
*   `**/mapping**`: CxAlloy integration panels
*   `**/layout**`: Responsive layout components
*   `**/ui**`: Reusable UI primitives

### Type Definitions (`/types`)

*   **Unified Type System**: Single source of truth for data structures
*   **Database Models**: MySQL table schemas and relationships
*   **API Contracts**: Request/response type definitions

## Key Features

### 1\. File Processing System

*   **Multi-format Support**: TRIO files with extensible parser architecture
*   **Streaming Processing**: Memory-efficient handling of large files
*   **Error Recovery**: Comprehensive error handling and validation
*   **Rate Limiting**: 50 requests/minute with exponential backoff

### 2\. Equipment Classification

*   **Pattern Matching**: Regex-based equipment type detection
*   **Vendor-Specific Logic**: Specialized handling for different manufacturers
*   **Confidence Scoring**: Quality metrics for classification accuracy

### 3\. Point Normalization

*   **Data Standardization**: Consistent point metadata and naming
*   **Unit Conversion**: Automated unit detection and standardization
*   **Validation**: Schema validation with error reporting

### 4\. Haystack Tag Generation

*   **Semantic Tagging**: Context-aware tag generation
*   **Compliance Checking**: Validation against Haystack standards
*   **Custom Tags**: Support for vendor-specific and custom tags

### 5\. Database Integration

*   **CxAlloy Compatibility**: Direct integration with existing CxAlloy database
*   **Additive Design**: No modifications to existing database structure
*   **Transaction Support**: ACID compliance for data consistency
*   **Connection Pooling**: Optimized database performance

### 6\. Debugging & Monitoring

*   **Request Tracking**: Unique ID tracking for all operations
*   **Performance Metrics**: Processing time and resource monitoring
*   **Error Logging**: Comprehensive error capture and reporting
*   **System Status**: Real-time health monitoring via `/api/debug`

### 7\. Testing Framework

*   **Interactive Test Dashboard**: Web-based test execution and monitoring
*   **Comprehensive Coverage**: Upload, processing, classification, tagging, database tests
*   **Real-time Results**: Live progress tracking and result visualization

## API Endpoints

### Core Operations

*   `POST /api/upload` - Upload TRIO files with validation
*   `POST /api/process` - Process uploaded files through pipeline
*   `GET /api/equipment` - List all equipment with filtering
*   `GET /api/equipment/[id]` - Get specific equipment details
*   `POST /api/export` - Export processed data in various formats

### Database Management

*   `GET /api/database` - Database connection status and health
*   `POST /api/database` - Initialize database tables and indexes
*   `DELETE /api/database` - Clean up test data and reset state

### Development & Debugging

*   `GET /api/debug` - System status, performance metrics, logs
*   `GET /api/templates` - List available export templates
*   `GET /app/test` - Interactive test dashboard

## Data Flow

### 1\. File Upload & Validation

```typescript
User uploads TRIO file → Rate limiting check → File validation → Temporary storage
```

### 2\. Processing Pipeline

```typescript
File → TRIO Parser → Equipment Classifier → Point Normalizer → Haystack Tagger → Database Storage
```

### 3\. Database Storage

```typescript
Equipment + Points → Transaction → equipment_mapping + point_mapping tables → Response with IDs
```

### 4\. UI Integration

```typescript
Database → Equipment Browser → Point Details → CxAlloy Mapping Panel → Export Options
```

## Development Workflow

### Local Development Setup

1.  **Database**: Start MySQL server with CxAlloy database
2.  **Environment**: Configure `.env.local` with database credentials
3.  **Dependencies**: `npm install` for package installation
4.  **Development Server**: `npm run dev` for hot-reload development
5.  **Testing**: Access test dashboard at `/test` for validation

### Database Schema Management

*   **Additive Approach**: Only create new tables, never modify existing
*   **Migration Safe**: All changes backward compatible
*   **Index Optimization**: Proper indexing for performance
*   **Foreign Key Relationships**: Maintain referential integrity

### Code Quality Standards

*   **TypeScript**: Strict type checking with comprehensive interfaces
*   **ESLint**: Code quality and consistency enforcement
*   **Error Handling**: Comprehensive error capture and user feedback
*   **Testing**: Unit tests and integration test coverage

## Security & Performance

### Security Measures

*   **File Validation**: Strict file type and size limits
*   **Rate Limiting**: IP-based request throttling
*   **SQL Injection Prevention**: Parameterized queries and prepared statements
*   **Error Sanitization**: Safe error messages without sensitive data exposure

### Performance Optimizations

*   **Connection Pooling**: Efficient database connection management
*   **Streaming Processing**: Memory-efficient file handling
*   **Lazy Loading**: On-demand data loading in UI components
*   **Caching**: Strategic caching of frequently accessed data

## Deployment Considerations

### Production Requirements

*   **Database**: MySQL 8.0+ with proper configuration
*   **Node.js**: Version 18+ for optimal performance
*   **Memory**: Minimum 2GB RAM for file processing
*   **Storage**: Adequate space for file uploads and processing

### Configuration

*   **Environment Variables**: Database credentials, API keys, feature flags
*   **Resource Limits**: File size limits, processing timeouts, rate limits
*   **Monitoring**: Health check endpoints and error reporting
*   **Backup**: Database backup strategies and data recovery procedures

## Integration Points

### CxAlloy Platform Integration

*   **Database Sharing**: Direct access to CxAlloy database tables
*   **Data Format**: Compatible with CxAlloy's equipment and point models
*   **Haystack Compliance**: Standards-compliant tag generation
*   **Export Compatibility**: Multiple export formats for CxAlloy ingestion

### External System Integration

*   **BACnet Support**: Native BACnet object type handling
*   **Vendor Systems**: Extensible architecture for vendor-specific logic
*   **API Integration**: RESTful APIs for third-party system integration
*   **File Format Support**: Extensible parser architecture for new formats

This system provides a comprehensive solution for equipment mapping with robust error handling, performance optimization, and seamless CxAlloy integration while maintaining the flexibility to expand and adapt to new requirements.