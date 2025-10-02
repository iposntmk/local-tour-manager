import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react';
import { testDatabaseConnection, type DatabaseHealthCheck } from '@/lib/database-test';
import { toast } from 'sonner';

interface DatabaseHealthCheckProps {
  onClose?: () => void;
}

export function DatabaseHealthCheck({ onClose }: DatabaseHealthCheckProps) {
  const [healthCheck, setHealthCheck] = useState<DatabaseHealthCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const result = await testDatabaseConnection();
      setHealthCheck(result);
      
      if (result.isHealthy) {
        toast.success('Database is healthy');
      } else {
        toast.error(`Database issues found: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Health check failed');
      console.error('Health check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health Check
          </CardTitle>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={runHealthCheck} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking...' : 'Run Health Check'}
          </Button>
          
          {healthCheck && (
            <Badge variant={healthCheck.isHealthy ? 'default' : 'destructive'}>
              {healthCheck.isHealthy ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Issues Found
                </>
              )}
            </Badge>
          )}
        </div>

        {healthCheck && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Connection Status</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={healthCheck.details.supabaseEnabled ? 'default' : 'destructive'}>
                      {healthCheck.details.supabaseEnabled ? '✓' : '✗'}
                    </Badge>
                    <span className="text-sm">Supabase Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={healthCheck.details.connectionTest ? 'default' : 'destructive'}>
                      {healthCheck.details.connectionTest ? '✓' : '✗'}
                    </Badge>
                    <span className="text-sm">Client Connection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={healthCheck.details.tableAccess ? 'default' : 'destructive'}>
                      {healthCheck.details.tableAccess ? '✓' : '✗'}
                    </Badge>
                    <span className="text-sm">Table Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={healthCheck.details.sampleQuery ? 'default' : 'destructive'}>
                      {healthCheck.details.sampleQuery ? '✓' : '✗'}
                    </Badge>
                    <span className="text-sm">Sample Query</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Issues Found</h4>
                {healthCheck.errors.length === 0 ? (
                  <p className="text-sm text-green-600">No issues detected</p>
                ) : (
                  <div className="space-y-1">
                    {healthCheck.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!healthCheck.isHealthy && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Verify Supabase credentials in .env file</li>
                  <li>• Check Supabase service status at status.supabase.com</li>
                  <li>• Ensure database migrations have been applied</li>
                  <li>• Check Row Level Security (RLS) policies</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}