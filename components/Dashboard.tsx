
import React, { useEffect, useState } from 'react';
import { Card, Button, Input, AITextArea } from './ui/Shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StorageService } from '../services/storageService';
import { DDSRecord, EquipmentInspectionRecord, LogRecord, OrderRecord, ReminderRecord, WorkPermitRecord, SiteInspectionRecord, ModuleType, MatrixRole, DDSScheduleRecord } from '../types';
import { TrendingUp, CheckCircle2, FileText, AlertTriangle, Megaphone, User, Users, Calendar, Image as ImageIcon, Siren, Truck, Newspaper, Check, X, Save, ShoppingBag, Clock, StickyNote, BellRing, ClipboardCheck, Hammer, ArrowRight, UserCheck } from 'lucide-react';
import { AuthService, User as UserType } from '../services/authService';

interface DashboardProps {
    onNavigate: (module: ModuleType, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState({
      compliance: 0,
      totalReports: 0,
      totalDeviations: 0,
      cleaningData: [] as any[],
      activityData: [] as any[],
      todaysDDS: null as DDSRecord | null,
      upcomingInspections: [] as EquipmentInspectionRecord[],
      recentDeliveries: [] as OrderRecord[], 
      urgentOrders: [] as OrderRecord[], 
      todaysReminders: [] as ReminderRecord[],
      expiringPermits: [] as WorkPermitRecord[],
      upcomingSiteInspections: [] as SiteInspectionRecord[],
      matrixData: [] as MatrixRole[],
      tomorrowDDS: null as DDSScheduleRecord | null
  });

  const [inspectModal, setInspectModal] = useState<{
      isOpen: boolean;
      inspectionId: string | null;
      vehicleName: string;
      plate: string;
      action: 'APROVADO' | 'REPROVADO' | null;
  }>({ isOpen: false, inspectionId: null, vehicleName: '', plate: '', action: null });

  const [inspectForm, setInspectForm] = useState({
      newDate: '',
      comment: ''
  });

  const [daysLeftInMonth, setDaysLeftInMonth] = useState<number>(30);
  const [onlineUsers, setOnlineUsers] = useState<{ user: UserType, isOnline: boolean }[]>([]);

  const COLORS = ['#0f172a', '#EAB308', '#64748b', '#94a3b8', '#cbd5e1'];

  const loadData = () => {
    const data = StorageService.getDataForDashboard();
    const ddsRecords = StorageService.getDDS();
    const inspections = StorageService.getGeneric(StorageService.KEYS.EQUIPMENT_INSPECTION) as EquipmentInspectionRecord[];
    const orders = StorageService.getGeneric(StorageService.KEYS.STOCK) as OrderRecord[];
    const allReminders = StorageService.getReminders();
    
    const permits = StorageService.getGeneric(StorageService.KEYS.WORK_PERMITS) as WorkPermitRecord[];
    const siteInspections = StorageService.getGeneric(StorageService.KEYS.SITE_INSPECTIONS) as SiteInspectionRecord[];
    const ddsSchedule = StorageService.getDDSSchedule();

    const now = new Date();
    const today = new Date();
    today.setHours(0,0,0,0);

    const currentUser = AuthService.getCurrentUser();
    
    const todayStr = now.toISOString().split('T')[0];
    const todaysReminders = allReminders.filter(r => {
        if (r.date !== todayStr) return false;
        if (r.createdBy === currentUser?.username) return true;
        if (r.visibility === 'ALL') return true;
        if (r.visibility === 'ROLES' && r.targetRoles?.includes(currentUser?.jobTitle || '')) return true;
        if ((r.visibility === 'USER' || !r.visibility) && r.mentionedUser === currentUser?.username) return true;
        return false;
    });

    const expiringPermits = permits.filter(p => {
        if (p.status !== 'ACTIVE') return false;
        const expDate = new Date(p.expirationDate);
        expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
    });

    const upcomingSiteInspections = siteInspections.filter(i => {
        if (i.status !== 'PENDING') return false;
        const inspDate = new Date(i.inspectionDate);
        inspDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((inspDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
    });

    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const recentDeliveries = orders.filter(o => 
        o.status === 'ENTREGUE' && 
        o.updatedAt && 
        new Date(o.updatedAt) > twelveHoursAgo
    );

    const urgentOrders = orders.filter(o => {
        if (o.status !== 'PENDENTE') return false;
        const deadline = new Date(o.requiredDate);
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 5;
    }).sort((a, b) => new Date(a.requiredDate).getTime() - new Date(b.requiredDate).getTime());

    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const todayKey = localDate.toISOString().split('T')[0];
    const todaysDDS = ddsRecords.find(r => r.date === todayKey) || null;

    const upcoming = inspections.filter(i => {
        const iDate = new Date(i.nextInspectionDate);
        iDate.setHours(0,0,0,0);
        const diffTime = iDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2; 
    });
    upcoming.sort((a, b) => new Date(a.nextInspectionDate).getTime() - new Date(b.nextInspectionDate).getTime());

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tYear = tomorrow.getFullYear();
    const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tDay = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowKey = `${tYear}-${tMonth}-${tDay}`;
    const tomorrowDDS = ddsSchedule.find(s => s.date === tomorrowKey) || null;

    let totalTasks = 0;
    let completedTasks = 0;
    data.matrix.forEach(role => {
        role.tasks.forEach(task => {
            totalTasks++;
            if (task.completed) completedTasks++;
        });
    });
    const compliance = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysLeft = Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    setDaysLeftInMonth(daysLeft);

    const chartData = [];
    for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dateKey = d.toISOString().split('T')[0];
        const reportsCount = data.reports.filter(r => r.date === dateKey).length;
        const devCount = data.deviations.filter(dev => dev.createdAt.startsWith(dateKey)).length;
        chartData.push({
            name: dayStr.charAt(0).toUpperCase() + dayStr.slice(1),
            reports: reportsCount,
            issues: devCount
        });
    }

    const cleaningMap: Record<string, number> = {};
    data.cleaning.forEach(c => {
        cleaningMap[c.area] = (cleaningMap[c.area] || 0) + 1;
    });
    const cleaningChartData = Object.keys(cleaningMap).map(area => ({
        name: area,
        value: cleaningMap[area]
    }));
    if (cleaningChartData.length === 0) cleaningChartData.push({ name: 'Sem dados', value: 1 });

    setMetrics({
        compliance,
        totalReports: data.reports.length,
        totalDeviations: data.deviations.length,
        cleaningData: cleaningChartData,
        activityData: chartData,
        todaysDDS,
        upcomingInspections: upcoming,
        recentDeliveries,
        urgentOrders,
        todaysReminders,
        expiringPermits,
        upcomingSiteInspections,
        matrixData: data.matrix,
        tomorrowDDS
    });

    // Usuários online
    const allUsers = AuthService.getUsers();
    const processedUsers = allUsers.map(u => {
        let isOnline = false;
        if (u.lastSeen) {
            const lastSeenTime = new Date(u.lastSeen).getTime();
            const timeDiff = now.getTime() - lastSeenTime;
            if (timeDiff < 5 * 60 * 1000) isOnline = true;
        }
        if (currentUser && u.username === currentUser.username) isOnline = true;
        return { user: u, isOnline };
    });

    processedUsers.sort((a, b) => {
        if (a.isOnline === b.isOnline) return a.user.name.localeCompare(b.user.name);
        return a.isOnline ? -1 : 1;
    });

    setOnlineUsers(processedUsers);
  };

  useEffect(() => {
    loadData();
    
    // Listener para o banco de dados online
    const handleSync = () => {
        loadData();
    };
    window.addEventListener('cloud-sync-update', handleSync);
    
    const interval = setInterval(loadData, 15000); // Online users list refresh
    return () => {
        window.removeEventListener('cloud-sync-update', handleSync);
        clearInterval(interval);
    };
  }, []);

  const openActionModal = (insp: EquipmentInspectionRecord, action: 'APROVADO' | 'REPROVADO') => {
      setInspectModal({
          isOpen: true,
          inspectionId: insp.id,
          vehicleName: insp.vehicleName,
          plate: insp.plate,
          action
      });
      const today = new Date();
      if (action === 'APROVADO') today.setDate(today.getDate() + 30);
      else today.setDate(today.getDate() + 1);
      
      setInspectForm({
          newDate: today.toISOString().split('T')[0],
          comment: ''
      });
  };

  const handleSaveAction = async () => {
      if (!inspectModal.inspectionId || !inspectForm.newDate) return;

      const user = AuthService.getCurrentUser();
      
      const log: LogRecord = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          category: 'VISTORIA',
          action: inspectModal.action || 'INFO',
          description: `Vistoria ${inspectModal.action} - ${inspectModal.vehicleName}`,
          details: `Placa: ${inspectModal.plate}. Obs: ${inspectForm.comment}`,
          createdBy: user?.username || 'Sistema',
          authorName: user?.name || 'Anônimo',
          authorRole: user?.jobTitle || 'N/A'
      };
      await StorageService.addLog(log);

      const inspections = StorageService.getGeneric(StorageService.KEYS.EQUIPMENT_INSPECTION) as EquipmentInspectionRecord[];
      const original = inspections.find(i => i.id === inspectModal.inspectionId);
      
      if (original) {
          const updated: EquipmentInspectionRecord = {
              ...original,
              nextInspectionDate: inspectForm.newDate
          };
          await StorageService.updateItem(StorageService.KEYS.EQUIPMENT_INSPECTION, updated);
      }

      setInspectModal({ isOpen: false, inspectionId: null, vehicleName: '', plate: '', action: null });
      loadData();
  };

  const currentUser = AuthService.getCurrentUser();
  const incompleteRoles = metrics.matrixData.filter(role => {
      const completed = role.tasks.filter(t => t.completed).length;
      return completed < role.tasks.length;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex items-center gap-2 mb-2">
           <Newspaper className="text-slate-700" size={24} />
           <h2 className="text-2xl font-bold text-slate-800">Painel de Notícias & Indicadores</h2>
      </div>

      {metrics.tomorrowDDS && metrics.tomorrowDDS.speakerName && (
          <div className="w-full bg-purple-600 rounded-xl p-4 shadow-md mb-4 text-white animate-in slide-in-from-top-2 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                      <Megaphone size={28} className="animate-pulse text-yellow-300" />
                  </div>
                  <div>
                      <h3 className="font-bold text-lg uppercase tracking-wide text-purple-100 mb-1">
                          DDS de Amanhã <span className="text-xs opacity-70 ml-1">({new Date(metrics.tomorrowDDS.date + 'T12:00:00').toLocaleDateString('pt-BR')})</span>
                      </h3>
                      <p className="text-xl font-bold text-white flex items-center gap-2">
                          <User size={20}/> {metrics.tomorrowDDS.speakerName}
                      </p>
                      {metrics.tomorrowDDS.theme && (
                          <p className="text-sm text-purple-200 mt-1">Tema: <span className="font-semibold text-white">{metrics.tomorrowDDS.theme}</span></p>
                      )}
                  </div>
              </div>
              <button 
                  onClick={() => onNavigate(ModuleType.DDS_SCHEDULE)}
                  className="bg-white text-purple-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-50 transition-colors shadow-sm whitespace-nowrap"
              >
                  Ver Escala Completa
              </button>
          </div>
      )}

      {daysLeftInMonth <= 7 && incompleteRoles.length > 0 && (
          <div className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3">
                  <Clock className="text-indigo-600 animate-pulse" />
                  <h3 className="text-indigo-900 font-bold text-lg">Fechamento Mensal da Matriz</h3>
              </div>
              <p className="text-sm text-indigo-700 mb-3">
                  Faltam apenas <span className="font-bold">{daysLeftInMonth} dias</span> para o reset da matriz. 
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {incompleteRoles.map(role => {
                      const completed = role.tasks.filter(t => t.completed).length;
                      const total = role.tasks.length;
                      const percent = Math.round((completed / total) * 100);
                      return (
                          <div 
                            key={role.id} 
                            className="bg-white p-2 rounded border border-indigo-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-colors"
                            onClick={() => onNavigate(ModuleType.MATRIZ)}
                          >
                              <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                  <ArrowRight size={12} className="text-indigo-400"/> {role.title}
                              </span>
                              <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  {percent}% Completo
                              </span>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {(metrics.expiringPermits.length > 0 || metrics.upcomingSiteInspections.length > 0) && (
          <div className="w-full bg-orange-100 border border-orange-300 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-orange-600 animate-pulse" />
                  <h3 className="text-orange-900 font-bold text-lg">Alertas de Vencimento e Vistorias</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.expiringPermits.map(pt => {
                      const daysLeft = Math.ceil((new Date(pt.expirationDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                      return (
                          <div 
                            key={pt.id} 
                            className="bg-white p-3 rounded-lg border-l-4 border-l-orange-500 border shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => onNavigate(ModuleType.WORK_PERMITS, { category: pt.category })}
                          >
                              <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                                      <Hammer size={12}/> PT - {pt.category}
                                  </span>
                                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">Vence em {daysLeft} dias</span>
                              </div>
                              <p className="font-bold text-slate-800">{pt.location}</p>
                          </div>
                      );
                  })}

                  {metrics.upcomingSiteInspections.map(insp => {
                      const daysLeft = Math.ceil((new Date(insp.inspectionDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                      return (
                          <div 
                            key={insp.id} 
                            className="bg-white p-3 rounded-lg border-l-4 border-l-purple-500 border shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => onNavigate(ModuleType.SITE_INSPECTION)}
                          >
                              <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                      <ClipboardCheck size={12}/> Vistoria de Canteiro
                                  </span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                                      {daysLeft === 0 ? 'HOJE' : `Em ${daysLeft} dias`}
                                  </span>
                              </div>
                              <p className="font-bold text-slate-800">{insp.location}</p>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {metrics.todaysReminders.length > 0 && (
          <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3">
                  <BellRing className="text-yellow-600 animate-pulse" />
                  <h3 className="text-yellow-800 font-bold text-lg">Lembretes para Hoje</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.todaysReminders.map(rem => (
                      <div 
                        key={rem.id} 
                        className="bg-white p-3 rounded-lg border shadow-sm cursor-pointer border-yellow-100 hover:bg-slate-50 transition-colors"
                        onClick={() => onNavigate(ModuleType.REMINDERS)}
                      >
                          <div className="flex items-start gap-3">
                               <div className="p-2 rounded-full shrink-0 bg-yellow-100 text-yellow-700">
                                   <StickyNote size={18} />
                               </div>
                               <div>
                                   <p className="font-bold text-slate-800 leading-tight">{rem.title}</p>
                                   <p className="text-sm text-slate-600 mt-1 truncate">{rem.description}</p>
                               </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {metrics.recentDeliveries.length > 0 && (
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="text-green-600" />
                  <h3 className="text-green-800 font-bold text-lg">Materiais Entregues (Últimas 12h)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.recentDeliveries.map(order => (
                      <div 
                        key={order.id} 
                        className="bg-white p-3 rounded-lg border border-green-100 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => onNavigate(ModuleType.STOCK, { tab: 'requests' })}
                      >
                          <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-full text-green-700">
                                   <ShoppingBag size={18} />
                               </div>
                               <div>
                                   <p className="font-bold text-slate-800 leading-none">{order.materialName}</p>
                               </div>
                          </div>
                          <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">ENTREGUE</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {metrics.upcomingInspections.length > 0 && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                  <Siren className="text-red-600 animate-bounce" />
                  <h3 className="text-red-800 font-bold text-lg">Vistorias de Equipamentos Pendentes</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.upcomingInspections.map(insp => {
                      const days = Math.ceil((new Date(insp.nextInspectionDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                      const isLate = days < 0;
                      return (
                          <div 
                            key={insp.id} 
                            className="bg-white p-3 rounded-lg border border-red-100 flex flex-col justify-between shadow-sm gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => onNavigate(ModuleType.EQUIPMENT_INSPECTION)}
                          >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Truck className="text-slate-400" size={20} />
                                    <div>
                                        <p className="font-bold text-slate-800 leading-none">{insp.vehicleName}</p>
                                        <p className="font-mono text-xs text-slate-500 mt-1">{insp.plate}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-sm ${isLate ? 'text-red-600' : 'text-orange-500'}`}>
                                        {new Date(insp.nextInspectionDate).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                              </div>
                              <div className="flex gap-2 border-t pt-2 border-slate-100" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => openActionModal(insp, 'APROVADO')} className="flex-1 bg-green-50 text-green-700 py-1 rounded text-xs font-bold">Aprovar</button>
                                  <button onClick={() => openActionModal(insp, 'REPROVADO')} className="flex-1 bg-red-50 text-red-700 py-1 rounded text-xs font-bold">Reprovar</button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="w-full mt-6">
         <Card className={`border-l-4 ${metrics.todaysDDS ? 'border-l-green-500' : 'border-l-slate-300'} shadow-md`}>
            {metrics.todaysDDS ? (
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <h2 className="text-2xl font-bold text-slate-800">
                            <Megaphone className="inline-block mr-2 text-green-600 mb-1" size={24}/>
                            {metrics.todaysDDS.theme}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <User size={20} className="text-blue-600" />
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">Palestrante</p>
                                    <p className="font-semibold text-slate-800">{metrics.todaysDDS.speaker}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users size={20} className="text-orange-600" />
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">Presença</p>
                                    <p className="font-semibold text-slate-800">{metrics.todaysDDS.employeesCount} Integrantes</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center cursor-pointer" onClick={() => onNavigate(ModuleType.DDS)}>
                    <Megaphone className="mx-auto text-slate-400 mb-3" size={32} />
                    <h3 className="text-lg font-bold text-slate-700">DDS de hoje pendente</h3>
                    <p className="text-slate-500">Toque para registrar o diálogo de segurança.</p>
                </div>
            )}
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-center items-center cursor-pointer" onClick={() => onNavigate(ModuleType.MATRIZ)}>
            <span className="text-sm font-bold text-slate-500 uppercase mb-2">Matriz de Resp.</span>
            <div className="relative flex items-center justify-center">
                 <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="36" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="36" stroke="#EAB308" strokeWidth="8" fill="transparent" strokeDasharray={`${metrics.compliance * 2.26} 226`}  />
                 </svg>
                 <span className="absolute text-2xl font-bold text-slate-800">{metrics.compliance}%</span>
            </div>
        </Card>

        <Card className="cursor-pointer" onClick={() => onNavigate(ModuleType.GENERAL_REPORTS)}>
             <div className="flex items-start justify-between">
                <div>
                   <span className="text-sm font-bold text-slate-500 uppercase">Relatórios</span>
                   <h3 className="text-3xl font-bold text-slate-800 mt-2">{metrics.totalReports}</h3>
                </div>
                <FileText size={24} className="text-slate-400" />
             </div>
        </Card>

        <Card className="cursor-pointer" onClick={() => onNavigate(ModuleType.DEVIATIONS)}>
             <div className="flex items-start justify-between">
                <div>
                   <span className="text-sm font-bold text-slate-500 uppercase">Desvios</span>
                   <h3 className="text-3xl font-bold text-red-600 mt-2">{metrics.totalDeviations}</h3>
                </div>
                <AlertTriangle size={24} className="text-red-400" />
             </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} /> Atividades Semanais
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="reports" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} /> Limpeza por Setor
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={metrics.cleaningData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {metrics.cleaningData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="w-full">
          <Card className="bg-slate-900 text-white">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <UserCheck size={20} className="text-green-400" />
                  <h3 className="text-lg font-bold">Equipe Online Agora</h3>
                  <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                  {onlineUsers.filter(ou => ou.isOnline).map(({ user }) => (
                      <div key={user.id} className="flex flex-col items-center min-w-[80px]">
                          <div className="w-12 h-12 rounded-full border-2 border-green-500 overflow-hidden">
                              {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center font-bold">{user.name.substring(0,2)}</div>}
                          </div>
                          <span className="text-[10px] mt-1 truncate w-full text-center">{user.name.split(' ')[0]}</span>
                      </div>
                  ))}
              </div>
          </Card>
      </div>

      {inspectModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Confirmar Vistoria - {inspectModal.vehicleName}</h3>
                  <div className="space-y-4">
                      <Input label="Nova Data de Vistoria" type="date" value={inspectForm.newDate} onChange={e => setInspectForm(prev => ({ ...prev, newDate: e.target.value }))} />
                      <AITextArea label="Observações" value={inspectForm.comment} onChange={e => setInspectForm(prev => ({ ...prev, comment: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 mt-6">
                      <Button variant="secondary" onClick={() => setInspectModal(prev => ({ ...prev, isOpen: false }))} className="flex-1">Cancelar</Button>
                      <Button onClick={handleSaveAction} className="flex-1">Confirmar</Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};
