# CxAlloy Equipment Mapping & Analytics Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A comprehensive Next.js application for intelligent mapping between BACnet equipment points and CxAlloy equipment, featuring template-based bulk operations, automated point classification, and powerful analytics.

## 🚀 Overview

This platform streamlines the complex process of mapping building automation system (BAS) points between BACnet controllers and CxAlloy equipment definitions. It processes raw `.trio` files from BACnet systems and enhanced `.csv` files with vendor metadata, automatically classifies equipment types, normalizes point naming conventions, and provides intelligent mapping suggestions.

The system's core innovation is its **Template-Based Mapping Engine** that learns from successful mappings to accelerate future work. Once you map equipment and points, the system creates reusable templates that can be applied to similar equipment with a single click through the **Bulk Mapping Wizard**.

A comprehensive **Analytics Dashboard** tracks template effectiveness, usage patterns, and provides optimization recommendations to continuously improve mapping accuracy and efficiency.

## ✨ Key Features

### Core Functionality
*   🗂️ **Multi-Format File Processing**: Processes BACnet `.trio` files and enhanced `.csv` files with vendor metadata
*   🔄 **Equipment Mapping Interface**: Intuitive dual-panel interface for mapping BACnet equipment to CxAlloy definitions
*   🎯 **Point Tracking System**: Select and track individual points for precise mapping control
*   📋 **Template Creation**: Convert successful mappings into reusable templates for similar equipment

### Advanced Features
*   🚀 **Bulk Mapping Wizard**: 3-step wizard for applying templates to multiple equipment pairs simultaneously
*   🤖 **Intelligent Auto-Mapping**: AI-powered suggestions based on equipment names, types, and point signatures
*   ✍️ **Point Normalization**: Converts cryptic BACnet names to human-readable formats with Haystack tagging
*   📊 **Analytics Dashboard**: Real-time insights into template performance, usage patterns, and optimization opportunities

### Technical Capabilities
*   💾 **MySQL Database**: Persistent storage for equipment, points, templates, and mapping history
*   🔌 **RESTful API**: Comprehensive endpoints for all operations
*   ⚡ **Real-time Processing**: Immediate feedback during file processing and mapping operations
*   🎨 **Modern UI/UX**: Built with shadcn/ui components and responsive design patterns

## 🛠️ Technology Stack

| Category | Technology |
| --- | --- |
| **Frontend** | [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/), [recharts](https://recharts.org/) |
| **Backend** | [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction), [TypeScript](https://www.typescriptlang.org/) |
| **Database** | [MySQL](https://www.mysql.com/) |
| **Testing** | [Jest](https://jestjs.io/) |

## 📁 Project Structure

```
cxalloy-equip-mapping/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auto-process/         # Main file processing endpoint
│   │   ├── analytics/            # Template analytics data
│   │   ├── templates/            # Template CRUD operations
│   │   └── equipment/            # Equipment data
│   └── (dashboard)/              # Main application UI pages
├── components/                   # React Components
│   ├── analytics/                # Analytics dashboard components
│   ├── templates/                # Template list and creation modals
│   ├── equipment/                # Equipment browser and details
│   └── points/                   # Point list and configuration
├── lib/                          # Core Business Logic
│   ├── analytics/                # Template analytics engine
│   ├── database/                 # MySQL database service
│   ├── services/                 # High-level service orchestration
│   ├── processors/               # File-specific processors (Trio, CSV)
│   ├── engines/                  # Point signature and template matching
│   └── classifiers/              # Equipment classification logic
├── store/                        # Zustand application state management
├── types/                        # TypeScript type definitions
└── DATABASE_SETUP.md             # Instructions for setting up the database
```

## 🧠 System Architecture & Processing Pipeline

The application follows a robust, multi-stage processing pipeline:

```
graph TD
    A[1. File Upload <br> .trio / .csv] --> B{2. File Scanner};
    B --> C[3. Trio Processor];
    B --> D[4. Enhanced CSV Processor];
    subgraph "Backend Processing"
        C --> E{5. Database Service};
        D --> E;
        E --> F[6. Equipment Classifier];
        F --> G[7. Point Normalizer & Tagger];
        G --> H[8. Template Matching Engine];
    end
    H --> I[9. Data Ready];
    I --> J[UI & Analytics Dashboard];

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style J fill:#ccf,stroke:#333,stroke-width:2px
```

1.  **File Upload**: User uploads `.trio` or `.csv` files via the UI.
2.  **File Scanner**: The `auto-process` API scans the file to determine its type.
3.  **File Processor**: The appropriate processor (`TrioProcessor` or `EnhancedCsvProcessor`) parses the file.
4.  **Database Service**: The parsed data is written to the MySQL database.
5.  **Equipment Classifier**: Equipment is assigned a type based on its name and contents.
6.  **Point Normalizer**: Point names are cleaned up and standardized.
7.  **Template Matching Engine**: The system searches for matching `EquipmentTemplates` based on the equipment type and point signatures. The best match is applied if it exceeds a confidence threshold.
8.  **Data Ready**: The fully processed data is now available in the UI and for the analytics engine.

## 🗃️ Database Schema

The core of the data model resides in four main tables:

*   `equipment`: Stores information about each piece of equipment processed.
*   `equipment_points`: Stores all points associated with each piece of equipment.
*   `equipment_templates`: Contains the user-defined templates for different equipment types.
*   `template_applications`: Logs every time a template is automatically applied to a piece of equipment, storing the confidence score.

For detailed schema information and setup instructions, see `DATABASE_SETUP.md`.

## 🔌 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/auto-process` | Scans available files for processing |
| `POST` | `/api/auto-process` | Processes TRIO and CSV files with enhancement |
| `POST` | `/api/auto-map` | Performs automatic equipment mapping |
| `GET` | `/api/equipment` | Fetches all processed equipment |
| `GET` | `/api/templates` | Retrieves saved mapping templates |
| `POST` | `/api/templates` | Creates new mapping template |
| `PUT` | `/api/templates/{id}` | Updates existing template |
| `DELETE` | `/api/templates/{id}` | Deletes a template |
| `GET` | `/api/analytics` | Fetches analytics data for dashboard |
| `GET` | `/api/analytics?type=effectiveness` | Template effectiveness metrics |
| `GET` | `/api/analytics?type=usage` | Template usage statistics |
| `GET` | `/api/analytics?type=optimization` | Optimization recommendations |

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   npm or yarn
*   A running MySQL server

### Installation & Setup

**Clone the repository:**

**Install dependencies:**

**Set up the database:**

*   Make sure your MySQL server is running.
*   Follow the instructions in `DATABASE_SETUP.md` to create the database and tables.
*   Create a `.env.local` file in the root of the project and add your database connection string:

**Run the development server:**

**Open in browser:**  
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage Guide

### Step 1: Process Equipment Files
1. Click **"Process All Files"** button in the dashboard
2. The system will automatically scan and process all `.trio` files from `/public/sample_data/`
3. Watch the progress as files are processed with CSV enhancement if available

### Step 2: Create Equipment Mappings
1. **Select BACnet Equipment** from the left panel (Data Sources)
2. **Select CxAlloy Equipment** from the right panel that corresponds to the BACnet equipment
3. **Track Points** you want to include in the mapping using the "Track" button
4. **Save Mapping** to establish the connection

### Step 3: Create Templates
1. After successfully mapping equipment with tracked points
2. Click **"Create Template"** to save the mapping pattern
3. Give your template a descriptive name and description
4. The template is now available for bulk operations

### Step 4: Bulk Mapping Operations
1. Click **"Bulk Mapping"** button at the top of the interface
2. **Select a Template** from your saved templates
3. **Review Suggested Pairings** - the system automatically suggests equipment matches
4. **Configure & Apply** to map multiple equipment pairs at once

### Step 5: Monitor & Optimize
1. Navigate to the **Analytics** tab
2. Review template effectiveness metrics
3. Identify high-performing templates and optimization opportunities
4. Iterate on templates based on analytics insights

## 🧪 Testing & Development

### Run Tests
```bash
npm test
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## 🔧 Troubleshooting

### Common Issues

**"No templates available" in Bulk Mapping**
- This is expected behavior when no templates have been created yet
- Solution: Create equipment mappings and save them as templates first

**Database Connection Error**
- Verify MySQL is running and accessible
- Check DATABASE_URL in `.env.local` file
- Ensure database and tables are created per `DATABASE_SETUP.md`

**Processing Files Not Working**
- Ensure `.trio` files are present in `/public/sample_data/`
- Check browser console for specific error messages
- Verify CSV enhancement files are properly formatted

## 📚 Additional Resources

- **CLAUDE.md** - AI assistant documentation for development
- **DATABASE_SETUP.md** - Detailed database setup instructions
- **CHANGES.md** - Changelog and version history

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.