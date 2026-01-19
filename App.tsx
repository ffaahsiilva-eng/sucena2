
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FileText, ShieldAlert, PackageCheck, AlertTriangle, Brush, Menu, X, LogOut, 
  Users, ClipboardCheck, Images, Lock, Megaphone, Settings, CalendarClock, ScrollText, Newspaper, 
  Bell, StickyNote, ListChecks, Hammer, Ban, CalendarDays, Siren, Palette, Cloud, Check, Wifi, Globe
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { GeneralReports } from './components/modules/GeneralReports';
import { SafetyArea } from './components/modules/SafetyArea';
import { OrderRequests } from './components/modules/StockArrivals'; 
import { ServiceDeviations } from './components/modules/ServiceDeviations';
import { CleaningReport } from './components/modules/CleaningReport';
import { ResponsibilityMatrix } from './components/modules/ResponsibilityMatrix';
import { InspectionSheet } from './components/modules/InspectionSheet';
import { PhotoGallery } from './components/modules/PhotoGallery';
import { AdminPanel } from './components/modules/AdminPanel';
import { DDSRegister } from './components/modules/DDSRegister';
import { DDSSchedule } from './components/modules/DDSSchedule';
import { ProfileSettings } from './components/modules/ProfileSettings';
import { EquipmentInspections } from './components/modules/EquipmentInspections'; 
import { Logs } from './components/modules/Logs'; 
import { Reminders } from './components/modules/Reminders';
import { ResiduesAttendance } from './components/modules/ResiduesAttendance'; 
import { WorkPermits } from './components/modules/WorkPermits'; 
import { SiteInspections } from './components/modules/SiteInspections'; 
import { EmergencyContacts } from './components/modules/EmergencyContacts';
import { Appearance } from './components/modules/Appearance';
import { Login } from './components/Login';
import { ModuleType, Notification, Announcement, AppConfig } from './types';
import { AuthService, User } from './services/authService';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebaseService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Inicialização e Sincronização Cloud
  useEffect(() => {
    // Escuta mudanças de conexão do navegador
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicia escuta do Banco de Dados Firebase
    StorageService.initSync();
    
    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1200);
    };
    window.addEventListener('cloud-sync-update', handleSync);

    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      FirebaseService.setUserOnline(user.id, { name: user.name, jobTitle: user.jobTitle });
    }

    const config = StorageService.getAppConfig();
    if (config) setAppConfig(config);

    return () => {
        window.removeEventListener('cloud-sync-update', handleSync);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = () => {
    const user = AuthService.getCurrentUser();
    if (user) {
        setCurrentUser(user);
        FirebaseService.setUserOnline(user.id, { name: user.name, jobTitle: user.jobTitle });
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const baseMenuItems = [
    { id: ModuleType.DASHBOARD, label: 'Notícias', icon: Newspaper }, 
    { id: ModuleType.DDS, label: 'DDS do Dia', icon: Megaphone },
    { id: ModuleType.DDS_SCHEDULE, label: 'Escala DDS', icon: CalendarDays }, 
    { id: ModuleType.RESIDUES_ATTENDANCE, label: 'Presença', icon: ListChecks }, 
    { id: ModuleType.REMINDERS, label: 'Lembretes', icon: StickyNote }, 
    { id: ModuleType.MATRIZ, label: 'Matriz', icon: Users },
    { id: ModuleType.SAFETY, label: 'Segurança', icon: ShieldAlert },
    { id: ModuleType.STOCK, label: 'Pedidos', icon: PackageCheck },
    { id: ModuleType.GENERAL_REPORTS, label: 'Relatórios', icon: FileText },
    { id: ModuleType.GALLERY, label: 'Galeria', icon: Images }, 
    { id: ModuleType.LOGS, label: 'Logs', icon: ScrollText },
    { id: ModuleType.ADMIN, label: 'Admin', icon: Lock },
    { id: ModuleType.EMERGENCY, label: 'Emergência', icon: Siren },
  ];

  const menuItems = baseMenuItems;

  const renderContent = () => {
    switch (activeModule) {
      case ModuleType.DASHBOARD: return <Dashboard onNavigate={(m, p) => setActiveModule(m)} />;
      case ModuleType.GENERAL_REPORTS: return <GeneralReports />;
      case ModuleType.SAFETY: return <SafetyArea />;
      case ModuleType.STOCK: return <OrderRequests />;
      case ModuleType.DDS: return <DDSRegister />;
      case ModuleType.MATRIZ: return <ResponsibilityMatrix />;
      case ModuleType.RESIDUES_ATTENDANCE: return <ResiduesAttendance />;
      case ModuleType.GALLERY: return <PhotoGallery />;
      case ModuleType.ADMIN: return <AdminPanel />; 
      case ModuleType.REMINDERS: return <Reminders />;
      case ModuleType.EMERGENCY: return <EmergencyContacts />;
      case ModuleType.LOGS: return <Logs />;
      case ModuleType.DDS_SCHEDULE: return <DDSSchedule />;
      case ModuleType.PROFILE: return <ProfileSettings />;
      default: return <Dashboard onNavigate={(m, p) => setActiveModule(m)} />;
    }
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      
      {/* Sidebar Cloud Integration */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 shadow-2xl transform transition-transform duration-300 z-30 md:relative md:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
             <Cloud size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-none">Sucena</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-1 flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                Cloud Online
            </p>
          </div>
          <button className="md:hidden ml-auto text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                    setActiveModule(item.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-yellow-500 text-slate-900 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Icon size={18} className={isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-yellow-500'} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer com Status Cloud */}
        <div className="p-4 border-t border-slate-800 bg-black/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                {currentUser?.photoUrl ? <img src={currentUser.photoUrl} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white">{currentUser?.name.substring(0,2)}</span>}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
              <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">{isSyncing ? 'Sincronizando...' : isOnline ? 'Nuvem Ativa' : 'Offline'}</span>
              </div>
            </div>
            <button onClick={() => setActiveModule(ModuleType.PROFILE)} className="text-slate-500 hover:text-white"><Settings size={16} /></button>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-xl transition-all text-xs font-bold border border-red-500/20"
          >
            <LogOut size={14} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
           <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="text-slate-700">
                 <Menu size={24} />
               </button>
               <span className="font-bold text-slate-800">Painel Sucena</span>
           </div>
           <div className="relative">
               <Bell size={24} className="text-slate-400" />
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
