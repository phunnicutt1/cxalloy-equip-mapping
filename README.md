# CxAlloy Equipment Mapping

A Next.js TypeScript application for intelligent mapping and classification of BACnet equipment and points from trio files, with automated equipment type detection and Project Haystack standardization.

## 🏗️ Overview

This application processes BACnet trio files to:

*   **Classify Equipment Types** from filename patterns (VAV controllers, AHUs, chillers, etc.)
*   **Normalize Point Names** from cryptic BACnet identifiers to human-readable descriptions
*   **Generate Haystack Tags** following Project Haystack 5.0 standards
*   **Map Equipment Points** with intelligent type inference and validation
*   **Export Standardized Data** in multiple formats (CSV, JSON, trio, Haystack)

## ✨ Key Features

### 🔍 **Intelligent Processing Pipeline**

*   **Trio File Parsing** - Parse and validate BACnet trio file formats
*   **Equipment Classification** - Auto-detect equipment types from filenames and patterns
*   **Point Normalization** - Transform cryptic BACnet point names using comprehensive dictionaries
*   **Haystack Tagging** - Generate standardized Project Haystack tags
*   **Semantic Inference** - Intelligent point classification using context and patterns

### 🖥️ **Modern User Interface**

*   **Three-Panel Layout** - Equipment browser, details view, and mapping panel
*   **Drag & Drop Upload** - Easy file upload with progress tracking
*   **Real-time Processing** - Live status updates during file processing
*   **Template Management** - Create and manage equipment point templates
*   **Responsive Design** - Works on desktop and mobile devices

### 🔌 **Comprehensive API**

*   **File Upload API** - Handle trio file uploads with validation
*   **Processing API** - Full pipeline processing with status tracking
*   **Equipment API** - CRUD operations on equipment data
*   **Export API** - Multiple export formats (CSV, JSON, trio, Haystack)
*   **Templates API** - Equipment template management

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   npm or yarn package manager

### Installation

**Clone the repository**

**Install dependencies**

**Start development server**

**Open in browser**  
Navigate to [http://localhost:3000](http://localhost:3000)

### First Upload Test

1.  Go to the **Dashboard** (`/dashboard`)
2.  Click **"Upload Trio Files"** in the upper right
3.  Drag & drop sample files from `sample_data/current-working/sample_point_data/`
4.  Watch the processing pipeline in action!

## 📁 Project Structure

```
cxalloy-equip-mapping/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── upload/               # File upload endpoint
│   │   ├── process/              # Processing pipeline
│   │   ├── equipment/[id]/       # Equipment CRUD
│   │   ├── export/               # Data export
│   │   └── templates/            # Template management
│   ├── dashboard/                # Main dashboard page
│   └── layout.tsx               # Root layout
├── components/                   # React Components
│   ├── equipment/                # Equipment browser
│   ├── points/                   # Point details view
│   ├── mapping/                  # CxAlloy mapping panel
│   ├── layout/                   # Layout components
│   └── ui/                       # UI components & upload dialog
├── lib/                          # Core Logic
│   ├── classifiers/              # Equipment classification
│   ├── normalizers/              # Point name normalization
│   ├── parsers/                  # Trio file parsing
│   ├── services/                 # Processing orchestration
│   ├── stores/                   # Data management  
│   ├── dictionaries/             # BACnet & vendor mappings
│   └── utils/                    # Utilities & validation
├── types/                        # TypeScript definitions
├── sample_data/                  # Test data sets
│   ├── current-working/          # Primary test files
│   ├── WakeMedED/                # Hospital HVAC systems
│   ├── kingshighway/             # Office building
│   └── intuitivedurham/          # Healthcare facility
└── __tests__/                    # Test suites
```

## 🎯 Usage Guide

### 1\. **Upload Files**

*   Click "Upload Trio Files" in the dashboard header
*   Drag & drop `.trio`, `.csv`, or `.txt` files (max 10MB each)
*   Watch real-time progress: Upload → Processing → Complete
*   Files are validated and processed through the full pipeline

### 2\. **Browse Equipment**

*   **Left Panel**: Browse detected equipment by type
*   **Toggle Views**: Switch between Equipment and Template modes
*   **Equipment Types**: VAV Controllers, AHUs, Chillers, Pumps, etc.

### 3\. **View Point Details**

*   **Middle Panel**: Detailed point information
*   **Original Names**: Raw BACnet point identifiers
*   **Normalized Names**: Human-readable descriptions
*   **Haystack Tags**: Standardized Project Haystack tags
*   **Metadata**: Type, units, data types, and more

### 4\. **Export Data**

*   Multiple export formats available
*   **CSV**: Spreadsheet-compatible format
*   **JSON**: Structured data format
*   **Trio**: BACnet trio format
*   **Haystack**: Project Haystack standard format

## 🔧 API Endpoints

### **File Upload**

```
POST /api/upload
Content-Type: multipart/form-data

# Upload trio files with validation
```

### **Process Files**

```
POST /api/process
Content-Type: application/json

{
  "fileId": "uploaded-file-id",
  "filename": "AHU-1.trio",
  "options": {
    "enableNormalization": true,
    "enableTagging": true,
    "includeVendorTags": true
  }
}
```

### **Equipment Management**

```
GET    /api/equipment/{id}     # Get equipment details
PUT    /api/equipment/{id}     # Update equipment
DELETE /api/equipment/{id}     # Delete equipment
```

### **Data Export**

```
GET /api/export?format=csv&equipmentId={id}
GET /api/export?format=json&includePoints=true
GET /api/export?format=haystack&includeMetadata=true
```

## 🧠 Processing Pipeline

### 1\. **Trio Parsing**

*   Validates trio file format and structure
*   Extracts equipment metadata and point definitions
*   Handles multiple trio sections and record types

### 2\. **Equipment Classification**

*   Analyzes filename patterns (`AHU-1`, `VAV_201`, `CHW-System`)
*   Maps to equipment types (Air Handler, VAV Controller, Chiller System)
*   Applies confidence scoring and fallback logic

### 3\. **Point Normalization**

*   Uses comprehensive BACnet acronym dictionaries
*   Applies equipment-specific and vendor-specific mappings
*   Transforms cryptic names (`ZN-T`, `SA-CFM`) to readable descriptions

### 4\. **Haystack Tagging**

*   Generates Project Haystack 5.0 compliant tags
*   Applies semantic inference for point classification
*   Includes equipment-specific tag patterns

## 📊 Sample Data

The application includes extensive test data:

### **Current Working Set** (`sample_data/current-working/`)

*   Primary development and testing files
*   Various equipment types: AHUs, VAVs, Chillers, Pumps, Boilers
*   Representative of typical BACnet installations

### **Real-World Data Sets**

*   **WakeMedED**: Hospital HVAC systems
*   **KingsHighway**: Office building automation
*   **Intuitive Durham**: Healthcare facility systems
*   **GBS Sonoma County**: Government building systems
*   **McKinstry HCPSU**: University healthcare systems

## 🧪 Testing

### **Run Tests**

```
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### **Test Categories**

*   **Unit Tests**: Core logic and utilities
*   **Parser Tests**: Trio file parsing validation
*   **Normalizer Tests**: Point name transformation
*   **Classifier Tests**: Equipment type detection
*   **API Tests**: Endpoint functionality

### **API Testing**

```
node test-api.js           # Test all API endpoints
```

## 🧪 Test Dashboard

The application includes a comprehensive test dashboard for validating functionality and debugging upload issues.

### **Accessing the Test Dashboard**

*   Click the **test tube icon** (🧪) in the main dashboard header
*   Navigate directly to `/test` route
*   Available in both development and production modes

### **Test Dashboard Features**

The test dashboard provides **5 comprehensive test suites** covering all critical functionality:

#### **1. Upload & Processing Pipeline**
*   **File Upload Validation** - Test file upload mechanics and validation
*   **Trio File Parsing** - Validate trio file format parsing and structure extraction
*   **Processing Workflow** - End-to-end processing pipeline validation
*   **Equipment Creation** - Verify equipment objects are created correctly

#### **2. Point Data Normalization**
*   **Point Name Normalization** - Transform cryptic BACnet identifiers to readable names
*   **Data Type Inference** - Validate automatic data type detection
*   **Unit Standardization** - Test unit mapping and standardization
*   **BACnet Mapping** - Verify BACnet acronym dictionary mappings

#### **3. Equipment Classification**
*   **Filename Classification** - Test equipment type detection from filenames
*   **Point Pattern Analysis** - Validate equipment classification from point patterns
*   **Vendor Detection** - Test vendor-specific equipment identification
*   **Confidence Scoring** - Verify classification confidence algorithms

#### **4. Haystack Tag Generation**
*   **Semantic Inference** - Test intelligent point classification
*   **Equipment Tags** - Validate equipment-level Haystack tag generation
*   **Point Tags** - Test point-level Haystack tag assignment
*   **Tag Validation** - Verify Project Haystack 5.0 compliance

#### **5. Data Integration**
*   **Equipment Store Integration** - Test data persistence and retrieval
*   **UI State Updates** - Validate real-time UI updates during processing
*   **Point Count Validation** - Verify accurate point counting and statistics
*   **Error Handling** - Test error recovery and user feedback

### **Interactive Testing Interface**

*   **Individual Test Execution** - Run specific test suites independently
*   **Run All Tests** - Execute complete test battery with single click
*   **Real-time Progress** - Visual progress indicators for each test phase
*   **Expandable Results** - Detailed test results with pass/fail/warning status
*   **Statistics Dashboard** - Comprehensive test statistics and timing information

### **Test Results & Debugging**

*   **Detailed Logging** - Step-by-step execution logs for debugging
*   **Error Diagnostics** - Specific error messages and failure points
*   **Performance Metrics** - Execution timing for performance analysis
*   **Data Validation** - Verify data integrity throughout processing pipeline

### **Using the Test Dashboard**

1.  **Navigate** to the test dashboard via the 🧪 icon
2.  **Select Tests** - Choose individual suites or run all tests
3.  **Upload Test Files** - Use sample files from `uploads/` directory
4.  **Monitor Progress** - Watch real-time test execution
5.  **Review Results** - Expand sections for detailed information
6.  **Debug Issues** - Use detailed logs to identify problems

### **Troubleshooting with Tests**

The test dashboard is particularly useful for:

*   **Upload Failures** - Diagnose file upload and processing issues
*   **Rate Limiting** - Test rate limiting behavior and retry logic
*   **Processing Errors** - Identify specific pipeline failure points
*   **Data Quality** - Validate normalization and tagging accuracy
*   **Performance Issues** - Monitor processing times and bottlenecks

## 🛠️ Technology Stack

### **Frontend**

*   **Next.js 15** - React framework with App Router
*   **TypeScript** - Type-safe development
*   **Tailwind CSS** - Utility-first styling
*   **Radix UI** - Accessible component primitives
*   **Lucide React** - Icon library

### **Backend**

*   **Next.js API Routes** - Serverless API endpoints
*   **Node.js** - JavaScript runtime
*   **File System APIs** - File upload and processing
*   **TypeScript** - Type safety throughout

### **Processing**

*   **Custom Parsers** - Trio file format handling
*   **Dictionary Systems** - BACnet acronym mappings
*   **Classification Algorithms** - Equipment type detection
*   **Semantic Inference** - Intelligent point tagging

## 🏗️ Architecture

### **Three-Panel Layout**

*   **Left**: Equipment browser with filtering and templates
*   **Middle**: Point details with normalization results
*   **Right**: CxAlloy mapping and export tools

### **Processing Service Architecture**

```
Upload → Parse → Classify → Normalize → Tag → Store → Export
```

### **Data Flow**

1.  **File Upload** via drag & drop dialog
2.  **Validation** of file format and size
3.  **Processing Pipeline** with status tracking
4.  **Equipment Storage** in memory store
5.  **UI Updates** with real-time results

## 📈 Performance

### **File Processing**

*   Handles files up to 10MB
*   Processes multiple files sequentially
*   Real-time progress tracking
*   Error handling and recovery

### **Memory Management**

*   In-memory equipment store for development
*   Efficient trio parsing and processing
*   Optimized dictionary lookups

## 🔒 Security

### **File Upload Security**

*   File type validation (.trio, .csv, .txt only)
*   File size limits (10MB maximum)
*   Secure file storage with unique IDs
*   Input sanitization and validation

### **API Security**

*   Request validation and error handling
*   Rate limiting via middleware
*   Secure headers and CORS policies

## 🚀 Deployment

### **Build for Production**

```
npm run build              # Build optimized production version
npm start                  # Start production server
```

### **Environment Variables**

```
# Add any environment-specific configuration
NODE_ENV=production
PORT=3000
```

## 🤝 Contributing

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Make your changes and add tests
4.  Commit your changes (`git commit -m 'Add amazing feature'`)
5.  Push to the branch (`git push origin feature/amazing-feature`)
6.  Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, issues, or feature requests:

*   Open a GitHub issue
*   Check the documentation in `design.md` and `design-ext.md`
*   Review the BACnet processing guide: `BACnet Point Processing.pdf`

---

Built with ❤️ for the Building Automation Industry

```
npm run build && npm start
# or for development mode:
npm run dev
```

```
npm install
```

```
git clone <repository-url>
cd cxalloy-equip-mapping
```