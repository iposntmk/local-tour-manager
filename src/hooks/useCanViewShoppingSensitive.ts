import { useAuth } from '@/contexts/AuthContext';
import { canRoleSeeShoppingSections } from '@/lib/shopping-access';

export function useCanViewShoppingSensitive() {
  const { isAdmin, isGuide } = useAuth();
  return canRoleSeeShoppingSections(isAdmin, isGuide);
}
