import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DynamicLayout } from "./components/DynamicLayout";
import DynamicDashboard from "./components/DynamicDashboard";
import { UniversalModulePage } from "./components/UniversalModulePage";
import NotFound from "./pages/NotFound";
import AuthForm from "./components/AuthForm";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useDynamicModules } from "./hooks/useDynamicModules";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { modules, isLoading: modulesLoading } = useDynamicModules();

  if (loading || modulesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <BrowserRouter>
       <Routes>
    <Route path="/" element={<DynamicLayout />}>
      <Route index element={<DynamicDashboard />} />
      {/* Dynamic routes for all modules */}
      {modules.map((module) => (
        <Route 
          key={module.id} 
          path={module.name} 
          element={<UniversalModulePage moduleName={module.name} />} 
        />
      ))}
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
