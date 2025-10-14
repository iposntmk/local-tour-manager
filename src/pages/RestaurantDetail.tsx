import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Share2, List } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const restaurantTypeLabels: Record<string, string> = {
  asian: 'Asian Cuisine',
  indian: 'Indian Cuisine',
  western: 'Western Cuisine',
  local: 'Local Cuisine',
  other: 'Other',
};

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => store.getRestaurant(id!),
    enabled: !!id,
  });

  const LayoutComponent = user ? Layout : PublicLayout;

  const handleShareToZalo = () => {
    if (!restaurant) return;

    const shareUrl = `${window.location.origin}/restaurants/${restaurant.id}`;
    const message = `🍽️ *${restaurant.name}*\n\n` +
      `📍 Type: ${restaurantTypeLabels[restaurant.restaurantType]}\n` +
      (restaurant.provinceRef.nameAtBooking ? `🗺️ Province: ${restaurant.provinceRef.nameAtBooking}\n` : '') +
      `📞 Phone: ${restaurant.phone || 'N/A'}\n` +
      `🏠 Address: ${restaurant.address || 'N/A'}\n` +
      `💰 Commission for Guide: ${restaurant.commissionForGuide}%\n` +
      (restaurant.note ? `\n📝 Note: ${restaurant.note}` : '') +
      `\n\n🔗 View details: ${shareUrl}`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Try to open Zalo with the message
    // For mobile, this will open the Zalo app if installed
    // For desktop, this will open Zalo web
    const zaloUrl = `https://zalo.me/share?text=${encodedMessage}`;

    // Try mobile app deep link first
    const mobileAppUrl = `zalo://share?text=${encodedMessage}`;

    // Try to open the app
    window.location.href = mobileAppUrl;

    // Fallback to web version after a short delay if app doesn't open
    setTimeout(() => {
      window.open(zaloUrl, '_blank');
    }, 500);

    toast.success('Opening Zalo to share...');
  };

  const handleCopyToClipboard = async () => {
    if (!restaurant) return;

    const shareUrl = `${window.location.origin}/restaurants/${restaurant.id}`;
    const message = `🍽️ ${restaurant.name}\n\n` +
      `📍 Type: ${restaurantTypeLabels[restaurant.restaurantType]}\n` +
      (restaurant.provinceRef.nameAtBooking ? `🗺️ Province: ${restaurant.provinceRef.nameAtBooking}\n` : '') +
      `📞 Phone: ${restaurant.phone || 'N/A'}\n` +
      `🏠 Address: ${restaurant.address || 'N/A'}\n` +
      `💰 Commission for Guide: ${restaurant.commissionForGuide}%\n` +
      (restaurant.note ? `\n📝 Note: ${restaurant.note}` : '') +
      `\n\n🔗 View details: ${shareUrl}`;

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied to clipboard! You can paste it in any app.');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <LayoutComponent>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </LayoutComponent>
    );
  }

  if (!restaurant) {
    return (
      <LayoutComponent>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-lg text-muted-foreground">Restaurant not found</div>
          {user && (
            <Button onClick={() => navigate('/restaurants')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Restaurants
            </Button>
          )}
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            {user ? (
              <Button
                variant="ghost"
                onClick={() => navigate('/restaurants')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/restaurants')}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                See All List
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={handleShareToZalo} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Share2 className="h-4 w-4" />
              Share to Zalo
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
              <p className="text-lg text-muted-foreground">
                {restaurantTypeLabels[restaurant.restaurantType]}
              </p>
            </div>

            <div className="grid gap-4">
              {restaurant.provinceRef.nameAtBooking && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Province:</div>
                  <div className="col-span-2 font-medium">
                    {restaurant.provinceRef.nameAtBooking}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Phone:</div>
                <div className="col-span-2">
                  {restaurant.phone ? (
                    <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">
                      {restaurant.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Address:</div>
                <div className="col-span-2">
                  {restaurant.address || <span className="text-muted-foreground">N/A</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Commission:</div>
                <div className="col-span-2">
                  <span className="text-lg font-semibold text-green-600">
                    {restaurant.commissionForGuide}%
                  </span>
                </div>
              </div>

              {restaurant.note && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Note:</div>
                  <div className="col-span-2 whitespace-pre-wrap">{restaurant.note}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground">Status:</div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    restaurant.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {restaurant.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20">
          <h3 className="font-semibold mb-2">💡 Sharing Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click "Share to Zalo" to open Zalo app (mobile) or Zalo Web (desktop)</li>
            <li>• Click "Copy" to copy details and paste in any messaging app</li>
            <li>• The shared message includes all restaurant details and commission info</li>
          </ul>
        </Card>
      </div>
    </LayoutComponent>
  );
};

export default RestaurantDetail;
