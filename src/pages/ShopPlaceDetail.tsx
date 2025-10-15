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

const shopTypeLabels: Record<string, string> = {
  clothing: 'Clothing',
  food_and_beverage: 'Food & Beverage',
  souvenirs: 'Souvenirs',
  handicrafts: 'Handicrafts',
  electronics: 'Electronics',
  other: 'Other',
};

const ShopPlaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data: shopPlace, isLoading } = useQuery({
    queryKey: ['shop-place', id],
    queryFn: () => store.getShopPlace(id!),
    enabled: !!id,
  });

  const LayoutComponent = user ? Layout : PublicLayout;

  const handleShareToZalo = () => {
    if (!shopPlace) return;

    const shareUrl = `${window.location.origin}/shop-places/${shopPlace.id}`;
    const message = `🛍️ *${shopPlace.name}*\n\n` +
      `📍 Type: ${shopTypeLabels[shopPlace.shopType]}\n` +
      (shopPlace.provinceRef.nameAtBooking ? `🗺️ Province: ${shopPlace.provinceRef.nameAtBooking}\n` : '') +
      `📞 Phone: ${shopPlace.phone || 'N/A'}\n` +
      `🏠 Address: ${shopPlace.address || 'N/A'}\n` +
      `💰 Commission for Guide: ${shopPlace.commissionForGuide}%\n` +
      (shopPlace.note ? `\n📝 Note: ${shopPlace.note}` : '') +
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
    if (!shopPlace) return;

    const shareUrl = `${window.location.origin}/shop-places/${shopPlace.id}`;
    const message = `🛍️ ${shopPlace.name}\n\n` +
      `📍 Type: ${shopTypeLabels[shopPlace.shopType]}\n` +
      (shopPlace.provinceRef.nameAtBooking ? `🗺️ Province: ${shopPlace.provinceRef.nameAtBooking}\n` : '') +
      `📞 Phone: ${shopPlace.phone || 'N/A'}\n` +
      `🏠 Address: ${shopPlace.address || 'N/A'}\n` +
      `💰 Commission for Guide: ${shopPlace.commissionForGuide}%\n` +
      (shopPlace.note ? `\n📝 Note: ${shopPlace.note}` : '') +
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

  if (!shopPlace) {
    return (
      <LayoutComponent>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-lg text-muted-foreground">Shop place not found</div>
          {user && (
            <Button onClick={() => navigate('/shop-places')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shop Places
            </Button>
          )}
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="space-y-6 max-w-3xl mx-auto px-4 sm:px-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {user ? (
              <Button
                variant="ghost"
                onClick={() => navigate('/shop-places')}
                className="gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/shop-places')}
                className="gap-2 w-full sm:w-auto"
              >
                <List className="h-4 w-4" />
                See All List
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleCopyToClipboard} variant="outline" className="gap-2 w-full sm:w-auto">
              <Share2 className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={handleShareToZalo} className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Share2 className="h-4 w-4" />
              Share to Zalo
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{shopPlace.name}</h1>
              <p className="text-lg text-muted-foreground">
                {shopTypeLabels[shopPlace.shopType]}
              </p>
            </div>

            <div className="grid gap-4">
              {shopPlace.provinceRef.nameAtBooking && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm font-medium text-muted-foreground">Province:</div>
                  <div className="font-medium sm:col-span-2">
                    {shopPlace.provinceRef.nameAtBooking}
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="text-sm font-medium text-muted-foreground">Phone:</div>
                <div className="sm:col-span-2">
                  {shopPlace.phone ? (
                    <a href={`tel:${shopPlace.phone}`} className="text-blue-600 hover:underline">
                      {shopPlace.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="text-sm font-medium text-muted-foreground">Address:</div>
                <div className="sm:col-span-2">
                  {shopPlace.address || <span className="text-muted-foreground">N/A</span>}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="text-sm font-medium text-muted-foreground">Commission:</div>
                <div className="sm:col-span-2">
                  <span className="text-lg font-semibold text-green-600">
                    {shopPlace.commissionForGuide}%
                  </span>
                </div>
              </div>

              {shopPlace.note && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm font-medium text-muted-foreground">Note:</div>
                  <div className="sm:col-span-2 whitespace-pre-wrap">{shopPlace.note}</div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground">Status:</div>
                <div className="sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    shopPlace.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {shopPlace.status}
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
            <li>• The shared message includes all shop details and commission info</li>
          </ul>
        </Card>
      </div>
    </LayoutComponent>
  );
};

export default ShopPlaceDetail;
