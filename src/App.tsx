import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SwipeNavigationProvider } from "@/components/SwipeNavigationProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// Eagerly load the index page for fast initial render
import Index from "./pages/Index";

// Lazy load all other routes
const InsuranceAI = lazy(() => import("./pages/InsuranceAI"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const ExecutiveDashboardPage = lazy(() => import("./pages/ExecutiveDashboard"));
const DataAdmin = lazy(() => import("./pages/DataAdmin"));
const NonLifeDashboard = lazy(() => import("./pages/NonLifeDashboard"));
const BrokersDashboard = lazy(() => import("./pages/BrokersDashboard"));
const NPRAPensions = lazy(() => import("./pages/NPRAPensions"));
const PensionDashboard = lazy(() => import("./pages/PensionDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="min-h-screen bg-background">
    <DashboardSkeleton />
  </div>
);

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
            <Suspense fallback={<LazyFallback />}>
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
            </Suspense>
          </div>
          <MobileBottomNav />
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
