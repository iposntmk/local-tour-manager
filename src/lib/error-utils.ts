/**
 * Comprehensive error logging and handling utilities
 */

import { diagnoseDatabaseError } from './database-test';

export interface ErrorContext {
  operation: string;
  tourCode?: string;
  tourIndex?: number;
  data?: any;
  timestamp: string;
}

export class ImportError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError: any;

  constructor(message: string, originalError: any, context: ErrorContext) {
    super(message);
    this.name = 'ImportError';
    this.context = context;
    this.originalError = originalError;
  }
}

export function logError(error: any, context: ErrorContext): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : typeof error,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Import Error:', errorInfo);

  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
}

export function createImportError(message: string, originalError: any, context: ErrorContext): ImportError {
  logError(originalError, context);
  return new ImportError(message, originalError, context);
}

export function handleImportError(error: any, context: ErrorContext): string {
  logError(error, context);

  if (error instanceof ImportError) {
    return error.message;
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    // Database errors
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return 'Tour code already exists';
    }
    if (errorMessage.includes('foreign key constraint')) {
      return 'Invalid reference to company, guide, or nationality';
    }
    if (errorMessage.includes('not null constraint')) {
      return 'Required field is missing';
    }
    if (errorMessage.includes('check constraint')) {
      return 'Data validation failed';
    }
    if (errorMessage.includes('value too long')) {
      return 'Data value exceeds maximum length';
    }
    if (errorMessage.includes('numeric value out of range')) {
      return 'Numeric value out of allowed range';
    }
    if (errorMessage.includes('invalid input syntax')) {
      return 'Invalid data format';
    }
    if (errorMessage.includes('permission denied')) {
      return 'Permission denied - check your access rights';
    }
    if (errorMessage.includes('connection')) {
      return 'Network connection error';
    }
    if (errorMessage.includes('timeout')) {
      return 'Request timeout - please try again';
    }
    if (errorMessage.includes('network')) {
      return 'Network error - please check your connection';
    }
    if (errorMessage.includes('fetch')) {
      return 'Failed to fetch data from server';
    }
    if (errorMessage.includes('unauthorized')) {
      return 'Authentication required';
    }
    if (errorMessage.includes('forbidden')) {
      return 'Access forbidden';
    }
    if (errorMessage.includes('not found')) {
      return 'Referenced data not found';
    }
    if (errorMessage.includes('invalid')) {
      return 'Invalid data format';
    }
    if (errorMessage.includes('required')) {
      return 'Required field is missing';
    }
    if (errorMessage.includes('missing')) {
      return 'Required data is missing';
    }
    if (errorMessage.includes('type')) {
      return 'Invalid data type';
    }
    if (errorMessage.includes('format')) {
      return 'Invalid data format';
    }
    if (errorMessage.includes('length')) {
      return 'Data length exceeds limits';
    }
    if (errorMessage.includes('size')) {
      return 'Data size exceeds limits';
    }
    if (errorMessage.includes('range')) {
      return 'Data value out of allowed range';
    }
    if (errorMessage.includes('bound')) {
      return 'Data value out of bounds';
    }
    if (errorMessage.includes('constraint')) {
      return 'Data constraint violation';
    }
    if (errorMessage.includes('validation')) {
      return 'Data validation failed';
    }
    if (errorMessage.includes('database')) {
      // Log the full error for debugging
      console.error('Database error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context
      });
      
      // Use diagnostic function for better error messages
      diagnoseDatabaseError(error).then(diagnosis => {
        console.log('Database diagnosis:', diagnosis);
      }).catch(diagError => {
        console.error('Diagnosis failed:', diagError);
      });
      
      return `Database error: ${error.message}`;
    }
    if (errorMessage.includes('sql')) {
      return 'Database query error';
    }
    if (errorMessage.includes('null') || errorMessage.includes('undefined')) {
      return 'Missing required data';
    }

    // Return the original error message if no specific pattern matches
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // For unknown error types
  return 'Unexpected error occurred';
}

export function validateTourData(tour: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tour.tourCode) {
    errors.push('Tour code is required');
  }
  if (!tour.clientName) {
    errors.push('Client name is required');
  }
  if (!tour.startDate) {
    errors.push('Start date is required');
  }
  if (!tour.endDate) {
    errors.push('End date is required');
  }
  if (!tour.companyRef?.id) {
    errors.push('Company is required');
  }
  if (!tour.guideRef?.id) {
    errors.push('Guide is required');
  }
  if (!tour.clientNationalityRef?.id) {
    errors.push('Nationality is required');
  }

  // Validate dates
  if (tour.startDate && tour.endDate) {
    const startDate = new Date(tour.startDate);
    const endDate = new Date(tour.endDate);
    
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    }
    if (startDate > endDate) {
      errors.push('Start date cannot be after end date');
    }
  }

  // Validate numeric fields
  if (tour.adults !== undefined && (isNaN(tour.adults) || tour.adults < 0)) {
    errors.push('Adults count must be a non-negative number');
  }
  if (tour.children !== undefined && (isNaN(tour.children) || tour.children < 0)) {
    errors.push('Children count must be a non-negative number');
  }

  return { valid: errors.length === 0, errors };
}