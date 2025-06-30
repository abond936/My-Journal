# AI Assistant Project Briefing: My Journal

This project has progessed to the point that its basic skeleton is together, there are still some architectural elements that need to be sorted out and there is the functionality that needs to be built out. One of the challenges I have in working with ai assistants is getting them up to speed on the macro and micro picture sufficiently that they can help without hurting. I have a project document that I have been using as a context setter and plan tracker. I like the doc, but even it and a request to the ai to read the codebase has had mixed results. They each read it in varying degrees of depth, focus on one aspect over another for some unknown reason. And by the time I get them up to speed they start hallucinating and making mistakes. How do I efficiently and effectively get the ai assisstant up to speed on the macro and micro components of my project, which, while not rocket science, is not a simple recipe app, to the point they can contribute in a sophisticated way. Keep in mind the target is the ai, not me. I don;t need a marketing document. I need a document for the ai that gets it up to expert speed quickly.

Welcome, AI assistant. This document is your guide to understanding the "My Journal" project. Please review it carefully before starting any task. It contains essential information about the project's architecture, codebase structure, and development patterns.

## 1. High-Level Overview

**What is this project?**
"My Journal" is a personal journaling application that goes beyond simple text entries. It's designed to capture moments and stories by combining text and media into "cards." These cards can be standalone or nested to create rich, hierarchical narratives (e.g., a main "Vacation" card containing child cards for each day). The core experience is centered around flexible content discovery through dimensional tagging and curated collections.

**Who is the user?**
The primary user is the journal's author, who acts as both creator and consumer of the content. There is an admin view for content management and a user view for consumption.

## 2. Architectural Principles & Core Technologies

This project follows a strict client-server architecture with a clear separation of concerns. The frontend is a Next.js application, and the backend is powered by Firebase.

*   **Architecture**:
    *   **Next.js App Router**: Used for both server-side rendered (SSR) pages and client-side interactivity. Server Components are used for data fetching where possible.
    *   **Component-Based UI**: Built with React and TypeScript, with a clear distinction between `view` components (for consumption) and `admin` components (for management).
    *   **Service Layer**: All backend and data access logic is abstracted into a service layer found in `src/lib/services`. UI components should not directly interact with Firebase.
    *   **API Endpoints**: Server-side logic is exposed via Next.js API Route Handlers in `src/app/api`. These are the only parts of the app that should be directly stateful on the server.

*   **Core Technologies**:
    *   **Frontend**: Next.js 14, React 18, TypeScript, CSS Modules.
    *   **Editing**: TipTap for rich text editing.
    *   **State Management**: SWR is used for data fetching and caching on the client-side, managed via providers (`CardProvider`, `TagProvider`). React Context is used for global state.
    *   **Backend**: Firebase (Firestore for database, Auth for authentication, Storage for media).
    *   **Schema Validation**: Zod is used for rigorous data validation on both client and server. The Zod schemas in `src/lib/types` are the "source of truth" for data structures.

## 3. Codebase Tour: Directory & File Map

This map will help you navigate the project.

*   `src/app/`: The heart of the Next.js App Router.
    *   `api/`: Contains all backend API route handlers.
    *   `admin/`: Pages and layouts for the content management interface.
    *   `view/`: Pages and layouts for the primary content consumption experience.
    *   `layout.tsx`: The root layout, which includes global providers.

*   `src/components/`: Reusable React components.
    *   `common/`: Generic components used across the app (e.g., `Modal`, `Button`).
    *   `view/`: Components specific to the content viewing experience (e.g., `CardFeed`, `ContentCard`).
    *   `admin/`: Components for the admin interface (e.g., `CardForm`, `TagAdminList`).

*   `src/lib/`: Core application logic, types, and utilities.
    *   `services/`: The most critical folder for business logic. Contains all data access functions (e.g., `cardService.ts`, `tagService.ts`). **Look here first to understand data manipulation.**
    *   `types/`: Contains all Zod schemas and TypeScript type definitions. These files are well-commented and serve as the data model's primary documentation.
    *   `hooks/`: Reusable client-side React hooks.
    *   `utils/`: General utility functions (e.g., date formatting, tag manipulation).

*   `docs/`: Project documentation, including this file and feature-specific plans like `TagSystemPlan.md`.

## 4. Core Data Models

The data models are defined using Zod schemas in `src/lib/types/`. These files are the single source of truth. Instead of duplicating them here, you should **read them directly**. They contain comments explaining the purpose of each model and its fields.

*   **`Card` (`src/lib/types/card.ts`):** The central data entity in the application. Represents a single journal entry, which can be a story, a gallery, a quote, etc. It contains content, metadata, and references to tags and other cards.
*   **`Tag` (`src/lib/types/tag.ts`):** Defines the structure for hierarchical tags used for organizing and filtering cards.
*   **`Media` (`src/lib/types/photo.ts`):** Represents a media asset (image, video) stored in Firebase Storage, including metadata like dimensions and paths.

## 5. Common Workflows

Understanding these workflows will help you see how the pieces fit together.

**Workflow: Viewing a Single Card**
This workflow demonstrates the SSR data fetching pattern.
1.  **Navigation**: User navigates to `/view/[id]`, where `[id]` is the ID of a card.
2.  **Server-Side Data Fetching**: The Next.js page at `src/app/view/[id]/page.tsx` is executed on the server.
3.  **Service Layer Call**: Inside this page component, the `getCardData` function calls `getCardById(id)` from `src/lib/services/cardService.ts` to fetch the main card's data from Firestore. If the card has children (`childrenIds`), it then calls `getCardsByIds` to fetch them.
4.  **Props Passing**: The fetched `card` and `children` objects are passed as props to the client component `<CardDetailPage />`.
5.  **Client-Side Render**: The `CardDetailPage` component (`src/components/view/CardDetailPage.tsx`) receives the data and is responsible for rendering the final view in the browser. It does not need to fetch this data itself.

**Workflow: Adding a New Card**
1.  **Navigation**: User navigates to `/admin/card-admin/new`.
2.  **Form Render**: The `CardForm` component (`src/components/admin/card-admin/CardForm.tsx`) is rendered, wrapped in a `CardFormProvider` to manage form state.
3.  **User Input**: User fills out the form fields (title, content, tags, etc.).
4.  **API Call**: On submission, the form data is sent via a `POST` request to the API endpoint at `/api/cards`.
5.  **Backend Processing**: The route handler at `src/app/api/cards/route.ts` receives the request. It validates the incoming data against the `cardSchema` from Zod, then calls `createCard` from `src/lib/services/cardService.ts` to write the new document to Firestore.

## 6. Development Recipes

Follow these patterns when adding new features.

*   **How to Add a New Data Service Function:**
    1.  Open the relevant service file (e.g., `src/lib/services/cardService.ts`).
    2.  Add a new exported async function (e.g., `getPublishedCards()`).
    3.  Write the Firestore query or data manipulation logic inside this function.
    4.  Ensure all data returned from the service conforms to a Zod schema from `src/lib/types`.

*   **How to Add a New API Endpoint:**
    1.  Create a new `route.ts` file in the appropriate `src/app/api/` subdirectory.
    2.  Create an exported async function named after the HTTP method (e.g., `export async function GET(request: Request) { ... }`).
    3.  In the handler, call functions from your service layer to perform business logic. Do not put database queries directly in the route handler.
    4.  Validate any incoming data and ensure all outgoing data is properly formatted using `NextResponse.json()`. 