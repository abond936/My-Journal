# My Journal - Personal Digital Memoir

**Purpose**: A personal journaling application combining text and media into cards (stories, galleries, Q&As, quotes, callouts) with dimensional hierarchical tagging for immersive, flexible content consumption.

**Primary Users**: 
- Author (admin) creating content
- Family consuming content

**Current State**: Core functionality complete, sophisticated architecture in place, but tag system needs strategic resolution.

**Critical Context for AI Assistants**: This is a mature, complex application. Before suggesting changes, understand the existing patterns and architectural decisions. The codebase is the source of truth for implementation details.

## AI Assistant Quick Start
- [ ] Read data models in `src/lib/types/` - they're well-commented and define the system
- [ ] Understand service layer in `src/lib/services/` - all business logic is here
- [ ] Check existing patterns before suggesting new approaches
- [ ] Consider performance implications of suggestions
- [ ] The codebase is mature - prefer extending existing solutions over new implementations

## Core Architecture

**Client-Server Separation**: Strict separation with all business logic server-side
**Data Model**: Cards (primary content) → Tags (hierarchical organization) → Media (assets)
**Authentication**: Auth.js + Firebase with role-based access
**Storage**: Firebase (Firestore + Storage) with local drive integration

**Key Design Decisions**:
- Denormalized tag data for query performance
- Server-side filtering to avoid Firestore limitations  
- Media processing pipeline with Sharp
- Comprehensive backup strategy (codebase + database)

## For AI Assistants: Understanding This Codebase

**Before Making Recommendations**:
1. Read the data models in `src/lib/types/` - they're well-commented and define the system
2. Understand the service layer in `src/lib/services/` - all business logic is here
3. Check existing patterns before suggesting new approaches
4. The codebase is mature - prefer extending existing solutions over new implementations

**Architectural Patterns to Follow**:
- Server-side validation with Zod schemas
- Client-side state management with React providers
- Firebase Admin SDK for server operations
- CSS Modules for styling
- TypeScript throughout

**Common Pitfalls to Avoid**:
- Don't suggest client-side filtering (server-side is intentional)
- Don't bypass the service layer for direct Firestore access
- Don't ignore the existing tag inheritance system
- Don't suggest breaking changes to the data model without understanding denormalization

## Key Decisions
- **Why denormalized tags**: Firestore query performance
- **Why server-side filtering**: Avoid client limitations and ensure data consistency
- **Why Firebase**: Integrated ecosystem for auth, database, and storage
- **Why Next.js App Router**: Modern React patterns and server-side rendering
- **Why CSS Modules**: Scoped styling and maintainability

## What's Working

**Core Features**: ✅ Card CRUD, media management, basic filtering, authentication
**UI/UX**: ✅ Responsive design, rich text editing, gallery management
**Infrastructure**: ✅ Backup automation, testing framework, development tools

## Known Issues & Limitations

**Critical**:
- Tag system uses flat dimension model, needs multi-dimensional faceting
- Performance: `tagDataAccess.ts` fetches all tags on every calculation
- API error handling inconsistent across routes

**Important**:
- Schema inconsistencies (id field, missing size field)
- Gallery features incomplete
- Question management not implemented

**Minor**:
- Some UI polish needed
- Documentation gaps

## Roadmap

**Priority 1 (Critical)**:
- Resolve tag system strategy and implement multi-dimensional faceting
- Add server-side caching for tags
- Standardize API error handling

**Priority 2 (Important)**:
- Performance optimization for card hydration
- Complete gallery features
- Schema cleanup and consistency

**Priority 3 (Future)**:
- Question management system
- Advanced theme customization
- Enhanced image processing pipeline

## Technical Reference

**Tech Stack**: Next.js 15, React 19, TypeScript, Firebase, Auth.js, TipTap, Sharp
**Key Dependencies**: 
- `@tiptap/react` - Rich text editing
- `firebase-admin` - Server-side Firebase operations
- `sharp` - Image processing
- `zod` - Schema validation
- `@dnd-kit/core` - Drag and drop functionality

**File Structure**:
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (common, admin, view)
- `src/lib/` - Core business logic, types, services
- `src/lib/scripts/` - Development and maintenance tools

**Environment Variables**:
- `FIREBASE_SERVICE_ACCOUNT_*` - Firebase Admin SDK credentials
- `NEXTAUTH_SECRET` - Authentication secret
- `ONEDRIVE_PATH` - Local media source path

## Data Model Overview

**Card**: Primary content entity with title, content, type, status, tags, and media references
**Tag**: Hierarchical categorization with dimensions (who, what, when, where, reflection)
**Media**: Asset metadata with Firebase Storage integration and processing pipeline

**Key Relationships**:
- Cards have direct tags and inherited tags (denormalized for performance)
- Cards reference media through IDs (hydrated on demand)
- Tags have parent-child relationships with path arrays for efficient queries 