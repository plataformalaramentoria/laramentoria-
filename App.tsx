import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Projects from './screens/Projects';
import LanguageExam from './screens/LanguageExam';
import { WorkbookScreen } from './screens/WorkbookScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import ForcePasswordChangeScreen from './screens/ForcePasswordChangeScreen';

import { AdminPanel as ProfessorPanel } from './screens/ProfessorPanel';
import AIAssistant from './screens/AIAssistant';
import { ProgressScreen } from './screens/ProgressScreen';
import { EditaisScreen } from './screens/EditaisScreen';
import { CurriculumScreen } from './screens/CurriculumScreen';
import { CoursesScreen } from './screens/CoursesScreen';
import { ViewState } from './types';
import { PanelLeftOpen, MessageSquare } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { session, role, accessType, loading, forcePasswordChange, signOut } = useAuth();
  
  // Restore currentView from localStorage, fallback to DASHBOARD
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('lara_current_view');
    const view = (saved as ViewState) || 'DASHBOARD';
    // If restricted student, must start on COURSES
    if (role === 'STUDENT' && accessType === 'RESTRICTED') return 'COURSES';
    return view;
  });

  // Keep restricted students on allowed views
  useEffect(() => {
    if (role === 'STUDENT' && accessType === 'RESTRICTED') {
      if (!['COURSES', 'PROFILE'].includes(currentView)) {
        setCurrentView('COURSES');
      }
    }
  }, [currentView, role, accessType]);
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State for Desktop Sidebar (Focus Mode)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Sync currentView changes to localStorage
  useEffect(() => {
    localStorage.setItem('lara_current_view', currentView);
  }, [currentView]);

  if (loading) {
    return (
      <div className="h-screen bg-[#FDFBF7] dark:bg-[#0c0a09] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary/20 dark:border-primary/20 border-t-secondary dark:border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="font-serif text-secondary dark:text-primary font-medium opacity-80 animate-pulse">Autenticando...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (forcePasswordChange) {
    return <ForcePasswordChangeScreen />;
  }

  const renderContent = () => {
    switch (currentView) {
      // Pass toggle props to Dashboard as requested
      case 'DASHBOARD': return <Dashboard onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />;
      case 'PROJECTS': return <Projects />;
      case 'LANGUAGE': return <LanguageExam />;
      case 'AI': return <AIAssistant />;
      case 'EDITAIS': return <EditaisScreen />;
      case 'PROGRESS': return <ProgressScreen />;
      case 'CURRICULUM': return <CurriculumScreen />;
      case 'MESSAGES': return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
              <div className="w-20 h-20 bg-surface dark:bg-dark-surface rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={32} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-3">Módulo Indisponível</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">A aba de Mensagens foi temporariamente desativada para manutenção e não se encontra em funcionamento neste momento.</p>
          </div>
      );
      case 'PROFILE': return <ProfileScreen />;
      case 'WORKBOOK': return <WorkbookScreen />;
      case 'COURSES': return <CoursesScreen />;
      case 'PROFESSOR_PANEL': return role === 'STUDENT' ? (accessType === 'RESTRICTED' ? <CoursesScreen /> : <Dashboard onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />) : <ProfessorPanel onNavigate={setCurrentView} />;
      default: return accessType === 'RESTRICTED' ? <CoursesScreen /> : <Dashboard onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#FDFBF7] dark:bg-[#0c0a09] transition-all duration-500 ease-in-out overflow-hidden font-sans text-slate-700 dark:text-gray-200">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        role={role || 'STUDENT'}
        onLogout={signOut}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen} // Pass controlled state
        onToggle={toggleSidebar} // Pass toggle function
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300 ease-in-out">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-dark-card border-b border-[#cdbaa6]/20 p-4 flex items-center justify-between transition-colors duration-300">
          <span className="font-serif font-semibold text-secondary dark:text-primary transition-colors">Plataforma Lara Lopes</span>
          <button onClick={() => setIsMobileOpen(true)} className="text-secondary dark:text-primary p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

        {/* 
          Global Fallback Trigger 
          Visible ONLY if sidebar is closed AND we are NOT on Dashboard 
          (since Dashboard has its own inline trigger) 
        */}
        {!isSidebarOpen && currentView !== 'DASHBOARD' && (
          <button
            onClick={toggleSidebar}
            className={`absolute top-6 left-6 z-40 p-2.5 rounded-full bg-white dark:bg-dark-card shadow-card border border-premium-border dark:border-stone-700 text-secondary hover:scale-105 transition-all hidden md:flex animate-fade-in ${accessType === 'RESTRICTED' ? 'md:hidden' : ''}`}
            title="Abrir Menu"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;