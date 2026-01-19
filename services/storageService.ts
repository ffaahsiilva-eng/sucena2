
import { GeneralReport, DeviationRecord, CleaningRecord, MatrixRole, DDSRecord, LogRecord, Notification, BaseRecord, OrderRecord, ReminderRecord, Announcement, AttendanceRecord, AppConfig, DDSScheduleRecord } from '../types';
import { FirebaseService } from './firebaseService';

const KEYS = {
  REPORTS: 'painelSucena_reports',
  DEVIATIONS: 'painelSucena_deviations',
  CLEANING: 'painelSucena_cleaning',
  MATRIX: 'painelSucena_matrix',
  LAST_RESET: 'painelSucena_last_month_reset',
  DDS: 'painelSucena_dds',
  DDS_SCHEDULE: 'painelSucena_dds_schedule',
  EVIDENCE: 'painelSucena_evidence', 
  SAFETY: 'painelSucena_safety',
  STOCK: 'painelSucena_stock',
  INSPECTION: 'painelSucena_inspection',
  EQUIPMENT_INSPECTION: 'painelSucena_equipment_inspections',
  LOGS: 'painelSucena_logs',
  NOTIFICATIONS: 'painelSucena_notifications',
  REMINDERS: 'painelSucena_reminders',
  JOB_TITLES: 'painelSucena_job_titles',
  ANNOUNCEMENT: 'painelSucena_global_announcement',
  RESIDUES_ATTENDANCE: 'painelSucena_residues_attendance',
  RESIDUES_TEAM: 'painelSucena_residues_team_roster',
  OPERATIONAL_ROLES: 'painelSucena_operational_roles',
  WORK_PERMITS: 'painelSucena_work_permits',
  SITE_INSPECTIONS: 'painelSucena_site_inspections',
  APP_CONFIG: 'painelSucena_app_config'
};

const getDefaultMatrix = (): MatrixRole[] => [
  {
    id: 'preposto',
    title: 'Preposto',
    iconName: 'Briefcase',
    color: 'bg-blue-600',
    tasks: [
      { id: 'p1', description: 'DDS De liderança', completed: false },
      { id: 'p2', description: 'WOC - Caminhar, Observar e Conversar', completed: false },
      { id: 'p3', description: 'Observação de tarefas', completed: false },
      { id: 'p4', description: 'Inspeção em HSE', completed: false },
      { id: 'p5', description: 'Roda de conversa', completed: false }
    ]
  },
  {
    id: 'enc_geral',
    title: 'Encarregado Geral',
    iconName: 'UserCog',
    color: 'bg-slate-800',
    tasks: [
      { id: 'eg1', description: 'DDS De liderança', completed: false },
      { id: 'eg2', description: 'WOC - Caminhar, Observar e Conversar', completed: false },
      { id: 'eg3', description: 'Observação de tarefas', completed: false },
      { id: 'eg4', description: 'Inspeção em HSE', completed: false },
      { id: 'eg5', description: 'Roda de conversa', completed: false },
      { id: 'eg6', description: 'Evento sem lesão / Condição de risco', completed: false }
    ]
  },
  {
    id: 'enc_verde',
    title: 'Encarregado (Verde)',
    iconName: 'HardHat',
    color: 'bg-green-600',
    tasks: [
      { id: 'ev1', description: 'DDS De liderança', completed: false },
      { id: 'ev2', description: 'WOC - Caminhar, Observar e Conversar', completed: false },
      { id: 'ev3', description: 'Observação de tarefas', completed: false },
      { id: 'ev4', description: 'Inspeção em HSE', completed: false },
      { id: 'ev5', description: 'Roda de conversa', completed: false },
      { id: 'ev6', description: 'Evento sem lesão / Condição de risco', completed: false }
    ]
  },
  {
    id: 'enc_azul',
    title: 'Encarregado (Azul)',
    iconName: 'HardHat',
    color: 'bg-cyan-600',
    tasks: [
      { id: 'ea1', description: 'DDS De liderança', completed: false },
      { id: 'ea2', description: 'WOC - Caminhar, Observar e Conversar', completed: false },
      { id: 'ea3', description: 'Observação de tarefas', completed: false },
      { id: 'ea4', description: 'Inspeção em HSE', completed: false },
      { id: 'ea5', description: 'Roda de conversa', completed: false },
      { id: 'ea6', description: 'Evento sem lesão / Condição de risco', completed: false }
    ]
  },
  {
    id: 'tec_seguranca',
    title: 'Técnico de Segurança',
    iconName: 'Shield',
    color: 'bg-red-600',
    tasks: [
      { id: 'ts1', description: 'DDS da Liderança', completed: false },
      { id: 'ts2', description: 'WOC - Caminhar, Observar e Conversar', completed: false },
      { id: 'ts3', description: 'Inspeção de HSE', completed: false },
      { id: 'ts4', description: 'Evento sem lesão / Condição de risco (ALTO RISCO)', completed: false },
      { id: 'ts5', description: 'Coach em HSE', completed: false },
      { id: 'ts6', description: 'Observação de Tarefa', completed: false }
    ]
  }
];

export const StorageService = {
  KEYS, 

  saveLocal: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
  getLocal: (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  get: (key: string): any => StorageService.getLocal(key),

  getGeneric: (key: string): any[] => StorageService.getLocal(key) || [],

  initSync() {
    Object.entries(KEYS).forEach(([keyName, keyPath]) => {
        FirebaseService.subscribe(keyPath, (remoteData) => {
            if (remoteData !== null) {
                this.saveLocal(keyPath, remoteData);
                window.dispatchEvent(new CustomEvent('cloud-sync-update', { 
                    detail: { key: keyPath, data: remoteData } 
                }));
            }
        });
    });
  },

  async save(key: string, data: any) {
      this.saveLocal(key, data);
      await FirebaseService.save(key, data);
  },

  async addGeneric(key: string, item: any) {
      const current = this.getLocal(key) || [];
      const updated = [item, ...current];
      await this.save(key, updated);
  },

  async deleteItem(key: string, id: string) {
      const currentData = this.getLocal(key);
      if (Array.isArray(currentData)) {
          const newData = currentData.filter((item: any) => item.id !== id);
          await this.save(key, newData);
          return newData;
      }
      return currentData || [];
  },

  async updateItem(key: string, item: any) {
      const currentData = this.getLocal(key);
      if (Array.isArray(currentData)) {
          const index = currentData.findIndex((i: any) => i.id === item.id);
          if (index !== -1) {
              currentData[index] = item;
              await this.save(key, currentData);
          }
      }
  },

  getReports: (): GeneralReport[] => StorageService.getLocal(KEYS.REPORTS) || [],
  addReport: (report: GeneralReport) => StorageService.addGeneric(KEYS.REPORTS, report),

  getDeviations: (): DeviationRecord[] => StorageService.getLocal(KEYS.DEVIATIONS) || [],
  addDeviation: (dev: DeviationRecord) => StorageService.addGeneric(KEYS.DEVIATIONS, dev),

  getCleaning: (): CleaningRecord[] => StorageService.getLocal(KEYS.CLEANING) || [],
  addCleaning: (cl: CleaningRecord) => StorageService.addGeneric(KEYS.CLEANING, cl),

  getDDS: (): DDSRecord[] => StorageService.getLocal(KEYS.DDS) || [],
  addDDS: (dds: DDSRecord) => StorageService.addGeneric(KEYS.DDS, dds),

  getDDSSchedule: (): DDSScheduleRecord[] => StorageService.getLocal(KEYS.DDS_SCHEDULE) || [],
  saveDDSSchedule: (sched: DDSScheduleRecord[]) => StorageService.save(KEYS.DDS_SCHEDULE, sched),

  getMatrix: (): MatrixRole[] => {
      const stored = StorageService.getLocal(KEYS.MATRIX);
      return stored && Array.isArray(stored) ? stored : getDefaultMatrix();
  },
  saveMatrix: (matrix: MatrixRole[]) => StorageService.save(KEYS.MATRIX, matrix),

  getAppConfig: (): AppConfig | null => StorageService.getLocal(KEYS.APP_CONFIG),
  saveAppConfig: (config: AppConfig) => StorageService.save(KEYS.APP_CONFIG, config),

  getJobTitles: (): string[] => StorageService.getLocal(KEYS.JOB_TITLES) || [],
  addJobTitle: (title: string) => {
      const titles = StorageService.getJobTitles();
      if (!titles.includes(title)) {
          const updated = [...titles, title];
          StorageService.save(KEYS.JOB_TITLES, updated);
      }
  },
  removeJobTitle: (title: string) => {
      const titles = StorageService.getJobTitles();
      const updated = titles.filter(t => t !== title);
      StorageService.save(KEYS.JOB_TITLES, updated);
  },

  getOperationalRoles: (): string[] => StorageService.getLocal(KEYS.OPERATIONAL_ROLES) || [],
  addOperationalRole: (role: string) => {
      const roles = StorageService.getOperationalRoles();
      if (!roles.includes(role)) {
          const updated = [...roles, role];
          StorageService.save(KEYS.OPERATIONAL_ROLES, updated);
      }
  },

  getAnnouncement: () => StorageService.getLocal(KEYS.ANNOUNCEMENT),
  saveAnnouncement: (ann: any) => StorageService.save(KEYS.ANNOUNCEMENT, ann),
  clearAnnouncement: () => StorageService.saveAnnouncement(null),

  getReminders: () => StorageService.getLocal(KEYS.REMINDERS) || [],
  addReminder: (rem: ReminderRecord) => StorageService.addGeneric(KEYS.REMINDERS, rem),

  addNotification: (notif: Notification) => StorageService.addGeneric(KEYS.NOTIFICATIONS, notif),

  getAttendance: () => StorageService.getLocal(KEYS.RESIDUES_ATTENDANCE) || [],
  addAttendance: (att: AttendanceRecord) => StorageService.addGeneric(KEYS.RESIDUES_ATTENDANCE, att),

  getLogs: () => StorageService.getLocal(KEYS.LOGS) || [],
  addLog: (log: LogRecord) => StorageService.addGeneric(KEYS.LOGS, log),

  getDataForDashboard: () => ({
      reports: StorageService.getReports(),
      deviations: StorageService.getDeviations(),
      cleaning: StorageService.getCleaning(),
      matrix: StorageService.getMatrix()
  })
};
