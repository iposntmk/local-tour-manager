import type { Tour } from '@/types/tour';
import type { UserProfile } from '@/types/user';

export const canProfileViewTourShopping = (
  profile: UserProfile | undefined | null,
  tour: Pick<Tour, 'createdByUserId'>,
  isNewTour = false
) => {
  if (!profile || profile.status !== 'active') return false;
  if (profile.role === 'admin' || profile.email === 'iposntmk@gmail.com') return true;
  return profile.settlementRole === 'guide' && (isNewTour || tour.createdByUserId === profile.id);
};

export const stripTourShoppingForProfile = <T extends Tour>(
  tour: T,
  profile: UserProfile | undefined | null
): T => {
  if (canProfileViewTourShopping(profile, tour)) return tour;
  return { ...tour, shoppings: [] };
};

export const canAuthViewTourShopping = ({
  isAdmin,
  isGuide,
  userId,
  tour,
  isNewTour = false,
}: {
  isAdmin: boolean;
  isGuide: boolean;
  userId?: string;
  tour?: Pick<Tour, 'createdByUserId'> | null;
  isNewTour?: boolean;
}) => {
  if (isAdmin) return true;
  return isGuide && (isNewTour || (!!tour?.createdByUserId && tour.createdByUserId === userId));
};

export const canRoleSeeShoppingSections = (isAdmin: boolean, isGuide: boolean) => isAdmin || isGuide;
