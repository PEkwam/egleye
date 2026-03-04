import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SwipeNavigationProvider } from "@/components/SwipeNavigationProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import InsuranceAI from "./pages/InsuranceAI";
import ArticleDetail from "./pages/ArticleDetail";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboard";
import DataAdmin from "./pages/DataAdmin";
import NonLifeDashboard from "./pages/NonLifeDashboard";
import BrokersDashboard from "./pages/BrokersDashboard";
import NPRAPensions from "./pages/NPRAPensions";
import PensionDashboard from "./pages/PensionDashboard";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SwipeNavigationProvider />
          <div className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/executive-dashboard" element={<ExecutiveDashboardPage />} />
              <Route path="/nonlife-dashboard" element={<NonLifeDashboard />} />
              <Route path="/insurance-ai" element={<InsuranceAI />} />
              <Route path="/article/:id" element={<ArticleDetail />} />
              <Route path="/data-admin" element={<DataAdmin />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/brokers-dashboard" element={<BrokersDashboard />} />
              <Route path="/npra-pensions" element={<NPRAPensions />} />
              <Route path="/pension-dashboard" element={<PensionDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <MobileBottomNav />
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
