import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Tours />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/nationalities" element={<Nationalities />} />
            <Route path="/provinces" element={<Provinces />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/expense-categories" element={<ExpenseCategories />} />
            <Route path="/detailed-expenses" element={<DetailedExpenses />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/tours/:id" element={<TourDetail />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
