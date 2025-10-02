/**
 * Database connection and health check utilities
 */

import { getSupabaseClient, isSupabaseEnabled } from './datastore/supabase-client';
import { store } from './datastore';

export interface DatabaseHealthCheck {
  isHealthy: boolean;
  errors: string[];
  details: {
    supabaseEnabled: boolean;
    connectionTest: boolean;
    tableAccess: boolean;
    sampleQuery: boolean;
  };
}

export async function testDatabaseConnection(): Promise<DatabaseHealthCheck> {
  const errors: string[] = [];
  const details = {
    supabaseEnabled: false,
    connectionTest: false,
    tableAccess: false,
    sampleQuery: false,
  };

  try {
    // Test 1: Check if Supabase is enabled
    details.supabaseEnabled = isSupabaseEnabled();
    if (!details.supabaseEnabled) {
      errors.push('Supabase is not enabled - check environment variables');
      return { isHealthy: false, errors, details };
    }

    // Test 2: Test Supabase client creation
    try {
      const client = getSupabaseClient();
      details.connectionTest = true;
    } catch (error) {
      errors.push(`Supabase client creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isHealthy: false, errors, details };
    }

    // Test 3: Test table access
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('companies').select('count').limit(1);
      if (error) {
        errors.push(`Table access failed: ${error.message} (Code: ${error.code})`);
      } else {
        details.tableAccess = true;
      }
    } catch (error) {
      errors.push(`Table access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 4: Test sample query through store
    try {
      await store.listCompanies();
      details.sampleQuery = true;
    } catch (error) {
      errors.push(`Sample query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const isHealthy = errors.length === 0;
    return { isHealthy, errors, details };

  } catch (error) {
    errors.push(`Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isHealthy: false, errors, details };
  }
}

export async function diagnoseDatabaseError(error: any): Promise<string> {
  const healthCheck = await testDatabaseConnection();
  
  if (!healthCheck.isHealthy) {
    return `Database health check failed: ${healthCheck.errors.join(', ')}`;
  }

  // If database is healthy but we still got an error, provide specific guidance
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('permission denied')) {
      return 'Permission denied - check your Supabase RLS policies';
    }
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return 'Database table not found - check if migrations have been applied';
    }
    if (errorMessage.includes('connection')) {
      return 'Connection error - check your internet connection and Supabase status';
    }
    if (errorMessage.includes('timeout')) {
      return 'Request timeout - try again or check Supabase service status';
    }
    if (errorMessage.includes('rate limit')) {
      return 'Rate limit exceeded - please wait before trying again';
    }
  }

  return `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`;
}