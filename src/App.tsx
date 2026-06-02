import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { InactiveUserBanner } from "@/components/auth/InactiveUserBanner";
import { RemovedUserBanner } from "@/components/auth/RemovedUserBanner";
import type { Permission } from "@/types/user";
import Languages from "./pages/Languages";
import Companies from "./pages/Companies";
import Nationalities from "./pages/Nationalities";
import Provinces from "./pages/Provinces";
import Destinations from "./pages/Destinations";
import Shopping from "./pages/Shopping";
import ExpenseCategories from "./pages/ExpenseCategories";
import DetailedExpenses from "./pages/DetailedExpenses";
import Tours from "./pages/Tours";
import TourDetail from "./pages/TourDetail";
import NotFound from "./pages/NotFound";
import Statistics from "./pages/Statistics";
import Auth from "./pages/Auth";
import Users from "./pages/Users";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES,
      gcTime: THIRTY_MINUTES,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tài khoản của bạn chưa được cấp quyền cho tính năng này.
        </p>
      </div>
    </div>
  );
}

function RequirePermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return hasPermission(permission) ? <>{children}</> : <AccessDenied />;
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Clear all React Query cache only on sign in/out (not token refresh)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InactiveUserBanner />
          <RemovedUserBanner />
          <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <Routes>
              <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/dashboard" />} />
              <Route element={user ? <Layout /> : <Navigate to="/auth" />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="languages" element={<RequirePermissionRoute permission="view_languages"><Languages /></RequirePermissionRoute>} />
                <Route path="companies" element={<RequirePermissionRoute permission="view_companies"><Companies /></RequirePermissionRoute>} />
                <Route path="nationalities" element={<RequirePermissionRoute permission="view_nationalities"><Nationalities /></RequirePermissionRoute>} />
                <Route path="provinces" element={<RequirePermissionRoute permission="view_provinces"><Provinces /></RequirePermissionRoute>} />
                <Route path="destinations" element={<RequirePermissionRoute permission="view_tourist_destinations"><Destinations /></RequirePermissionRoute>} />
                <Route path="shopping" element={<RequirePermissionRoute permission="view_shopping"><Shopping /></RequirePermissionRoute>} />
                <Route path="expense-categories" element={<RequirePermissionRoute permission="view_expense_categories"><ExpenseCategories /></RequirePermissionRoute>} />
                <Route path="detailed-expenses" element={<RequirePermissionRoute permission="view_detailed_expenses"><DetailedExpenses /></RequirePermissionRoute>} />
                <Route path="tours" element={<RequirePermissionRoute permission="view_tours"><Tours /></RequirePermissionRoute>} />
                <Route path="tours/:id" element={<RequirePermissionRoute permission="view_tours"><TourDetail /></RequirePermissionRoute>} />
                <Route path="statistics" element={<RequirePermissionRoute permission="view_statistics"><Statistics /></RequirePermissionRoute>} />
                <Route path="users" element={<RequirePermissionRoute permission="manage_users"><Users /></RequirePermissionRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
