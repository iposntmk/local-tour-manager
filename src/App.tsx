import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Guides from "./pages/Guides";
import Companies from "./pages/Companies";
import Nationalities from "./pages/Nationalities";
import Provinces from "./pages/Provinces";
import Destinations from "./pages/Destinations";
import Shopping from "./pages/Shopping";
import ExpenseCategories from "./pages/ExpenseCategories";
import DetailedExpenses from "./pages/DetailedExpenses";
import DiaryTypes from "./pages/DiaryTypes";
import TourDiaries from "./pages/TourDiaries";
import Restaurants from "./pages/Restaurants";
import RestaurantDetail from "./pages/RestaurantDetail";
import ShopPlaces from "./pages/ShopPlaces";
import ShopPlaceDetail from "./pages/ShopPlaceDetail";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import Tours from "./pages/Tours";
import TourDetail from "./pages/TourDetail";
import NotFound from "./pages/NotFound";
import Statistics from "./pages/Statistics";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

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
            <Route path="/diary-types" element={user ? <DiaryTypes /> : <Navigate to="/auth" />} />
            <Route path="/tour-diaries" element={user ? <TourDiaries /> : <Navigate to="/auth" />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/shop-places" element={<ShopPlaces />} />
            <Route path="/shop-places/:id" element={<ShopPlaceDetail />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/tours" element={user ? <Tours /> : <Navigate to="/auth" />} />
            <Route path="/tours/:id" element={user ? <TourDetail /> : <Navigate to="/auth" />} />
            <Route path="/statistics" element={user ? <Statistics /> : <Navigate to="/auth" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
