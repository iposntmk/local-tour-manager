import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isSupabaseEnabled } from '@/lib/datastore/supabase-client';
import { TriangleAlert } from 'lucide-react';

export function SupabaseStatusBanner() {
  const enabled = isSupabaseEnabled();
  if (enabled) return null;

  return (
    <div className="mb-4">
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Supabase not configured</AlertTitle>
        <AlertDescription>
          No Supabase URL/key found at build time. The app can’t load tours.
          Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
          in your deployment (GitHub Actions secrets) and redeploy.
        </AlertDescription>
      </Alert>
    </div>
  );
}

