import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  BookOpen,
  GraduationCap,
  Languages,
  Bot,
  UserCircle,
  X,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  MonitorPlay,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ViewState, Role } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  role: Role;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isOpen?: boolean; // Controlled state from parent
  onToggle?: () => void; // Function to toggle state
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  role,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  isDarkMode,
  toggleTheme,
  isOpen = true,
  onToggle
}) => {
  const { accessType } = useAuth();

  const allItems = [
    { id: 'DASHBOARD', label: 'Início', icon: LayoutDashboard },
    { id: 'PROGRESS', label: 'Meu Progresso', icon: TrendingUp },
    { id: 'EDITAIS', label: 'Editais', icon: FileText },
    { id: 'PROJECTS', label: 'Projetos de Pesquisa', icon: BookOpen },
    { id: 'CURRICULUM', label: 'Meu Currículo', icon: GraduationCap },
    { id: 'LANGUAGE', label: 'Prova de Língua', icon: Languages },
    { id: 'WORKBOOK', label: 'Apostilas', icon: BookOpen },
    { id: 'COURSES', label: 'Cursos', icon: MonitorPlay },
    { id: 'AI', label: 'Lara.IA', icon: Bot },
    { id: 'PROFILE', label: 'Perfil', icon: UserCircle },
  ];

  // Filter items based on access type
  const menuItems = allItems.filter(item => {
    if (role === 'ADMIN' || role === 'PROFESSOR') return true;
    if (accessType === 'RESTRICTED') {
        return ['COURSES', 'PROFILE'].includes(item.id);
    }
    return true;
  });

  if (role === 'PROFESSOR' || role === 'ADMIN') {
    menuItems.push({ id: 'PROFESSOR_PANEL', label: 'Painel de Administração', icon: Shield });
  }

  const handleNav = (id: string) => {
    onChangeView(id as ViewState);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#8e7d6f]/20 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 
        SIDEBAR CONTAINER 
        Controlled by 'isOpen' prop for width (Focus Mode)
      */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          bg-white dark:bg-dark-card shadow-card dark:shadow-dark-soft
          flex flex-col border-r border-premium-border dark:border-stone-700
          transition-all duration-300 ease-in-out overflow-hidden
          /* Mobile Visibility */
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          /* Desktop Focus Mode (Width Control) */
          ${isOpen ? 'md:w-72 md:opacity-100' : 'md:w-0 md:opacity-0 md:border-r-0'}
        `}
      >
        {/* Header */}
        <div className="h-24 flex items-center justify-between px-6 mb-2 min-w-[18rem]">
          <div className="flex flex-col whitespace-nowrap">
            <span className="font-serif font-semibold text-2xl text-secondary dark:text-primary tracking-tight">
              Plataforma
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#cdbaa6] font-bold mt-1">
              Lara Lopes
            </span>
          </div>

          {/* Close Sidebar Button (Desktop) - Optional internal trigger */}
          <button
            onClick={onToggle}
            className="p-2 rounded-full hover:bg-surface dark:hover:bg-dark-surface text-secondary/70 dark:text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors hidden md:block"
            title="Recolher Menu (Modo Foco)"
          >
            <PanelLeftClose size={20} />
          </button>

          {/* Close Sidebar Button (Mobile) */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-secondary dark:text-primary"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-3 scrollbar-thin min-w-[18rem]">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`
                  w-full flex items-center px-4 py-3.5 transition-all duration-300 rounded-xl group whitespace-nowrap
                  ${isActive
                    ? 'bg-secondary text-white shadow-md dark:bg-primary dark:text-stone-900 font-semibold'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-surface dark:hover:bg-dark-surface hover:text-secondary dark:hover:text-primary'
                  }
                `}
              >
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={`transition-colors shrink-0 ${isActive ? 'text-white dark:text-stone-900' : 'text-gray-400 dark:text-gray-500 group-hover:text-secondary dark:group-hover:text-primary'}`}
                />
                <span className="ml-3 text-[15px] tracking-wide">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 mt-2 space-y-2 min-w-[18rem]">
          <button
            onClick={toggleTheme}
            className="flex items-center w-full px-4 py-3 rounded-xl text-gray-400 dark:text-gray-500 hover:text-secondary dark:hover:text-primary hover:bg-surface dark:hover:bg-dark-surface transition-all duration-300 group whitespace-nowrap"
            title="Alternar Tema"
          >
            {isDarkMode ? <Sun size={20} strokeWidth={1.5} className="group-hover:stroke-2 shrink-0" /> : <Moon size={20} strokeWidth={1.5} className="group-hover:stroke-2 shrink-0" />}
            <span className="ml-3 text-sm font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-3 rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 group whitespace-nowrap"
          >
            <LogOut size={20} strokeWidth={1.5} className="group-hover:stroke-2 shrink-0" />
            <span className="ml-3 text-sm font-medium">Encerrar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;