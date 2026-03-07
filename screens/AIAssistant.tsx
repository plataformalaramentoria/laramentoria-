import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, Loader2, BookOpen, FileSearch, MessageSquare,
  Plus, MessageCircle, Trash2, Menu, X
} from 'lucide-react';
import { sendMessageToAI } from '../services/geminiService';
import { ConfirmModal } from '../components/ConfirmModal';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const DEFAULT_WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'ai',
  content: 'Olá! Sou a LARA, sua assistente acadêmica. Posso ajudar com revisão de textos, análise de editais ou simulação de bancas. Como posso auxiliar seus estudos hoje?'
};

export const AIAssistant: React.FC = () => {
  // --- State ---
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('lara_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile/Desktop toggle

  // Modals
  const [deleteData, setDeleteData] = useState<{ isOpen: boolean, chatId: string | null }>({ isOpen: false, chatId: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Derived State ---
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat ? currentChat.messages : [DEFAULT_WELCOME_MSG];

  // --- Effects ---

  // Persistence
  useEffect(() => {
    localStorage.setItem('lara_chats', JSON.stringify(chats));
  }, [chats]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentChatId]);

  // If no chats, or valid current ID not found, maybe reset? 
  // Actually, if no chats, we just show welcome state.

  // --- Actions ---

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [DEFAULT_WELCOME_MSG],
      updatedAt: Date.now()
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteChat = () => {
    if (deleteData.chatId) {
      const newChats = chats.filter(c => c.id !== deleteData.chatId);
      setChats(newChats);

      if (currentChatId === deleteData.chatId) {
        setCurrentChatId(newChats.length > 0 ? newChats[0].id : null);
      }
    }
    setDeleteData({ isOpen: false, chatId: null });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input;
    setInput('');
    setIsLoading(true);

    // If no chat selected, create one implicitly
    let activeChatId = currentChatId;
    let newChats = [...chats];

    if (!activeChatId) {
      const newChat: ChatSession = {
        id: Date.now().toString(),
        title: userContent.slice(0, 30) + (userContent.length > 30 ? '...' : ''), // Auto title
        messages: [DEFAULT_WELCOME_MSG],
        updatedAt: Date.now()
      };
      newChats = [newChat, ...chats]; // Prepend
      activeChatId = newChat.id;
    } else {
      // Update existing chat order
      const chatIndex = newChats.findIndex(c => c.id === activeChatId);
      if (chatIndex > -1) {
        const updatedChat = { ...newChats[chatIndex], updatedAt: Date.now() };
        // Rename if generic title
        if (updatedChat.title === 'Nova Conversa') {
          updatedChat.title = userContent.slice(0, 30) + (userContent.length > 30 ? '...' : '');
        }
        newChats.splice(chatIndex, 1);
        newChats.unshift(updatedChat);
      }
    }

    // Add User Message
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userContent };

    // Update State Optimistically
    const chatIndex = newChats.findIndex(c => c.id === activeChatId);
    if (chatIndex !== -1) {
      newChats[chatIndex].messages.push(userMessage);
    }
    setChats(newChats);
    setCurrentChatId(activeChatId);

    // Call API
    try {
      const history = newChats[chatIndex].messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })) as any[];

      const aiResponseText = await sendMessageToAI(userContent, history);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponseText
      };

      // Update with AI response
      const finalsChats = [...newChats]; // Re-clone to trigger render
      finalsChats[0].messages.push(aiMessage); // Moved to top so index 0
      setChats(finalsChats);
    } catch (error) {
      console.error("Erro na IA", error);
      // Error handling visual could be added here
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { label: "Revisar texto", prompt: "Pode revisar este trecho quanto à clareza e tom acadêmico?", icon: BookOpen },
    { label: "Analisar Edital", prompt: "Quais documentos são obrigatórios neste edital?", icon: FileSearch },
    { label: "Simular Banca", prompt: "Faça uma pergunta sobre minha metodologia.", icon: MessageSquare },
  ];

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-card dark:shadow-none overflow-hidden animate-fade-in relative">

      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white dark:bg-dark-card rounded-lg shadow-md border border-gray-100"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* --- Sidebar History --- */}
      <div className={`
         absolute md:static inset-y-0 left-0 w-72 bg-surface dark:bg-dark-surface border-r border-gray-100 dark:border-stone-700 z-10 transition-transform duration-300
         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}
      `}>
        <div className="p-4 h-full flex flex-col">
          <button
            onClick={createNewChat}
            className="w-full bg-secondary dark:bg-primary text-white dark:text-stone-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-6 hover:brightness-110 transition-all shadow-md"
          >
            <Plus size={18} /> Nova Conversa
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {chats.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>Nenhuma conversa salva.</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => { setCurrentChatId(chat.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                  className={`
                             group p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all
                             ${currentChatId === chat.id
                      ? 'bg-white dark:bg-dark-card shadow-sm border border-gray-100 dark:border-stone-700 text-secondary dark:text-primary font-bold'
                      : 'hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-600 dark:text-gray-400'}
                          `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageCircle size={18} className="shrink-0" />
                    <span className="truncate text-sm">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteData({ isOpen: true, chatId: chat.id }); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col bg-white dark:bg-dark-card relative">

        {/* Header */}
        <div className="p-4 bg-white/80 dark:bg-dark-card/90 border-b border-gray-100 dark:border-stone-700 backdrop-blur-sm z-10 flex justify-center md:justify-start pl-16 md:pl-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-secondary dark:bg-primary rounded-lg flex items-center justify-center text-white dark:text-stone-900 mr-3">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-gray-800 dark:text-gray-100 text-lg">LARA.IA</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Assistente Acadêmica</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
              <div className={`
                         max-w-[85%] md:max-w-[75%] p-5 rounded-2xl text-sm leading-relaxed shadow-sm
                         ${msg.role === 'user'
                  ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-tr-none'
                  : 'bg-surface dark:bg-dark-surface text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-stone-700'
                }
                      `}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2 opacity-50">
                    <Sparkles size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Lara</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-surface dark:bg-dark-surface p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-stone-700 flex items-center gap-3">
                <Loader2 className="animate-spin text-secondary dark:text-primary" size={18} />
                <span className="text-sm text-gray-500 font-medium">Lara está digitando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-stone-700">
          {/* Suggestions (only for empty/new chats) */}
          {messages.length <= 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.prompt)}
                  className="flex items-center px-4 py-2 bg-surface dark:bg-dark-surface hover:bg-[#ece8e5] dark:hover:bg-stone-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 dark:border-stone-600 transition-colors whitespace-nowrap"
                >
                  <s.icon size={14} className="mr-2 text-secondary dark:text-primary" />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite sua dúvida aqui..."
              className="w-full bg-surface dark:bg-dark-surface border-none rounded-xl pl-4 pr-14 py-4 focus:ring-2 focus:ring-[#cdbaa6]/30 outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 resize-none min-h-[60px] max-h-[150px]"
              style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2.5 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-300 dark:text-stone-700 mt-3">
            A IA pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteData.isOpen}
        title="Excluir Conversa?"
        message="Tem certeza que deseja excluir todo o histórico desta conversa? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={deleteChat}
        onCancel={() => setDeleteData({ isOpen: false, chatId: null })}
      />
    </div>
  );
};

export default AIAssistant;