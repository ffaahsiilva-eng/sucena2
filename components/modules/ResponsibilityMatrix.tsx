
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button } from '../ui/Shared';
import { 
    Folder, 
    ArrowLeft, 
    Briefcase, 
    UserCog, 
    HardHat, 
    Shield, 
    CheckCircle2, 
    Circle,
    ChevronRight,
    Lock
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { MatrixRole, MatrixTask } from '../../types';
import { AuthService, User } from '../../services/authService';

const Icons: any = { Briefcase, UserCog, HardHat, Shield };

export const ResponsibilityMatrix: React.FC = () => {
    const [roles, setRoles] = useState<MatrixRole[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const loaded = StorageService.getMatrix();
        setRoles(loaded);
        const user = AuthService.getCurrentUser();
        setCurrentUser(user);
    }, []);

    const saveChanges = (newRoles: MatrixRole[]) => {
        setRoles(newRoles);
        StorageService.saveMatrix(newRoles);
    };

    const canEditRole = (roleId: string): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'ADMIN') return true;

        const userJob = currentUser.jobTitle;

        switch (roleId) {
            case 'preposto':
                return userJob === 'Preposto';
            case 'enc_geral':
                return userJob === 'Encarregado Geral';
            case 'enc_verde':
            case 'enc_azul':
                return userJob === 'Encarregado';
            case 'tec_seguranca':
                return userJob === 'Técnico de Segurança' || userJob === 'Téc. Segurança';
            default:
                return false;
        }
    };

    const selectedRole = useMemo(() => 
        roles.find(r => r.id === selectedRoleId), 
    [roles, selectedRoleId]);

    const handleToggleTask = (roleId: string, taskId: string) => {
        if (!canEditRole(roleId)) {
            alert("Acesso Negado: Você só pode editar a matriz de responsabilidade referente ao seu cargo.");
            return;
        }

        const newRoles = roles.map(role => {
            if (role.id !== roleId) return role;
            return {
                ...role,
                tasks: role.tasks.map(task => {
                    if (task.id !== taskId) return task;
                    return { ...task, completed: !task.completed };
                })
            };
        });
        saveChanges(newRoles);
    };

    const calculateProgress = (tasks: MatrixTask[]) => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.completed).length;
        return Math.round((completed / tasks.length) * 100);
    };

    if (selectedRole) {
        const progress = calculateProgress(selectedRole.tasks);
        const IconComponent = Icons[selectedRole.iconName];
        const isEditable = canEditRole(selectedRole.id);
        
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <Button onClick={() => setSelectedRoleId(null)} variant="secondary" className="pr-3 pl-2">
                        <ArrowLeft size={18} /> Voltar
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <IconComponent className={`w-6 h-6 ${selectedRole.color.replace('bg-', 'text-')}`} />
                            {selectedRole.title}
                        </h2>
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-sm">Gerencie as responsabilidades desta subpasta operacional.</p>
                            {!isEditable && (
                                <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                                    <Lock size={10} /> Somente Leitura
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1 h-fit">
                        <div className="flex flex-col items-center p-4">
                            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 ${selectedRole.color} text-white shadow-xl rotate-3`}>
                                <IconComponent size={48} />
                            </div>
                            <span className="text-4xl font-black text-slate-900">{progress}%</span>
                            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Conclusão da Função</span>
                            
                            <div className="w-full bg-slate-100 rounded-full h-4 mt-6 overflow-hidden border border-slate-200">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${selectedRole.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            
                            <div className="mt-8 w-full">
                                <div className={`p-4 rounded-xl text-center border-2 ${progress === 100 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                    <p className="text-xs uppercase font-black mb-1">Status Operacional</p>
                                    <p className="font-bold">{progress === 100 ? 'TOTALMENTE CUMPRIDO' : 'EM PROCESSAMENTO'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="md:col-span-2">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Lista de Responsabilidades</h3>
                             <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                 {selectedRole.tasks.filter(t => t.completed).length} de {selectedRole.tasks.length} itens
                             </span>
                        </div>
                        
                        <div className="space-y-3">
                            {selectedRole.tasks.map((task) => (
                                <div 
                                    key={task.id}
                                    onClick={() => handleToggleTask(selectedRole.id, task.id)}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl border-2 transition-all group
                                        ${isEditable 
                                            ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50 bg-white' 
                                            : 'cursor-not-allowed bg-slate-50 border-slate-200 opacity-60'}
                                        ${task.completed ? 'border-green-100 bg-green-50/30' : 'border-slate-100'}
                                    `}
                                >
                                    <div className={`shrink-0 transition-all duration-300 ${
                                        task.completed 
                                            ? 'text-green-600 scale-110' 
                                            : (isEditable ? 'text-slate-300 group-hover:text-slate-400' : 'text-slate-200')
                                    }`}>
                                        {task.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold text-base transition-colors ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                            {task.description}
                                        </p>
                                    </div>
                                    {isEditable && !task.completed && (
                                        <ChevronRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Matriz de Responsabilidades</h3>
                    <p className="text-slate-500 font-medium">Divisão operacional por subpastas de conclusão.</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl">
                    <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest leading-none mb-1">Aviso do Sistema</p>
                    <p className="text-xs text-orange-700 font-bold">Zera automaticamente no dia 01/Mês</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => {
                    const progress = calculateProgress(role.tasks);
                    const IconComponent = Icons[role.iconName];
                    const isEditable = canEditRole(role.id);
                    
                    return (
                        <div 
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`
                                bg-white rounded-2xl shadow-sm border-2 p-6 cursor-pointer transition-all group relative overflow-hidden flex flex-col
                                ${isEditable ? 'border-slate-100 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1' : 'border-slate-100 grayscale opacity-80'}
                            `}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full ${role.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                            
                            <div className="flex items-start justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${role.color} text-white shadow-lg shadow-black/10`}>
                                    <IconComponent size={28} />
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black text-slate-900 leading-none">{progress}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Concluído</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-xl font-black text-slate-800 mb-1 group-hover:text-slate-900 transition-colors">
                                    {role.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    <Folder size={12} className="text-slate-400" /> 
                                    {role.tasks.length} Responsabilidades
                                </div>
                            </div>

                            <div className="mt-8 space-y-2">
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${role.color}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {isEditable ? 'Toque para preencher' : 'Somente visualização'}
                                    </span>
                                    {isEditable ? (
                                        <div className="bg-slate-100 p-1 rounded-lg group-hover:bg-slate-200 transition-colors">
                                            <ChevronRight size={14} className="text-slate-600" />
                                        </div>
                                    ) : (
                                        <Lock size={12} className="text-slate-300" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
