# CxAlloy Equipment Mapping & Analytics Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A comprehensive Next.js application for intelligent processing of BACnet files, equipment-point mapping, and template performance analytics, backed by a MySQL database.

![Application Screenshot](https://user-images.githubusercontent.com/12345/67890.png)  
_(Note: Replace with an actual screenshot of the application dashboard)_

## 🚀 Overview

This platform provides an end-to-end solution for building automation engineers to streamline the tedious process of mapping BACnet points. It ingests raw `.trio` and enhanced `.csv` files, intelligently classifies equipment, normalizes point data, and stores the structured information in a MySQL database.

The core of the system is a powerful **Equipment Template Engine** that allows users to create, manage, and automatically apply configuration templates to newly processed equipment. This dramatically reduces manual effort and ensures consistency across projects.

To close the loop, a comprehensive **Analytics Dashboard** provides deep insights into template performance, helping users optimize their configurations for maximum efficiency.

## ✨ Key Features

*   🗂️ **Enhanced File Processing**: Ingests both standard BACnet `.trio` files and flexible, header-based `.csv` files.
*   💾 **MySQL Database Integration**: All equipment, points, templates, and analytics data are stored persistently.
*   🤖 **Intelligent Equipment Classification**: Automatically identifies equipment types (AHUs, VAVs, etc.) from file names and data patterns.
*   ✍️ **Advanced Point Normalization**: Converts cryptic BACnet point names into human-readable descriptions and applies standardized Project Haystack tags.
*   📄 **Equipment Template System**: Create reusable point configuration templates, which are automatically matched and applied to new equipment with a confidence score.
*   📈 **Template Analytics Dashboard**: A rich visual dashboard built with `recharts` to track template application success rates, usage statistics, and optimization recommendations.
*   🔌 **Comprehensive REST API**: A full suite of API endpoints for file processing, data management, and analytics.
*   🖥️ **Modern & Responsive UI**: Built with `shadcn/ui` and a responsive three-panel layout for an intuitive user experience.

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
| `POST` | `/api/auto-process` | The primary endpoint for uploading and processing files. |
| `GET` | `/api/equipment` | Fetches all processed equipment from the database. |
| `GET` | `/api/templates` | Retrieves all saved equipment templates. |
| `POST` | `/api/templates` | Creates a new equipment template. |
| `PUT` | `/api/templates/{id}` | Updates an existing template. |
| `GET` | `/api/analytics?type=...` | Fetches various analytics datasets for the dashboard. |

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

1.  **Upload Files**: Navigate to the dashboard and use the "Auto-Process Files" dialog to upload your `.trio` or `.csv` files.
2.  **Browse Equipment**: Once processing is complete, the equipment will appear in the left-hand panel, grouped by type. Select a piece of equipment to view its points.
3.  **Manage Templates**:
    *   Switch to the "Templates" view using the wrench icon toggle in the equipment browser header.
    *   Create new templates from scratch or by selecting points from an existing piece of equipment and using the "Create Template" action.
4.  **Analyze Performance**: Click on the "Analytics" tab to view the Template Effectiveness Dashboard. Analyze which templates are performing well and identify opportunities for optimization.
5.  **Export Data**: Use the export options to download processed data in various formats.

## 🧪 Testing

To run the automated tests for the project:

```
npm test
```

```
npm run dev
```

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

```
npm install
```

```
git clone <repository-url>
cd cxalloy-equip-mapping
```