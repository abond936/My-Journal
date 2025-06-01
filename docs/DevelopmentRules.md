# Development Rules
Status: ✅ Operational
Last Updated: 2024-03-19
Priority: CRITICAL

## 1. Directory Structure Rules
CRITICAL: These rules MUST be followed for all new code.

### 1.1 Component Locations
IF creating a new component THEN:
- Place in `src/components/` for shared components
- Place in `src/app/[feature]/` for feature-specific components
- Place in `src/app/admin/` for admin components
- Place in `src/lib/hooks/` for shared hooks
- Place in `src/lib/services/` for services
- Place in `src/lib/types/` for TypeScript types

### 1.2 File Naming
IF creating a new file THEN:
- Use PascalCase for component files (e.g., `UserProfile.tsx`)
- Use camelCase for utility files (e.g., `userService.ts`)
- Use kebab-case for CSS modules (e.g., `user-profile.module.css`)
- Append `.test.ts` for test files
- Append `.types.ts` for type definition files

### 1.3 Import Structure
IF importing files THEN:
- Use absolute imports from `src/`
- Group imports in order: React, External, Internal, Types, Styles
- Use named imports for components
- Use default imports for utilities

## 2. Code Structure Rules
CRITICAL: These rules MUST be followed for all new code.

### 2.1 Component Structure
IF creating a new component THEN:
```typescript
// 1. Imports
import React from 'react';
import { ExternalComponent } from 'external-library';
import { InternalComponent } from '@/components';
import { ComponentType } from '@/lib/types';
import styles from './ComponentName.module.css';

// 2. Types
interface Props {
  // Props definition
}

// 3. Component
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};
```

### 2.2 Service Structure
IF creating a new service THEN:
```typescript
// 1. Imports
import { ServiceType } from '@/lib/types';
import { firebase } from '@/lib/firebase';

// 2. Service
export const serviceName = {
  // Service methods
};
```

## 3. Data Model Rules
CRITICAL: These rules MUST be followed for all new data models.

### 3.1 Type Definitions
IF creating new types THEN:
- Place in `src/lib/types/`
- Use TypeScript interfaces
- Include all required fields
- Document optional fields
- Include validation rules

### 3.2 Data Validation
IF handling data THEN:
- Validate all inputs
- Use TypeScript type guards
- Handle null/undefined cases
- Include error handling
- Log validation failures

## 4. Common Mistakes
CRITICAL: These patterns MUST be avoided.

### 4.1 Directory Structure
❌ DO NOT:
- Place components in wrong directories
- Use inconsistent file naming
- Mix different import styles
- Create circular dependencies

### 4.2 Code Structure
❌ DO NOT:
- Skip type definitions
- Use any type
- Mix different styling approaches
- Create deeply nested components

### 4.3 Data Handling
❌ DO NOT:
- Skip data validation
- Use untyped data
- Mix different data patterns
- Create inconsistent models

## 5. Validation Checklist
CRITICAL: Use this checklist for all new code.

### 5.1 Before Creating Code
- [ ] Correct directory structure
- [ ] Proper file naming
- [ ] Type definitions ready
- [ ] Data model defined

### 5.2 After Creating Code
- [ ] All types defined
- [ ] No any types used
- [ ] Proper error handling
- [ ] Consistent styling
- [ ] No circular dependencies
- [ ] Proper documentation

## 6. Current Focus
- Admin system implementation
- Question management system
- Data model consistency
- Type safety improvements

## 7. Recent Changes
- Added Question Management to Admin system
- Consolidated development rules
- Updated directory structure rules
- Enhanced type definitions 