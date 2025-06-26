import { CardUpdate } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

export interface ValidationRule<T = any> {
  validate: (value: T, allValues?: any) => boolean;
  message: string;
}

export interface FieldValidation {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

// Validation rules for common patterns
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message
  }),

  minLength: (length: number, message = `Must be at least ${length} characters`): ValidationRule => ({
    validate: (value: string) => value.length >= length,
    message
  }),

  maxLength: (length: number, message = `Must be no more than ${length} characters`): ValidationRule => ({
    validate: (value: string) => value.length <= length,
    message
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => regex.test(value),
    message
  }),

  enum: (allowedValues: any[], message = `Must be one of: ${allowedValues.join(', ')}`): ValidationRule => ({
    validate: (value: any) => allowedValues.includes(value),
    message
  }),

  custom: (validateFn: (value: any, allValues?: any) => boolean, message: string): ValidationRule => ({
    validate: validateFn,
    message
  })
};

// Card-specific validation rules
export const cardValidation: FieldValidation = {
  title: [
    rules.minLength(3, 'Title must be at least 3 characters when provided'),
    rules.maxLength(100, 'Title must be no more than 100 characters')
  ],
  content: [
    rules.minLength(10, 'Content must be at least 10 characters when provided')
  ],
  status: [
    rules.enum(['draft', 'published', 'archived'], 'Status must be either draft, published, or archived')
  ],
  tags: [
    rules.custom(
      (tags: Tag[]) => tags.length > 0,
      'At least one tag is required'
    )
  ]
};

// Validate a single field
export function validateField(
  field: keyof CardUpdate,
  value: any,
  allValues?: CardUpdate
): string {
  const fieldRules = cardValidation[field];
  if (!fieldRules) return '';

  for (const rule of fieldRules) {
    if (!rule.validate(value, allValues)) {
      return rule.message;
    }
  }

  return '';
}

// Validate entire form
export function validateForm(values: CardUpdate): ValidationErrors {
  const errors: ValidationErrors = {};

  Object.keys(cardValidation).forEach((field) => {
    const error = validateField(field as keyof CardUpdate, values[field as keyof CardUpdate], values);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

// Helper to check if form has any errors
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Helper to check if a specific field is valid
export function isFieldValid(field: string, errors: ValidationErrors): boolean {
  return !errors[field];
}

// Helper to get field error message
export function getFieldError(field: string, errors: ValidationErrors): string {
  return errors[field] || '';
} 