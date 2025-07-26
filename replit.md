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

### Recent Changes (January 2025)
- **Database Integration**: Successfully migrated from in-memory storage to PostgreSQL with Drizzle ORM
- **Navigation System**: Implemented functional navigation between Dashboard, Projects, and Reports pages
- **Persistent Storage**: All project data, drawings, takeoffs, and material costs now persist in the database
- **Sample Data**: Automatic initialization of sample construction data on first run

### Current Limitations
- Local file storage (not suitable for distributed deployment)
- AI processing logic not implemented (placeholder functions)
- No authentication/authorization system

The architecture now provides persistent data storage with PostgreSQL while maintaining clear separation of concerns and preparation for production deployment (cloud storage, actual AI integration).