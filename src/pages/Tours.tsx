import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { useNavigate } from 'react-router-dom';

const Tours = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours', search],
    queryFn: () => store.listTours({ tourCode: search }),
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tours</h1>
            <p className="text-muted-foreground">Manage your tours and itineraries</p>
          </div>
          <Button onClick={() => navigate('/tours/new')} className="hover-scale">
            <Plus className="h-4 w-4 mr-2" />
            New Tour
          </Button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by tour code or client name..."
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No tours found. Create your first tour to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map((tour, index) => (
              <div
                key={tour.id}
                onClick={() => navigate(`/tours/${tour.id}`)}
                className="rounded-lg border bg-card p-6 cursor-pointer hover:bg-accent/50 transition-all hover-scale animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg">{tour.tourCode}</h3>
                    <span className="text-xs text-muted-foreground">{tour.totalDays}d</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{tour.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {tour.startDate} → {tour.endDate}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{tour.companyRef.nameAtBooking}</span>
                    <span className="font-medium">{tour.guideRef.nameAtBooking}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tours;
