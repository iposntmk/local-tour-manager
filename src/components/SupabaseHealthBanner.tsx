import type { PostgrestError } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/datastore/supabase-client';
import { TriangleAlert, RefreshCw } from 'lucide-react';

export function SupabaseHealthBanner() {
  const enabled = isSupabaseEnabled();

  const query = useQuery({
    queryKey: ['supabase-health'],
    enabled,
    retry: 0,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('tours')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      if (error) throw error;
      return { ok: true as const };
    },
  });

  if (!enabled || !query.isError) return null;

  const error = query.error as Error | PostgrestError | null;
  let message = 'Failed to reach Supabase.';
  let code: string | undefined;

  if (error) {
    if (typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }
      if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
        code = (error as { code: string }).code;
      }
    }
    if (error instanceof Error && error.message) {
      message = error.message;
    }
  }

  return (
    <div className="mb-4">
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Supabase connection error{code ? ` (${code})` : ''}</AlertTitle>
        <AlertDescription className="flex items-start gap-3 flex-wrap">
          <span>{message}</span>
          <span className="text-muted-foreground">
            Check: URL/key valid, CORS allows your domain, and RLS permits SELECT on tables.
          </span>
          <Button size="sm" variant="outline" onClick={() => query.refetch()} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

