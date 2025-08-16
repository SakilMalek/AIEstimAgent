# Project Architecture Summary

## Overview

This is a full-stack construction takeoff application that allows users to upload building blueprints and automatically extract material quantities using AI. The app provides a web interface for managing construction projects, viewing drawings, and generating detailed takeoff reports for cost estimation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Built with React and TypeScript using Vite as the build tool
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **State Management**: TanStack Query for server state management
- **Routing**: wouter for client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming

### Backend Architecture
- **Node.js/Express**: RESTful API server with TypeScript
- **Development Server**: Vite middleware integration for development
- **File Upload**: Multer for handling PDF and image uploads (up to 50MB)
- **Storage**: PostgreSQL database with Drizzle ORM for persistent data storage

### Database Design
- **Database**: PostgreSQL with Neon Database serverless hosting
- **ORM**: Drizzle ORM configured for PostgreSQL with proper relations
- **Schema**: Well-defined tables for projects, drawings, takeoffs, and material costs
- **Relations**: Explicit foreign key relationships between tables
- **Migrations**: Managed through Drizzle Kit (`npm run db:push`)

## Key Components

### Core Entities
1. **Projects**: Construction projects with basic metadata
2. **Drawings**: Uploaded blueprint files (PDF, PNG, JPG) with processing status
3. **Takeoffs**: Extracted material quantities from drawings
4. **Material Costs**: Cost database for different construction materials

### Frontend Components
- **Dashboard**: Main application interface with project overview
- **Project Sidebar**: Project and drawing navigation
- **Drawing Viewer**: Interactive blueprint display with zoom/pan capabilities
- **Takeoff Panel**: Material quantity results and cost calculations
- **Upload Zone**: Drag-and-drop file upload with validation

### API Endpoints
- `/api/projects` - Project CRUD operations
- `/api/projects/:id/drawings` - Drawing management
- `/api/drawings/:id/takeoffs` - Takeoff data
- `/api/material-costs` - Cost database access

## Data Flow

1. **Project Creation**: Users create construction projects
2. **Drawing Upload**: Blueprint files uploaded and stored
3. **AI Processing**: (Placeholder) Drawings processed to extract elements
4. **Takeoff Generation**: Material quantities calculated and stored
5. **Cost Calculation**: Quantities multiplied by material costs for estimates

## External Dependencies

### Frontend Libraries
- React ecosystem (React, ReactDOM)
- TanStack Query for data fetching
- Radix UI for accessible components
- Tailwind CSS for styling
- date-fns for date manipulation

### Backend Libraries
- Express.js web framework
- Drizzle ORM and Drizzle Kit
- Multer for file uploads
- Neon Database serverless PostgreSQL driver

### Development Tools
- Vite for build tooling and development server
- TypeScript for type safety
- ESBuild for production builds

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Single artifact deployment with static file serving

### Environment Configuration
- PostgreSQL database via `DATABASE_URL` environment variable
- Neon Database for serverless PostgreSQL hosting
- File uploads stored in local `uploads` directory

### Production Considerations
- Express serves built React app in production
- Database migrations handled through Drizzle Kit
- File storage currently local (scalability consideration)

### Recent Changes (August 2025)
- **Database Integration**: Successfully migrated from in-memory storage to PostgreSQL with Drizzle ORM
- **Navigation System**: Implemented functional navigation between Dashboard, Projects, and Reports pages
- **Project Detail Pages**: Added individual project view/edit functionality with comprehensive project management
- **Persistent Storage**: All project data, drawings, takeoffs, and material costs now persist in the database
- **Settings Page**: Added comprehensive settings interface for user preferences, notifications, AI configuration, and security
- **Sample Data**: Automatic initialization of sample construction data on first run
- **Calculator Tool Removal**: Removed the calculator widget from the navigation header to improve UI spacing
- **Takeoff Type Selection**: Added comprehensive takeoff type selector allowing users to choose specific building elements (doors, windows, flooring, walls, electrical, plumbing, HVAC, structural) for AI analysis
- **Selective AI Analysis**: Implemented backend API for running takeoff analysis on specific element types rather than all elements at once
- **Centered Navigation**: Moved main navigation items (Dashboard - Projects - Reports) to center of header for better visual balance
- **Prominent AI Takeoff Button**: Added bright purple "Run AI Takeoff" button in dashboard toolbar for clear user workflow
- **Enhanced Project Management**: Added "Create Project" buttons to both dashboard and projects pages for easier project creation
- **Improved User Experience**: Clear visual hierarchy with separated project info section and drawing tools section in dashboard
- **Streamlined Interface**: Removed header notifications and user profile elements for cleaner design
- **Vertical Takeoff Selector**: Replaced left sidebar with vertical takeoff element selector and settings button
- **AI Chat Widget**: Added floating AI assistant widget in top-right corner for construction questions
- **Real-time Analysis Panel**: Replaced right panel with live progress tracking and detailed takeoff results
- **Automatic File Processing**: Files now automatically process and start AI analysis when dropped in the floor plan area
- **Default Element Selection**: System auto-selects common takeoff types (doors, windows, flooring, electrical) for immediate analysis
- **Project Navigation Fix**: Resolved project detail navigation by making entire project cards clickable with proper event handling
- **Comprehensive Project Detail Page**: Completed tabbed interface with Overview, Takeoffs, Drawings, and Saved Analyses sections
- **Data Manipulation Features**: Added inline takeoff editing, analysis saving/deleting, CSV export, and cost calculations
- **Database Schema Completion**: Successfully migrated all tables including savedAnalyses, takeoffs, and materialCosts with proper relations
- **Project Deletion Fix**: Resolved critical bug where DELETE API responses (204 No Content) caused JSON parsing errors in frontend; implemented proper empty response handling
- **Integrated Pricing Management**: Moved pricing and SKU management directly into project workflow rather than separate manager page
- **Project-Level Pricing & SKUs**: Added Pricing and SKUs tabs to project detail pages for contextual management
- **Comprehensive Catalog System**: Built complete trade classes, product SKUs, project pricing, and estimate templates database schema with full CRUD operations
- **Sample Catalog Data**: Auto-initialized 8 trade classes (General Construction, Electrical, Plumbing, HVAC, Flooring, Windows & Doors, Roofing, Insulation) and 16 product SKUs with realistic pricing
- **Workflow Integration**: Pricing and catalog management now accessible within project context instead of separate application
- **Granular Takeoff Editing**: Enhanced manual control for quantities, costs, measurements (area/length) with visual indicators for AI vs manual values
- **Batch Operations**: Added batch selection and editing capabilities for multiple takeoffs with efficient API endpoints
- **Manual Override Tracking**: System tracks original AI values vs manual edits, allowing users to reset to AI suggestions or see change history
- **Quick Quantity Adjustments**: Added +/- buttons for rapid quantity changes directly in takeoff list view
- **Enhanced Visual Feedback**: Color-coded fields and badges show modified values, verified status, and AI detection indicators
- **Professional PDF Reporting**: Complete PDF report generation system with company branding, executive summaries, detailed cost breakdowns, and comparison reports
- **Advanced CSV Export**: Enhanced CSV exports with material/labor cost separation, original vs modified values, and comprehensive project metrics
- **Visual Analytics Dashboard**: Interactive cost breakdown charts, progress tracking, and project quality metrics with Chart.js visualizations
- **Progress Photo Documentation**: Photo upload and annotation system for project progress tracking with tagging and location metadata
- **Multi-Format Report Generation**: Executive summaries for stakeholders, detailed cost reports for contractors, and comparison reports for change orders
- **AI-Powered Cost Intelligence Backend (August 16, 2025)**: Implemented intelligent cost analysis engine with project efficiency scoring, cost savings opportunity detection, and industry benchmark comparison. Backend provides actionable insights including efficiency ratings, cost category analysis, savings recommendations, and performance ranking against industry standards. System analyzes cost distribution, identifies optimization opportunities, and generates smart recommendations for bulk purchasing, material substitution, and value engineering.

### Current Limitations
- Local file storage (not suitable for distributed deployment)
- AI processing logic not implemented (placeholder functions)
- No authentication/authorization system

The architecture now provides persistent data storage with PostgreSQL while maintaining clear separation of concerns and preparation for production deployment (cloud storage, actual AI integration).