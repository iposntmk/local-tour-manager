import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { ViewVisibilityProvider } from "@/contexts/ViewVisibilityContext";
import { Layout } from "@/components/Layout";
import { InactiveUserBanner } from "@/components/auth/InactiveUserBanner";
import { RemovedUserBanner } from "@/components/auth/RemovedUserBanner";
import type { Permission } from "@/types/user";

const Languages = lazy(() => import("./pages/Languages"));
const Companies = lazy(() => import("./pages/Companies"));
const Nationalities = lazy(() => import("./pages/Nationalities"));
const Provinces = lazy(() => import("./pages/Provinces"));
const Destinations = lazy(() => import("./pages/Destinations"));
const DestinationsFree = lazy(() => import("./pages/DestinationsFree"));
const Shopping = lazy(() => import("./pages/Shopping"));
const ExpenseCategories = lazy(() => import("./pages/ExpenseCategories"));
const DetailedExpenses = lazy(() => import("./pages/DetailedExpenses"));
const Tours = lazy(() => import("./pages/Tours"));
const TourDetail = lazy(() => import("./pages/TourDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Auth = lazy(() => import("./pages/Auth"));
const Users = lazy(() => import("./pages/Users"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));

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
  children: ReactNode;
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

function PageLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-lg">Đang tải...</div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const nextUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;
    if (previousUserId && previousUserId !== nextUserId) queryClient.clear();
    prevUserIdRef.current = nextUserId;
  }, [loading, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/tours" />} />
          <Route element={user ? <ViewVisibilityProvider><Layout /></ViewVisibilityProvider> : <Navigate to="/auth" />}>
            <Route index element={<Navigate to="/tours" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="languages" element={<RequirePermissionRoute permission="view_languages"><Languages /></RequirePermissionRoute>} />
            <Route path="companies" element={<RequirePermissionRoute permission="view_companies"><Companies /></RequirePermissionRoute>} />
            <Route path="nationalities" element={<RequirePermissionRoute permission="view_nationalities"><Nationalities /></RequirePermissionRoute>} />
            <Route path="provinces" element={<RequirePermissionRoute permission="view_provinces"><Provinces /></RequirePermissionRoute>} />
            <Route path="destinations" element={<RequirePermissionRoute permission="view_tourist_destinations"><Destinations /></RequirePermissionRoute>} />
            <Route path="destinations-free" element={<RequirePermissionRoute permission="view_destinations_free"><DestinationsFree /></RequirePermissionRoute>} />
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
      </Suspense>
    </HashRouter>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InactiveUserBanner />
          <RemovedUserBanner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
