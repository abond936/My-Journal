# My Journal - Project Rules and Standards

This document organizes all project rules and standards into practical categories for implementation.

## Table of Contents
1. Core Interaction Rules
2. Architecture and Development Rules
3. Project Structure Rules
4. Documentation and Configuration Rules

# 1. Core Interaction Rules

## 1.1 Understanding and Agreement
- ALWAYS start by summarizing the current task and its context
- ALWAYS ask for clarification if any aspect is unclear or incomplete
- ALWAYS confirm mutual understanding before proceeding
- ALWAYS treat existing content as intentional unless explicitly directed otherwise

## 1.2 Planning and Execution
- ALWAYS present a step-by-step plan for any proposed changes
- ALWAYS break down complex tasks into discrete, reviewable steps
- ALWAYS get explicit approval before implementing each step
- ALWAYS verify each step against requirements before proceeding
- ALWAYS test changes before moving to the next step

## 1.3 Communication and Documentation
- ALWAYS state the specific action and its expected outcome
- ALWAYS explain the reasoning behind proposed changes
- ALWAYS summarize changes made and next steps after each action
- ALWAYS document in our conversation:
  * Significant decisions and their rationale
  * Issues encountered and their resolutions
  * Changes that affect architecture or core functionality
- ALWAYS update the UnifiedDocument when we make decisions about:
  * Vision: Changes to project goals, scope, or direction
  * Architecture: Modifications to system design or structure
  * Data Models: Updates to data structures or relationships
  * Code Components: New components or significant changes to existing ones
  * Rules: Changes to development or interaction rules
  * Features: New features or significant modifications to existing ones
- ALWAYS maintain a clear record of the current task and its status in our conversation

## 1.4 Emergency Protocol
- ALWAYS document the specific issue, including:
  * What was attempted
  * What went wrong
  * Current state
  * Proposed solution
- ALWAYS get approval before implementing any fix
- ALWAYS verify the fix resolves the original issue
- ALWAYS document the solution and its implementation
- ALWAYS update relevant documentation with the fix

## 1.5 Preservation Rules
- NEVER remove or modify existing content without explicit request
- ALWAYS explain why a change is being proposed
- ALWAYS make one change at a time and get approval
- ALWAYS preserve existing functionality unless specifically directed to change it
- ALWAYS verify changes don't impact other parts of the system

# 2. Architecture and Development Rules

## 2.1 Architecture-Driven Development
- ALWAYS check UnifiedDocument.mdc before making any changes
- ALWAYS define new components, types, or services in UnifiedDocument.mdc first
- ALWAYS update UnifiedDocument.mdc when making significant changes
- ALWAYS ensure changes align with the defined architecture
- ALWAYS document architectural decisions and their rationale

## 2.2 Code Organization and Structure
- ALWAYS organize code by feature and responsibility
- ALWAYS keep components focused and modular
- ALWAYS maintain clear separation of concerns
- ALWAYS follow established patterns in the codebase
- ALWAYS use consistent naming conventions:
  * PascalCase for components
  * camelCase for utilities
  * kebab-case for directories
  * BEM for CSS classes

## 2.3 Import and Dependency Management
- ALWAYS use `@/` alias for imports from `src/`
- ALWAYS follow import order:
  1. External dependencies
  2. Internal absolute imports (`@/`)
  3. Relative imports (if necessary)
- ALWAYS import from appropriate directories:
  * Services: `@/lib/services/`
  * Config: `@/lib/config/`
  * Data: `@/lib/data/`
- NEVER import directly from external services in components

## 2.4 Hook Management
- ALWAYS place hooks in `src/lib/hooks/`
- ALWAYS prefix hooks with `use`
- ALWAYS match hook filename to hook name
- ALWAYS import from services, not external sources
- ALWAYS keep hooks focused on single responsibilities

## 2.5 Resource Management
- ALWAYS check for existing implementations before creating new ones
- ALWAYS verify file/directory existence before creating new ones
- ALWAYS search for similar patterns in the codebase
- ALWAYS check UnifiedDocument.mdc for existing definitions
- NEVER create duplicate implementations

# 3. Project Structure Rules

## 3.1 Next.js App Structure
- ALWAYS create routes within the `app/` directory
- ALWAYS use `(group)` syntax for route organization
- ALWAYS use `[param]` syntax for dynamic routes
- ALWAYS name files according to Next.js conventions:
  * `layout.tsx` for layouts
  * `page.tsx` for pages
  * `loading.tsx` for loading states
  * `error.tsx` for error boundaries
  * `not-found.tsx` for 404 pages
- ALWAYS place protected routes in `app/(auth)/`

## 3.2 Source Code Organization
- ALWAYS organize code by feature and responsibility
- ALWAYS place components in `src/components/`:
  * Feature components in `features/`
  * Shared components in `common/`
  * Layout components in `layouts/`
  * UI components in `ui/`
- ALWAYS place hooks in `src/lib/hooks/`
- ALWAYS place services in `src/lib/services/`
- ALWAYS place utilities in `src/lib/utils/`
- ALWAYS place types in `src/types/`
- ALWAYS place constants in `src/lib/constants/`

## 3.3 Testing Structure
- ALWAYS place unit tests in `src/__tests__/` organized by feature
- ALWAYS place test utilities in `src/utils/testing/`
- ALWAYS place test fixtures in `src/utils/testing/fixtures/`
- ALWAYS place integration tests in `tests/integration/`:
  * API tests in `api/`
  * Component tests in `components/`
- ALWAYS place E2E tests in `tests/e2e/`:
  * Scenarios in `scenarios/`
  * Test data in `data/`

## 3.4 Style Organization
- ALWAYS place all styles in `src/styles/`:
  * Component styles in `components/`
  * Global styles in `globals.css`
  * Theme styles in `themes/`
  * Utility styles in `utils/`
- ALWAYS use CSS Modules for component styles
- ALWAYS use BEM methodology for class names
- ALWAYS use semantic variable names in `:root`
- ALWAYS use modern CSS features with fallbacks
- ALWAYS implement fluid/gradient responsiveness:
  * Use `clamp()` for responsive values
  * Use `calc()` for fluid typography
  * Use viewport units (vw, vh) for fluid layouts
  * Avoid fixed breakpoints except for:
    - Mobile menu toggles
    - Layout shifts
    - Component stacking
  * Document any necessary breakpoints

## 3.5 Architectural Preferences
- ALWAYS use server components by default in Next.js:
  * Only use client components when necessary
  * Document reasons for client components
  * Keep client-side JavaScript minimal
- ALWAYS implement progressive enhancement:
  * Core functionality works without JavaScript
  * Enhance with JavaScript when available
  * Graceful degradation for older browsers
- ALWAYS follow mobile-first design:
  * Design for mobile first
  * Scale up for larger screens
  * Test on multiple devices
- ALWAYS implement proper error boundaries:
  * Catch and handle errors gracefully
  * Provide meaningful error messages
  * Maintain application stability
- ALWAYS use proper data fetching patterns:
  * Server-side data fetching by default
  * Client-side fetching only when necessary
  * Implement proper loading states
  * Handle errors appropriately
- ALWAYS implement proper caching strategies:
  * Use Next.js built-in caching
  * Implement stale-while-revalidate
  * Cache at appropriate levels
- ALWAYS maintain performance standards:
  * Sub-2 second initial page load
  * Optimize for Core Web Vitals
  * Implement proper code splitting
  * Use proper image optimization

## 3.6 File Naming and Operations
- ALWAYS use PascalCase for React components
- ALWAYS use camelCase for utilities and hooks
- ALWAYS use kebab-case for directories
- ALWAYS use descriptive file extensions:
  * `.test.ts` or `.test.tsx` for tests
  * `.module.css` for CSS modules
  * `.types.ts` for type definitions
  * `.theme.css` for theme files
  * `.utils.css` for utility styles
- ALWAYS get explicit permission before:
  * Creating new files
  * Modifying existing files
  * Moving files
  * Deleting files
- ALWAYS document the purpose of any file changes
- ALWAYS preserve file history when possible

## 3.7 Code Style Standards
- ALWAYS use 2 spaces for indentation
- ALWAYS keep lines under 120 characters
- ALWAYS use blank lines for logical separation
- ALWAYS follow ESLint configuration
- ALWAYS use JSDoc for documentation
- ALWAYS keep comments up-to-date
- ALWAYS document complex logic
- ALWAYS include usage examples for complex components

# 4. Documentation and Configuration Rules

## 4.1 Documentation Structure
- ALWAYS use UnifiedDocument.mdc in `/rules` as the single source of truth for:
  * Project overview and vision
  * Technical architecture
  * Development guidelines
  * Project rules and standards
  * Implementation decisions
  * Known limitations
  * Future considerations
- ALWAYS maintain a clear structure in UnifiedDocument.mdc:
  * Table of contents
  * Clear sections and subsections
  * Consistent markdown formatting
  * Related information grouped together
- ALWAYS be open to restructuring UnifiedDocument.mdc for better efficiency

## 4.2 Documentation Updates
- ALWAYS update UnifiedDocument.mdc when:
  * Making architectural decisions
  * Adding new features
  * Changing existing functionality
  * Modifying project rules
- ALWAYS document in UnifiedDocument.mdc:
  * Decision rationale
  * Implementation details
  * Known limitations
  * Future considerations
- ALWAYS keep documentation in sync with code
- ALWAYS commit documentation changes with clear messages

## 4.3 Configuration Management
- ALWAYS place configuration files in root directory:
  * Environment files (`.env`)
  * Build config
  * TypeScript config
  * ESLint config
  * Style config
- ALWAYS place service configs in `src/lib/config/`:
  * Firebase config
  * API configs
  * Service-specific settings
- ALWAYS follow security practices:
  * Never commit sensitive information
  * Use environment variables
  * Document required variables
  * Validate environment setup

## 4.4 Shell and Command Standards
- ALWAYS use PowerShell as primary shell for Windows
- ALWAYS use Command Prompt as fallback if needed
- ALWAYS follow path conventions:
  * Use backslashes (`\`) for paths
  * Use semicolons (`;`) to separate commands
  * Use proper quoting for paths with spaces
- ALWAYS include error handling:
  * Use `-ErrorAction SilentlyContinue` for operations that might fail
  * Use `-Force` for operations that might need to overwrite
  * Use `-Recurse` for directory operations
- ALWAYS use TypeScript config for scripts:
  * Use correct `tsconfig.scripts.json`
  * Ensure path aliases work
  * Maintain type checking 