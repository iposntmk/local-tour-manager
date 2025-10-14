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

const roomTypeLabels: Record<string, string> = {
  single: 'Single',
  double: 'Double',
  group: 'Group',
  suite: 'Suite',
};

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['hotel', id],
    queryFn: () => store.getHotel(id!),
    enabled: !!id,
  });

  const LayoutComponent = user ? Layout : PublicLayout;

  const handleShareToZalo = () => {
    if (!hotel) return;

    const shareUrl = `${window.location.origin}/hotels/${hotel.id}`;
    const message = `🏨 *${hotel.name}*\n\n` +
      `🛏️ Room Type: ${roomTypeLabels[hotel.roomType]}\n` +
      (hotel.provinceRef.nameAtBooking ? `🗺️ Province: ${hotel.provinceRef.nameAtBooking}\n` : '') +
      `💵 Price per Night: ${hotel.pricePerNight.toLocaleString()} ₫\n` +
      `👤 Owner: ${hotel.ownerName}\n` +
      `📞 Owner Phone: ${hotel.ownerPhone}\n` +
      `🏠 Address: ${hotel.address || 'N/A'}\n` +
      (hotel.note ? `\n📝 Note: ${hotel.note}` : '') +
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
    if (!hotel) return;

    const shareUrl = `${window.location.origin}/hotels/${hotel.id}`;
    const message = `🏨 ${hotel.name}\n\n` +
      `🛏️ Room Type: ${roomTypeLabels[hotel.roomType]}\n` +
      (hotel.provinceRef.nameAtBooking ? `🗺️ Province: ${hotel.provinceRef.nameAtBooking}\n` : '') +
      `💵 Price per Night: ${hotel.pricePerNight.toLocaleString()} ₫\n` +
      `👤 Owner: ${hotel.ownerName}\n` +
      `📞 Owner Phone: ${hotel.ownerPhone}\n` +
      `🏠 Address: ${hotel.address || 'N/A'}\n` +
      (hotel.note ? `\n📝 Note: ${hotel.note}` : '') +
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

  if (!hotel) {
    return (
      <LayoutComponent>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-lg text-muted-foreground">Hotel not found</div>
          {user && (
            <Button onClick={() => navigate('/hotels')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hotels
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
                onClick={() => navigate('/hotels')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/hotels')}
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
              <h1 className="text-3xl font-bold mb-2">{hotel.name}</h1>
              <p className="text-lg text-muted-foreground">
                {roomTypeLabels[hotel.roomType]}
              </p>
            </div>

            <div className="grid gap-4">
              {hotel.provinceRef.nameAtBooking && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Province:</div>
                  <div className="col-span-2 font-medium">
                    {hotel.provinceRef.nameAtBooking}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Price per Night:</div>
                <div className="col-span-2">
                  <span className="text-lg font-semibold text-green-600">
                    {hotel.pricePerNight.toLocaleString()} ₫
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Owner Name:</div>
                <div className="col-span-2">{hotel.ownerName}</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Owner Phone:</div>
                <div className="col-span-2">
                  <a href={`tel:${hotel.ownerPhone}`} className="text-blue-600 hover:underline">
                    {hotel.ownerPhone}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm font-medium text-muted-foreground">Address:</div>
                <div className="col-span-2">
                  {hotel.address || <span className="text-muted-foreground">N/A</span>}
                </div>
              </div>

              {hotel.note && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Note:</div>
                  <div className="col-span-2 whitespace-pre-wrap">{hotel.note}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground">Status:</div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    hotel.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {hotel.status}
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
            <li>• The shared message includes all hotel details and pricing info</li>
          </ul>
        </Card>
      </div>
    </LayoutComponent>
  );
};

export default HotelDetail;
