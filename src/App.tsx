import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Guides from "./pages/Guides";
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
          queryClient.invalidateQueries();
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
          <HashRouter>
            <Routes>
              <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Tours /> : <Navigate to="/auth" />} />
              <Route path="/guides" element={user ? <Guides /> : <Navigate to="/auth" />} />
              <Route path="/companies" element={user ? <Companies /> : <Navigate to="/auth" />} />
              <Route path="/nationalities" element={user ? <Nationalities /> : <Navigate to="/auth" />} />
              <Route path="/provinces" element={user ? <Provinces /> : <Navigate to="/auth" />} />
              <Route path="/destinations" element={user ? <Destinations /> : <Navigate to="/auth" />} />
              <Route path="/shopping" element={user ? <Shopping /> : <Navigate to="/auth" />} />
              <Route path="/expense-categories" element={user ? <ExpenseCategories /> : <Navigate to="/auth" />} />
              <Route path="/detailed-expenses" element={user ? <DetailedExpenses /> : <Navigate to="/auth" />} />
              <Route path="/tours" element={user ? <Tours /> : <Navigate to="/auth" />} />
              <Route path="/tours/:id" element={user ? <TourDetail /> : <Navigate to="/auth" />} />
              <Route path="/statistics" element={user ? <Statistics /> : <Navigate to="/auth" />} />
              <Route path="/users" element={user ? <Users /> : <Navigate to="/auth" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
