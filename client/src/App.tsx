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
import SubeKartlari from "@/pages/SubeKartlari";
import GirisPage from "@/pages/GirisPage";
import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import PasswordProtectedRoute from "@/components/PasswordProtectedRoute";
import AuthenticationGuard from "@/components/AuthenticationGuard";

function Router() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />
      <main className="flex-1 md:ml-[5px] min-h-screen w-full">
        <Switch>
          <Route path="/giris" component={GirisPage} />
          <Route path="/">
            <AuthenticationGuard>
              <HesaplamaPage />
            </AuthenticationGuard>
          </Route>
          <Route path="/ucretlendirme">
            <AuthenticationGuard adminOnly>
              <UcretlendirmePage />
            </AuthenticationGuard>
          </Route>
          <Route path="/hesaplama">
            <AuthenticationGuard>
              <HesaplamaPage />
            </AuthenticationGuard>
          </Route>
          <Route path="/kullanicilar">
            <AuthenticationGuard adminOnly>
              <KullanicilarPage />
            </AuthenticationGuard>
          </Route>
          <Route path="/subeler">
            <AuthenticationGuard adminOnly>
              <SubeKartlari />
            </AuthenticationGuard>
          </Route>
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
