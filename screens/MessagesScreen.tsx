import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, User, Search, Send, Check, CheckCheck, MoreVertical,
    Phone, Video, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Message, User as UserType } from '../types';

// --- Types & Mock Data ---

// Mock Users for Professor View
const MOCK_STUDENTS: any[] = [];
const INITIAL_MESSAGES: Message[] = [];

export const MessagesScreen: React.FC = () => {
    const { role, session } = useAuth(); // session.user.id would be the ideal ID source
    const isProfessor = role === 'PROFESSOR';
    const currentUserId = isProfessor ? 'professor' : 'student-1'; // Mock ID

    // --- State ---
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem('messages_data');
        return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    });

    const [inputText, setInputText] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(isProfessor ? null : 'professor'); // Student always chats with professor
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Persistence ---
    useEffect(() => {
        localStorage.setItem('messages_data', JSON.stringify(messages));
    }, [messages]);

    // --- Effects ---
    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, selectedStudentId]);

    // Mark as read when opening chat (Mock logic)
    useEffect(() => {
        if (selectedStudentId) {
            // In a real app, send API request to mark as read
            // Here we just update local state visually if needed, but for simplicity we keep it static
        }
    }, [selectedStudentId]);


    // --- Actions ---

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: currentUserId,
            receiverId: isProfessor ? (selectedStudentId || 'student-1') : 'professor',
            content: inputText,
            timestamp: new Date().toISOString(),
            read: false
        };

        setMessages([...messages, newMessage]);
        setInputText('');
    };

    const getFilteredMessages = () => {
        if (isProfessor) {
            if (!selectedStudentId) return [];
            return messages.filter(m =>
                (m.senderId === 'professor' && m.receiverId === selectedStudentId) ||
                (m.senderId === selectedStudentId && m.receiverId === 'professor')
            );
        } else {
            // Student sees own chat with professor
            return messages.filter(m =>
                (m.senderId === currentUserId && m.receiverId === 'professor') ||
                (m.senderId === 'professor' && m.receiverId === currentUserId)
            );
        }
    };

    const currentMessages = getFilteredMessages();

    // --- Render ---

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-none border border-premium-border dark:border-stone-700 overflow-hidden animate-fade-in flex">

            {/* --- Sidebar (Professor Only) --- */}
            {isProfessor && (
                <div className="w-80 border-r border-gray-100 dark:border-stone-700 flex flex-col bg-white dark:bg-dark-card/50">
                    <div className="p-4 border-b border-gray-100 dark:border-stone-700">
                        <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-4">Conversas</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar aluno..."
                                className="w-full bg-surface dark:bg-dark-surface pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#cdbaa6]/50 transition-all border border-transparent focus:border-[#cdbaa6]"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {MOCK_STUDENTS.map(student => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`p-4 hover:bg-surface dark:hover:bg-dark-surface cursor-pointer border-b border-gray-50 dark:border-stone-800 transition-colors ${selectedStudentId === student.id ? 'bg-surface dark:bg-dark-surface' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{student.name}</h3>
                                    <span className="text-[10px] text-gray-400 font-medium">{student.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 flex-1 mr-2">{student.lastMessage}</p>
                                    {student.unread > 0 && (
                                        <span className="bg-secondary dark:bg-primary text-white dark:text-stone-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {student.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- Chat Window --- */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0c0a09]">
                {/* Chat Header */}
                <div className="p-4 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-stone-700 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#cdbaa6] text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {isProfessor
                                ? (MOCK_STUDENTS.find(s => s.id === selectedStudentId)?.avatar || 'AL')
                                : 'PM'
                            }
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">
                                {isProfessor
                                    ? (MOCK_STUDENTS.find(s => s.id === selectedStudentId)?.name || 'Selecione um aluno')
                                    : 'Profa. Mariana'}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <button className="p-2 hover:bg-surface dark:hover:bg-dark-surface rounded-full transition-colors"><Info size={20} /></button>
                    </div>
                </div>

                {/* Messages Area */}
                {(!isProfessor || selectedStudentId) ? (
                    <>
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
                            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundOpacity: 0.1 }}
                        >
                            {/* Date Separator Mock */}
                            <div className="flex justify-center my-4">
                                <span className="bg-white/80 dark:bg-stone-800/80 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest backdrop-blur-sm shadow-sm">Hoje</span>
                            </div>

                            {currentMessages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUserId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                                        <div className={`
                                max-w-[80%] md:max-w-[60%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group
                                ${isMe
                                                ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-tr-none'
                                                : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-stone-700'
                                            }
                             `}>
                                            <p>{msg.content}</p>
                                            <div className={`text-[10px] mt-1 flex justify-end items-center gap-1 opacity-70 font-medium`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && (
                                                    <span title={msg.read ? "Lida" : "Enviada"}>
                                                        {msg.read ? <CheckCheck size={14} /> : <Check size={14} />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-stone-700">
                            <form
                                onSubmit={handleSendMessage}
                                className="flex items-center gap-3 bg-surface dark:bg-dark-surface p-2 rounded-2xl border border-transparent focus-within:border-[#cdbaa6] focus-within:ring-2 focus-within:ring-[#cdbaa6]/20 transition-all"
                            >
                                <button type="button" className="p-2 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Escreva sua mensagem..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="p-3 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    <Send size={18} fill="currentColor" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 bg-slate-50 dark:bg-[#0c0a09]">
                        <MessageSquare size={64} className="mb-4 opacity-20" />
                        <p className="font-medium">Selecione uma conversa para iniciar</p>
                    </div>
                )}
            </div>
        </div>
    );
};
