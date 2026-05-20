import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { store } from '@/lib/datastore';
import { UserProfile, UserRole, Permission, profileHasPermission, isGuide as isGuideRole, isAccountant as isAccountantRole } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  isGuide: boolean;
  isAccountant: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading user profile for ID:', userId);
      const profile = await store.getUserProfile(userId);
      console.log('[AuthContext] User profile loaded:', profile);
      setUserProfile(profile || null);

      if (!profile) {
        console.warn('[AuthContext] ⚠️ No user profile found! Please run the database migration.');
        console.warn('[AuthContext] See: supabase/migrations/001_create_user_profiles.sql');
      }
    } catch (error) {
      console.error('[AuthContext] ❌ Error loading user profile:', error);
      setUserProfile(null);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermissionFn = (permission: Permission): boolean => {
    if (user?.email === 'iposntmk@gmail.com' || userProfile?.email === 'iposntmk@gmail.com') return true;
    if (!userProfile || userProfile.status !== 'active') return false;
    return profileHasPermission(userProfile, permission);
  };

  const hasAnyPermissionFn = (permissions: Permission[]): boolean => {
    if (user?.email === 'iposntmk@gmail.com' || userProfile?.email === 'iposntmk@gmail.com') return true;
    if (!userProfile || userProfile.status !== 'active') return false;
    return permissions.some((permission) => profileHasPermission(userProfile, permission));
  };

  const hasAllPermissionsFn = (permissions: Permission[]): boolean => {
    if (user?.email === 'iposntmk@gmail.com' || userProfile?.email === 'iposntmk@gmail.com') return true;
    if (!userProfile || userProfile.status !== 'active') return false;
    return permissions.every((permission) => profileHasPermission(userProfile, permission));
  };

  const isMasterAdmin = user?.email === 'iposntmk@gmail.com' || userProfile?.email === 'iposntmk@gmail.com';

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    hasPermission: hasPermissionFn,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    isAdmin: isMasterAdmin || (userProfile?.role === 'admin' && userProfile?.status === 'active'),
    isEditor: !isMasterAdmin && userProfile?.role === 'editor' && userProfile?.status === 'active',
    isViewer: !isMasterAdmin && userProfile?.role === 'viewer' && userProfile?.status === 'active',
    isGuide: !isMasterAdmin && !!userProfile && userProfile.status === 'active' && isGuideRole(userProfile),
    isAccountant: !isMasterAdmin && !!userProfile && userProfile.status === 'active' && isAccountantRole(userProfile),
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require specific permission(s)
export function useRequirePermission(permission: Permission | Permission[]) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = permissions.length === 1
    ? hasPermission(permissions[0])
    : hasAnyPermission(permissions);

  return allowed;
}

// Hook to require admin access
export function useRequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin;
}
