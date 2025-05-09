import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import UcretlendirmePage from "@/pages/UcretlendirmePage";
import HesaplamaPage from "@/pages/HesaplamaPage";
import { AppProvider } from "./contexts/AppContext";

// Yetki gerektiren rota bileşeni
function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
  const { isAuthenticated, canAccessPath } = useAuth();
  const [location] = useLocation();
  
  // Oturum açılmamışsa Ana Sayfaya yönlendir
  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }
  
  // Yetki yoksa 404 sayfasına yönlendir
  if (!canAccessPath(path)) {
    return <NotFound />;
  }
  
  return <Component />;
}

// Giriş/Çıkış Test Formu (Geçici)
function LoginTestForm() {
  const { isAuthenticated, login, logout, userRole, userName, userBranch } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.SATIS_DANISMANI);
  const [username, setUsername] = useState<string>('test_user');
  const [branchId, setBranchId] = useState<number>(1);
  const [branchName, setBranchName] = useState<string>('Kadıköy Şubesi');

  const handleLogin = () => {
    login(username, role, branchId, branchName);
  };

  if (isAuthenticated) {
    return (
      <div className="bg-green-100 border border-green-200 rounded p-4 mb-4">
        <p><strong>Mevcut Kullanıcı:</strong> {userName} ({userRole})</p>
        <p><strong>Şube:</strong> {userBranch?.name || 'Şube yok'}</p>
        <button 
          onClick={logout}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
      <h3 className="font-bold mb-2">Test Girişi</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm">Kullanıcı Adı:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm">Rol:</label>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="border p-1 rounded w-full"
          >
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.KURUCU}>Kurucu</option>
            <option value={UserRole.SUBE_MUDURU}>Şube Müdürü</option>
            <option value={UserRole.SATIS_DANISMANI}>Satış Danışmanı</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Şube:</label>
          <select 
            value={branchId}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setBranchId(id);
              
              // Şube adını ID'ye göre ayarla (gerçek uygulamada API'den gelecek)
              if (id === 1) setBranchName('Kadıköy Şubesi');
              else if (id === 2) setBranchName('Beyoğlu Şubesi');
              else setBranchName('Bilinmeyen Şube');
            }}
            className="border p-1 rounded w-full"
          >
            <option value={1}>Kadıköy Şubesi</option>
            <option value={2}>Beyoğlu Şubesi</option>
          </select>
        </div>
        <button 
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Giriş Yap
        </button>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Oturum açıldığında URL'yi kontrol et 
  useEffect(() => {
    if (isAuthenticated && location === '/') {
      // Ana sayfaya yönlendir
      setLocation('/hesaplama');
    }
  }, [isAuthenticated, location, setLocation]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* Test amaçlı giriş formu - gerçek uygulamada kaldırılacak */}
        <LoginTestForm />
        
        <Switch>
          <Route path="/" component={UcretlendirmePage} />
          <Route path="/ucretlendirme">
            <ProtectedRoute component={UcretlendirmePage} path="/ucretlendirme" />
          </Route>
          <Route path="/hesaplama">
            <ProtectedRoute component={HesaplamaPage} path="/hesaplama" />
          </Route>
          <Route path="/subeler">
            <ProtectedRoute component={SubelerPage} path="/subeler" />
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
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
