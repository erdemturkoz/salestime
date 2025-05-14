import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import UcretlendirmePage from "@/pages/UcretlendirmePage";
import HesaplamaPage from "@/pages/HesaplamaPage";
import KullanicilarPage from "@/pages/KullanicilarPage";
import { AppProvider } from "./contexts/AppContext";
import PasswordProtectedRoute from "@/components/PasswordProtectedRoute";

function Router() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />
      <main className="flex-1 md:ml-[5px] min-h-screen w-full">
        <Switch>
          <Route path="/" component={HesaplamaPage} />
          <Route path="/ucretlendirme" component={UcretlendirmePage} />
          <Route path="/hesaplama" component={HesaplamaPage} />
          <Route path="/kullanicilar" component={KullanicilarPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
