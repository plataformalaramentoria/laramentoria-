import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Falha no login. Verifique suas credenciais.');
      setIsLoading(false);
    }
    // If success, App component will re-render automatically due to session change
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle,_#FFFFFF_0%,_#F0EEE9_100%)] dark:bg-[radial-gradient(circle_at_center,_#292524_0%,_#0c0a09_100%)] transition-all duration-500 ease-in-out p-6">
      <div className="bg-white dark:bg-dark-card w-full max-w-md p-12 md:p-[60px] rounded-[24px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] dark:shadow-dark-soft border border-[#E6DCCA] dark:border-stone-700 relative overflow-hidden transition-all duration-300">

        {/* Subtle decorative gradient top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E6DCCA] to-transparent opacity-50"></div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-secondary dark:text-primary font-medium mb-3">Plataforma</h1>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#Cca47c] dark:text-[#8e7d6f] font-bold">Lara Lopes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[50px] px-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-300 dark:border-stone-600 focus:border-secondary dark:focus:border-primary focus:outline-none transition-all text-gray-700 dark:text-gray-200 placeholder-gray-300"
              placeholder="estudante@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[50px] px-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-300 dark:border-stone-600 focus:border-secondary dark:focus:border-primary focus:outline-none transition-all text-gray-700 dark:text-gray-200 placeholder-gray-300"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-xs text-center font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full bg-secondary dark:bg-secondary/90 text-white font-medium h-[50px] rounded-xl hover:bg-[#6b5d52] dark:hover:bg-[#5c5148] hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-secondary/20 flex items-center justify-center uppercase tracking-[0.15em] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Acessar Plataforma</span>
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform opacity-70" />
              </>
            )}
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;