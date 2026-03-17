import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, signup, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-tactical-bg text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tactical-accent/10 rounded-2xl border border-tactical-accent/20 mb-4">
            <Shield className="w-8 h-8 text-tactical-accent" />
          </div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter italic">
            Mindset <span className="text-tactical-accent">War</span>
          </h1>
          <p className="text-white/50 text-sm mt-2 uppercase tracking-widest font-bold">Tactical Deployment System</p>
        </div>

        <div className="tactical-card">
          <h2 className="text-xl font-display font-bold uppercase mb-6 flex items-center gap-2">
            {isLogin ? 'Authorization Required' : 'New Recruit Registration'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Callsign (Name)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-tactical-panel border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:border-tactical-accent outline-none transition-all"
                    placeholder="Enter your callsign..."
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Secure Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-tactical-panel border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:border-tactical-accent outline-none transition-all"
                  placeholder="Enter email address..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-tactical-panel border border-white/10 rounded-lg py-3 pl-10 pr-12 focus:border-tactical-accent outline-none transition-all"
                  placeholder="Enter password..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-tactical-accent transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold uppercase tracking-tight bg-red-500/10 p-2 rounded border border-red-500/20">
                Error: {error}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-tactical-accent text-tactical-panel font-display font-black uppercase py-4 rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isLogin ? 'Initiate Login' : 'Deploy Account'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-3">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-white/20">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white/5 border border-white/10 text-white font-display font-bold uppercase py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] uppercase font-bold text-white/40 hover:text-tactical-accent transition-colors"
            >
              {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
