import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { GuideLanguagesPicker } from '@/components/guides/GuideLanguagesPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/datastore';
import { t } from '@/lib/i18n';
import { SETTLEMENT_ROLE_LABELS, USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/types/user';

const normalizeIds = (ids?: string[]) => Array.from(new Set(ids || [])).sort();

export default function Profile() {
  const queryClient = useQueryClient();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const isGuideProfile = userProfile?.settlementRole === 'guide';

  const { data: languages = [] } = useQuery({
    queryKey: ['languages', 'active'],
    queryFn: () => store.listLanguages({ status: 'active' }),
    enabled: isGuideProfile,
  });

  useEffect(() => {
    setFullName(userProfile?.fullName ?? '');
    setPhone(userProfile?.phone ?? '');
    setNote(userProfile?.note ?? '');
    setLanguageIds(userProfile?.languageIds ?? []);
  }, [userProfile]);

  const mutation = useMutation({
    mutationFn: () => store.updateOwnProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      note: note.trim(),
      languageIds: isGuideProfile ? languageIds : undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfiles'] }),
        queryClient.invalidateQueries({ queryKey: ['guide-users'] }),
      ]);
      await refreshUserProfile();
      toast.success(t('profile.saveSuccess'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('profile.saveError'));
    },
  });

  const hasChanges = !!userProfile && (
    fullName !== (userProfile.fullName ?? '')
    || phone !== (userProfile.phone ?? '')
    || note !== (userProfile.note ?? '')
    || (isGuideProfile && normalizeIds(languageIds).join('|') !== normalizeIds(userProfile.languageIds).join('|'))
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!hasChanges || mutation.isPending) return;
    mutation.mutate();
  };

  if (!userProfile) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {t('profile.noProfile')}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('profile.description')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5" />
              {t('profile.accountInfo')}
            </CardTitle>
            <CardDescription>{t('profile.adminManaged')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground">{t('profile.email')}</div>
              <div className="font-medium">{userProfile.email || user?.email || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('profile.systemRole')}</div>
              <Badge variant="secondary">{USER_ROLE_LABELS[userProfile.role]}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">{t('profile.settlementRole')}</div>
              <Badge variant="outline">{SETTLEMENT_ROLE_LABELS[userProfile.settlementRole]}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">{t('profile.status')}</div>
              <Badge variant={userProfile.status === 'active' ? 'default' : 'secondary'}>
                {USER_STATUS_LABELS[userProfile.status]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('profile.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">{t('profile.fullName')}</Label>
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t('profile.fullNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">{t('profile.phone')}</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('profile.phonePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-note">{t('profile.note')}</Label>
              <Textarea
                id="profile-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('profile.notePlaceholder')}
                rows={4}
              />
            </div>
            {isGuideProfile && (
              <div className="space-y-2">
                <Label>{t('profile.languages')}</Label>
                <GuideLanguagesPicker
                  languages={languages}
                  value={languageIds}
                  onChange={setLanguageIds}
                  placeholder={t('profile.languagesPlaceholder')}
                />
              </div>
            )}
            <Button type="submit" disabled={!hasChanges || mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
