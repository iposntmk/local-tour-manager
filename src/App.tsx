import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
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
const REQUIRED_PIN = '0829101188';

const App = () => {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const saved = sessionStorage.getItem('app.unlocked');
    return saved === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === REQUIRED_PIN) {
      setIsUnlocked(true);
      sessionStorage.setItem('app.unlocked', 'true');
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="h-6 w-6" />
              Tour Manager - Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="pin" className="text-sm font-medium">
                  Enter PIN (hint: your phone number)
                </label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter PIN"
                  className={pinError ? 'border-red-500' : ''}
                  autoFocus
                />
                {pinError && (
                  <p className="text-sm text-red-500">Incorrect PIN. Please try again.</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Unlock App
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
