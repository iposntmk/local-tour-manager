import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/datastore/supabase-client';
import { TriangleAlert, RefreshCw } from 'lucide-react';

export function SupabaseHealthBanner() {
  const enabled = isSupabaseEnabled();
  if (!enabled) return null; // Handled by SupabaseStatusBanner

  const supabase = getSupabaseClient();

  const query = useQuery({
    queryKey: ['supabase-health'],
    queryFn: async () => {
      const { error } = await supabase
        .from('tours')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      if (error) throw error;
      return { ok: true as const };
    },
    retry: 0,
  });

  if (!query.isError) return null;

  const err = query.error as { message?: string; code?: string } | Error;
  const message = (err as any)?.message || 'Failed to reach Supabase.';
  const code = (err as any)?.code as string | undefined;

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

