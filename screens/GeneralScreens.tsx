import React from 'react';
import {
  FileText, CheckCircle, Download, Book, ExternalLink,
  MessageSquare, User, Mail, Award, Briefcase, GraduationCap
} from 'lucide-react';

// EditaisScreen removed - moved to separate file

// ProgressScreen removed - moved to separate file

// CurriculumScreen removed - moved to separate file


// --- Library/Materials Screen ---
export const LibraryScreen: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium border-b border-premium-border dark:border-stone-700 pb-4">Biblioteca & Apostilas</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-card dark:shadow-none border border-premium-border dark:border-stone-700 transition-colors">
          <h3 className="font-serif text-xl text-gray-800 dark:text-gray-100 mb-6 font-medium">Apostilas do Curso</h3>
          <div className="space-y-4">
            {['Módulo 1: Estrutura do Projeto', 'Módulo 2: Escrita Acadêmica'].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface dark:bg-dark-surface hover:bg-[#ece8e5] dark:hover:bg-stone-600 flex justify-between items-center transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <Book className="text-secondary dark:text-primary mr-3 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item}</span>
                </div>
                <Download size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-secondary dark:group-hover:text-primary" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-card dark:shadow-none border border-premium-border dark:border-stone-700 transition-colors">
          <h3 className="font-serif text-xl text-gray-800 dark:text-gray-100 mb-6 font-medium">Leituras Recomendadas</h3>
          <div className="space-y-4">
            {['Artigo: Metodologia Qualitativa (Minayo)', 'Guia ABNT 2023'].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface dark:bg-dark-surface hover:bg-[#ece8e5] dark:hover:bg-stone-600 flex justify-between items-center transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <FileText className="text-gray-500 dark:text-gray-400 mr-3 group-hover:text-secondary dark:group-hover:text-primary transition-colors" size={20} />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item}</span>
                </div>
                <ExternalLink size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-secondary dark:group-hover:text-primary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};




