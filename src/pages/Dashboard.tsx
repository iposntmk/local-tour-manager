import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock, Users, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SettlementStatusBadge } from '@/components/tours/SettlementStatusBadge';
import { store } from '@/lib/datastore';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateRangeDisplay, todayYMD } from '@/lib/date-utils';
import { SETTLEMENT_STATUS_LABELS } from '@/lib/settlement-utils';
import { t } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import type { SettlementStatus, Tour } from '@/types/tour';

const STATUS_ORDER: SettlementStatus[] = ['draft', 'submitted', 'need_changes', 'approved', 'closed'];

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-4 sm:pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Icon className="h-8 w-8 flex-shrink-0 text-primary" />
      </CardContent>
    </Card>
  );
}

function TourListCard({ title, tours, emptyText }: { title: string; tours: Tour[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tours.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          tours.map((tour) => (
            <div key={tour.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{tour.tourCode}</div>
                  <div className="text-sm text-muted-foreground">
                    {tour.startDate && tour.endDate ? formatDateRangeDisplay(tour.startDate, tour.endDate) : '-'}
                  </div>
                </div>
                <SettlementStatusBadge status={tour.settlementStatus} />
              </div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <span>{t('dashboard.client')}: {tour.clientName || '-'}</span>
                <span>{t('dashboard.assignedGuide')}: {tour.guideRef.nameAtBooking || '-'}</span>
              </div>
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link to={`/tours/${tour.id}`}>{t('dashboard.viewTour')}</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { loading, isGuide, isAccountant, hasPermission } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-tours'],
    queryFn: () => store.listTours(undefined, { includeDetails: false }),
    enabled: !loading,
  });

  const tours = data?.tours ?? [];
  const today = todayYMD();
  const summary = useMemo(() => {
    const statusCounts = STATUS_ORDER.reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<SettlementStatus, number>);
    for (const tour of tours) statusCounts[tour.settlementStatus] += 1;

    const pendingAction = isAccountant || hasPermission('approve_settlement')
      ? statusCounts.submitted
      : isGuide || hasPermission('submit_settlement')
        ? statusCounts.need_changes
        : statusCounts.submitted + statusCounts.need_changes;

    return {
      statusCounts,
      pendingAction,
      totalGuests: tours.reduce((sum, tour) => sum + (tour.totalGuests || 0), 0),
      finalTotal: tours.reduce((sum, tour) => sum + (tour.summary.finalTotal || 0), 0),
      upcoming: tours
        .filter((tour) => tour.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 5),
      recent: [...tours].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 5),
    };
  }, [hasPermission, isAccountant, isGuide, today, tours]);

  if (isLoading || loading) {
    return <Skeleton className="mt-6 h-64 w-full" />;
  }

  if (isError) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Không thể tải dashboard.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t('dashboard.visibleTours')} value={tours.length} icon={CalendarDays} />
        <KpiCard title={t('dashboard.totalGuests')} value={summary.totalGuests} icon={Users} />
        <KpiCard title={t('dashboard.finalTotal')} value={formatCurrency(summary.finalTotal)} icon={WalletCards} />
        <KpiCard title={t('dashboard.pendingAction')} value={summary.pendingAction} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.statusSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{SETTLEMENT_STATUS_LABELS[status]}</span>
                {status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
              <div className="mt-2 text-2xl font-semibold">{summary.statusCounts[status]}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TourListCard title={t('dashboard.upcomingTours')} tours={summary.upcoming} emptyText={t('dashboard.noUpcomingTours')} />
        <TourListCard title={t('dashboard.recentTours')} tours={summary.recent} emptyText={t('dashboard.noRecentTours')} />
      </div>
    </div>
  );
}
