/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Timer, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Shield, 
  Moon, 
  Sun, 
  Settings, 
  Calendar,
  Play,
  Pause,
  RotateCcw,
  X,
  Brain,
  Skull,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebaseUtils';

// --- Types ---
interface WarTask {
  id: string;
  title: string;
  completed: boolean;
  category: string;
}

interface RoutineBlock {
  id: string;
  title: string;
  items: { id: string; label: string; done: boolean }[];
  isOpen: boolean;
}

// --- Constants ---
const SUGGESTIONS = {
  Study: ["2 pomodoro deep research", "45m language practice", "Review technical docs"],
  Money: ["30m client outreach", "Review P&L statement", "Update portfolio"],
  Skill: ["45m copywriting practice", "Code 1 feature", "Design 1 UI screen"],
  Body: ["20m HIIT session", "Mobility routine", "Heavy lifting session"],
  Mind: ["10m meditation", "Journaling session", "Reading 10 pages"],
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'today' | 'week' | 'rules' | 'settings'>('today');
  const [date] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
  const [warTasks, setWarTasks] = useState<WarTask[]>([
    { id: '1', title: '', completed: false, category: 'General' },
    { id: '2', title: '', completed: false, category: 'General' },
    { id: '3', title: '', completed: false, category: 'General' },
  ]);
  
  const [blocks, setBlocks] = useState<RoutineBlock[]>([
    { 
      id: 'command', 
      title: 'Command Block (Morning)', 
      isOpen: true,
      items: [
        { id: 'c1', label: 'Wake on time', done: false },
        { id: 'c2', label: 'No phone first 30 mins', done: false },
        { id: 'c3', label: 'Morning ritual', done: false },
      ]
    },
    { 
      id: 'battle', 
      title: 'Battle Block (Deep Work)', 
      isOpen: false,
      items: [
        { id: 'b1', label: 'Deep work session', done: false },
      ]
    },
    { 
      id: 'recovery', 
      title: 'Recovery Block (Night)', 
      isOpen: false,
      items: [
        { id: 'r1', label: 'Movement/Workout', done: false },
        { id: 'r2', label: 'Shutdown routine', done: false },
        { id: 'r3', label: 'Sleep prep', done: false },
      ]
    },
  ]);

  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [enemyNote, setEnemyNote] = useState('');
  const [winner, setWinner] = useState<'war' | 'enemy' | null>(null);
  const [history, setHistory] = useState<Record<string, { score: number, winner: string }>>({});

  // Coach State
  const [userType, setUserType] = useState('student');
  const [longTermGoals, setLongTermGoals] = useState('');
  const [focusArea, setFocusArea] = useState('Skill');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { user, loading, logout } = useAuth();

  const workerRef = useRef<Worker | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const warScore = warTasks.filter(t => t.completed).length;

  // Persistence Logic
  useEffect(() => {
    if (!user) {
      // Clear state on logout
      setWarTasks([
        { id: '1', title: '', completed: false, category: 'General' },
        { id: '2', title: '', completed: false, category: 'General' },
        { id: '3', title: '', completed: false, category: 'General' },
      ]);
      setBlocks([]);
      setEnemyNote('');
      setWinner(null);
      setHistory({});
      return;
    }

    const path = `userProgress/${user.id}`;
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.warTasks) setWarTasks(data.warTasks);
        if (data.blocks) setBlocks(data.blocks);
        if (data.enemyNote) setEnemyNote(data.enemyNote);
        if (data.winner) setWinner(data.winner);
        if (data.history) setHistory(data.history);
      } else {
        // Initialize for new user
        setWarTasks([
          { id: '1', title: '', completed: false, category: 'General' },
          { id: '2', title: '', completed: false, category: 'General' },
          { id: '3', title: '', completed: false, category: 'General' },
        ]);
        setBlocks([
          { 
            id: 'command', 
            title: 'Command Block (Morning)', 
            isOpen: true,
            items: [
              { id: 'c1', label: 'Wake on time', done: false },
              { id: 'c2', label: 'No phone first 30 mins', done: false },
              { id: 'c3', label: 'Morning ritual', done: false },
            ]
          },
          { 
            id: 'battle', 
            title: 'Battle Block (Deep Work)', 
            isOpen: false,
            items: [
              { id: 'b1', label: 'Deep work session', done: false },
            ]
          },
          { 
            id: 'recovery', 
            title: 'Recovery Block (Night)', 
            isOpen: false,
            items: [
              { id: 'r1', label: 'Movement/Workout', done: false },
              { id: 'r2', label: 'Shutdown routine', done: false },
              { id: 'r3', label: 'Sleep prep', done: false },
            ]
          },
        ]);
        setEnemyNote('');
        setWinner(null);
        setHistory({});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    // Timer specific loading
    const savedTarget = localStorage.getItem(`war_timer_target_${user.id}`);
    const savedTaskId = localStorage.getItem(`war_timer_task_id_${user.id}`);
    if (savedTarget && savedTaskId) {
      const target = parseInt(savedTarget);
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (remaining > 0) {
        setTargetTime(target);
        setActiveTimerTask(savedTaskId);
        setIsTimerRunning(true);
        setTimeLeft(remaining);
      }
    }

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const dataToSave = {
      warTasks,
      blocks,
      enemyNote,
      winner,
      history,
      updatedAt: serverTimestamp()
    };
    
    // Save to localStorage (user-specific key)
    localStorage.setItem(`mindset_war_data_${user.id}`, JSON.stringify(dataToSave));

    // Save to Firestore
    const syncWithFirestore = async () => {
      const path = `userProgress/${user.id}`;
      try {
        await setDoc(doc(db, path), dataToSave, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    };

    const timeoutId = setTimeout(syncWithFirestore, 1000); // Debounce sync
    return () => clearTimeout(timeoutId);
  }, [warTasks, blocks, enemyNote, winner, history, user]);

  // Timer persistence
  useEffect(() => {
    if (!user) return;
    if (isTimerRunning && activeTimerTask) {
      localStorage.setItem(`war_timer_target_${user.id}`, targetTime.toString());
      localStorage.setItem(`war_timer_task_id_${user.id}`, activeTimerTask);
    } else {
      localStorage.removeItem(`war_timer_target_${user.id}`);
      localStorage.removeItem(`war_timer_task_id_${user.id}`);
    }
  }, [isTimerRunning, targetTime, activeTimerTask, user]);

  // Handle Day Reset / History Update
  useEffect(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    if (winner && !history[todayKey]) {
      setHistory(prev => ({
        ...prev,
        [todayKey]: { score: warScore, winner: winner }
      }));
    }
  }, [winner, warScore]);

  // Auto-resize textareas when tasks change
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  }, [warTasks]);

  // Timer Logic
  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('./timerWorker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = () => {
      if (isTimerRunning && targetTime) {
        const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining > 0) {
          document.title = `(${formatTime(remaining)}) War Day Planner`;
        } else {
          document.title = 'War Day Planner';
          setIsTimerRunning(false);
          setTargetTime(null);
          localStorage.removeItem('war_timer_target');
          localStorage.removeItem('war_timer_task_id');
          document.title = 'MISSION COMPLETE! - War Day Planner';
          workerRef.current?.postMessage('stop');
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
      document.title = 'War Day Planner';
    };
  }, [isTimerRunning, targetTime]);

  // Handle Worker Start/Stop
  useEffect(() => {
    if (isTimerRunning) {
      workerRef.current?.postMessage('start');
    } else {
      workerRef.current?.postMessage('stop');
    }
  }, [isTimerRunning]);

  const startTimer = (seconds: number) => {
    const target = Date.now() + seconds * 1000;
    setTargetTime(target);
    setTimeLeft(seconds);
    setIsTimerRunning(true);
    localStorage.setItem('war_timer_target', target.toString());
    if (activeTimerTask) localStorage.setItem('war_timer_task_id', activeTimerTask);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    setTargetTime(null);
    localStorage.removeItem('war_timer_target');
  };

  const toggleTask = (id: string) => {
    setWarTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const updateTaskTitle = (id: string, title: string) => {
    setWarTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  };

  const getCoachSuggestion = async () => {
    setIsSuggesting(true);
    try {
      const response = await fetch('/api/suggest-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: userType,
          goals: longTermGoals,
          focus_area: focusArea,
          energy_level: energyLevel,
          existing_tasks: warTasks.map(t => t.title).filter(Boolean).join(', ')
        })
      });
      const data = await response.json();
      if (data.suggestion) {
        const taskText = data.suggestion.replace(/^TASK:\s*/i, '').trim();
        const emptyTaskIdx = warTasks.findIndex(t => !t.title);
        if (emptyTaskIdx !== -1) {
          updateTaskTitle(warTasks[emptyTaskIdx].id, taskText);
        } else {
          updateTaskTitle(warTasks[0].id, taskText);
        }
        setShowCoachModal(false);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to get suggestion. Check server logs.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleBlockItem = (blockId: string, itemId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? {
      ...b,
      items: b.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    } : b));
  };

  const renderToday = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-sm font-display font-bold uppercase tracking-widest text-tactical-panel/50">Mission Date</h2>
          <p className="text-xl font-display font-bold">{date}</p>
          <p className="text-[10px] uppercase font-black text-tactical-accent mt-1">Warrior: {user.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {isTimerRunning && (
            <button 
              onClick={() => setShowTimerOverlay(true)}
              className="bg-tactical-accent/10 border border-tactical-accent/30 px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse"
            >
              <Timer className="w-4 h-4 text-tactical-accent" />
              <span className="font-mono font-bold text-tactical-accent text-sm">{formatTime(timeLeft)}</span>
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 bg-tactical-panel rounded-lg border border-white/10 flex items-center justify-center hover:border-tactical-accent transition-all"
            >
              <UserIcon className="w-5 h-5 text-tactical-accent" />
            </button>
            
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-tactical-panel border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-bottom border-white/5">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Authenticated As</p>
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => logout()}
                    className="w-full p-4 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold uppercase tracking-tighter"
                  >
                    <LogOut className="w-4 h-4" />
                    Terminate Session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-end">
            <div className="bg-tactical-panel text-tactical-accent px-4 py-2 rounded-lg font-display font-black text-2xl flex items-center gap-2 border border-tactical-accent/20">
              <Shield className="w-6 h-6" />
              {warScore}/3
            </div>
            <span className="text-[10px] uppercase font-bold tracking-tighter mt-1 opacity-50">War Score</span>
          </div>
        </div>
      </header>

      {/* War Tasks */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-tactical-accent" />
            <h3 className="font-display font-bold uppercase tracking-wider text-sm">War Tasks</h3>
          </div>
          <button 
            onClick={() => setShowCoachModal(true)}
            className="text-[10px] font-black uppercase tracking-widest bg-tactical-accent/10 text-tactical-accent border border-tactical-accent/30 px-3 py-1 rounded-full hover:bg-tactical-accent hover:text-tactical-panel transition-all flex items-center gap-1"
          >
            <Brain className="w-3 h-3" />
            Coach Suggestion
          </button>
        </div>
        <div className="space-y-3">
          {warTasks.map((task, idx) => (
            <div key={task.id} className={`tactical-card flex items-center gap-4 transition-all ${task.completed ? 'opacity-50 border-tactical-accent/30' : 'border-white/10'}`}>
              <button 
                onClick={() => toggleTask(task.id)}
                className={`w-8 h-8 rounded-md border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-tactical-accent border-tactical-accent text-tactical-panel' : 'border-white/20 hover:border-tactical-accent'}`}
              >
                {task.completed && <CheckCircle2 className="w-5 h-5" />}
              </button>
              <div className="flex-1">
                <textarea 
                  placeholder={`War Task ${idx + 1}...`}
                  value={task.title}
                  onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                  rows={1}
                  className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium placeholder:text-white/20 resize-none overflow-hidden min-h-[1.5em]"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
              <button 
                onClick={() => {
                  setActiveTimerTask(task.id);
                  setShowTimerOverlay(true);
                }}
                className={`flex items-center gap-2 transition-colors ${activeTimerTask === task.id && isTimerRunning ? 'text-tactical-accent' : 'text-white/40 hover:text-tactical-accent'}`}
              >
                {activeTimerTask === task.id && isTimerRunning && (
                  <span className="font-mono font-bold text-xs">{formatTime(timeLeft)}</span>
                )}
                <Timer className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Routine Blocks */}
      <section className="space-y-4 mb-8">
        {blocks.map(block => (
          <div key={block.id} className="bg-tactical-panel rounded-xl overflow-hidden border border-white/5 shadow-2xl">
            <button 
              onClick={() => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, isOpen: !b.isOpen } : b))}
              className="w-full px-6 py-4 flex justify-between items-center bg-white/5 text-white"
            >
              <div className="flex items-center gap-3">
                {block.id === 'command' && <Sun className="w-4 h-4 text-tactical-warm" />}
                {block.id === 'battle' && <Zap className="w-4 h-4 text-tactical-accent" />}
                {block.id === 'recovery' && <Moon className="w-4 h-4 text-blue-400" />}
                <span className="font-display font-bold uppercase tracking-wider text-xs">{block.title}</span>
              </div>
              {block.isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {block.isOpen && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-2">
                    {block.items.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => toggleBlockItem(block.id, item.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-5 h-5 text-tactical-accent" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/10" />
                        )}
                        <span className={`text-sm font-medium ${item.done ? 'line-through opacity-40' : 'text-white/80'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      {/* Reflection */}
      <section className="tactical-card mb-8 border-tactical-accent/20">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-tactical-accent" />
          <h3 className="font-display font-bold uppercase tracking-wider text-xs text-tactical-accent">Psychological Warfare</h3>
        </div>
        <textarea 
          placeholder="What enemy move did you defeat today? (e.g., Laziness, Fear, Distraction)"
          value={enemyNote}
          onChange={(e) => setEnemyNote(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-tactical-accent focus:ring-0 placeholder:text-white/20 min-h-[80px]"
        />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            onClick={() => setWinner('enemy')}
            className={`py-3 rounded-lg text-[10px] uppercase font-black tracking-widest border transition-all ${winner === 'enemy' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-white/10 text-white/40'}`}
          >
            Enemy Won
          </button>
          <button 
            onClick={() => setWinner('war')}
            className={`py-3 rounded-lg text-[10px] uppercase font-black tracking-widest border transition-all ${winner === 'war' ? 'bg-tactical-accent/20 border-tactical-accent text-tactical-accent' : 'border-white/10 text-white/40'}`}
          >
            Mindset Won
          </button>
        </div>
      </section>
    </motion.div>
  );

  const renderWeek = () => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const currentStreak = Object.keys(history).length; // Simplified streak for now

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <header className="mb-8">
          <h2 className="text-sm font-display font-bold uppercase tracking-widest text-tactical-panel/50">Performance</h2>
          <p className="text-3xl font-display font-bold">Weekly View</p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <div className="tactical-card">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Active Days</p>
            <p className="text-3xl font-display font-black text-tactical-accent">{currentStreak} Days</p>
          </div>
          <div className="tactical-card">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Total Wins</p>
            <p className="text-3xl font-display font-black text-tactical-warm">
              {Object.values(history).filter((h: any) => h.winner === 'war').length}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {last7Days.map((dayKey) => {
            const dayData = history[dayKey];
            const dateObj = new Date(dayKey);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            return (
              <div key={dayKey} className="bg-tactical-panel p-4 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-white/40 w-8">{dayName}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(dot => (
                      <div key={dot} className={`w-6 h-2 rounded-full ${dayData && dayData.score >= dot ? 'bg-tactical-accent' : 'bg-white/5'}`} />
                    ))}
                  </div>
                </div>
                {dayData?.winner === 'war' && <Zap className="w-4 h-4 text-tactical-accent" />}
                {dayData?.winner === 'enemy' && <Skull className="w-4 h-4 text-red-500" />}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderRules = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="mb-8">
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-tactical-panel/50">The Code</h2>
        <p className="text-3xl font-display font-bold">No-Negotiation Rules</p>
      </header>

      <div className="space-y-4">
        {[
          { icon: <Moon className="text-blue-400" />, title: 'Sleep Rule', text: 'In bed by 10:30 PM. No screens in the bedroom.' },
          { icon: <Target className="text-tactical-accent" />, title: 'Phone Rule', text: 'No phone usage for the first 60 minutes of the day.' },
          { icon: <Zap className="text-tactical-warm" />, title: 'Body Rule', text: 'Minimum 20 minutes of movement every single day.' },
          { icon: <Sun className="text-orange-400" />, title: 'Work Rule', text: 'Complete 3 War Tasks before checking social media.' },
        ].map(rule => (
          <div key={rule.title} className="tactical-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {rule.icon}
                <h4 className="font-display font-bold uppercase tracking-wider text-sm">{rule.title}</h4>
              </div>
              <div className="w-10 h-5 bg-tactical-accent/20 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-tactical-accent rounded-full" />
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{rule.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="mb-8">
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-tactical-panel/50">System</h2>
        <p className="text-3xl font-display font-bold">Settings</p>
      </header>

      <div className="space-y-4">
        <div className="tactical-card">
          <h4 className="text-[10px] uppercase font-bold text-white/40 mb-4">Profile</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 block mb-1">Callsign</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 font-bold">
                {user?.name}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">Secure Email</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/40 italic">
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        <div className="tactical-card">
          <h4 className="text-[10px] uppercase font-bold text-white/40 mb-4">Session Control</h4>
          <button 
            onClick={() => logout()}
            className="w-full py-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </div>

        <div className="tactical-card">
          <h4 className="text-[10px] uppercase font-bold text-white/40 mb-4">Danger Zone</h4>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full py-3 rounded-lg border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-tactical-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-tactical-accent animate-pulse" />
          <p className="text-tactical-accent font-display font-bold uppercase tracking-widest text-xs">Loading Tactical Data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto px-4 pt-8">
      <AnimatePresence mode="wait">
        {currentScreen === 'today' && renderToday()}
        {currentScreen === 'week' && renderWeek()}
        {currentScreen === 'rules' && renderRules()}
        {currentScreen === 'settings' && renderSettings()}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-tactical-panel text-white rounded-2xl p-2 flex justify-around items-center shadow-2xl border border-white/10 z-40">
        <button 
          onClick={() => setCurrentScreen('week')}
          className={`p-3 transition-all ${currentScreen === 'week' ? 'text-tactical-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <Calendar className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setCurrentScreen('today')}
          className={`p-3 transition-all ${currentScreen === 'today' ? 'text-tactical-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <Target className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setCurrentScreen('rules')}
          className={`p-3 transition-all ${currentScreen === 'rules' ? 'text-tactical-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <Zap className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setCurrentScreen('settings')}
          className={`p-3 transition-all ${currentScreen === 'settings' ? 'text-tactical-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>

      {/* Timer Overlay */}
      <AnimatePresence>
        {showTimerOverlay && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-50 bg-tactical-panel flex flex-col items-center justify-center p-8"
          >
            <button 
              onClick={() => setShowTimerOverlay(false)}
              className="absolute top-8 right-8 text-white/40 hover:text-white"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="text-center mb-12">
              <h2 className="text-tactical-accent uppercase font-black tracking-[0.2em] text-sm mb-2">Active Battle</h2>
              <p className="text-2xl font-display font-bold text-white">
                {warTasks.find(t => t.id === activeTimerTask)?.title || 'Untitled Task'}
              </p>
            </div>

            <div className="text-8xl font-display font-black text-white mb-12 tracking-tighter">
              {formatTime(timeLeft)}
            </div>

            <div className="flex gap-6">
              <button 
                onClick={() => isTimerRunning ? pauseTimer() : startTimer(timeLeft)}
                className="w-20 h-20 rounded-full bg-tactical-accent text-tactical-panel flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isTimerRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>
              <button 
                onClick={() => startTimer(25 * 60)}
                className="w-20 h-20 rounded-full border-2 border-white/10 text-white flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-8 h-8" />
              </button>
            </div>

            <div className="mt-16 flex flex-col items-center gap-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => startTimer(25 * 60)} 
                  className="px-6 py-2 rounded-full border border-tactical-accent/30 text-xs font-bold uppercase tracking-widest text-tactical-accent hover:bg-tactical-accent/10 transition-colors"
                >
                  25:00
                </button>
                <button 
                  onClick={() => startTimer(45 * 60)} 
                  className="px-6 py-2 rounded-full border border-tactical-accent/30 text-xs font-bold uppercase tracking-widest text-tactical-accent hover:bg-tactical-accent/10 transition-colors"
                >
                  45:00
                </button>
              </div>
              
              <div className="flex flex-col items-center gap-4 w-full max-w-[280px]">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Custom Duration</div>
                <div className="flex gap-2 w-full">
                  <input 
                    id="custom-mins-input"
                    type="number" 
                    placeholder="MINS"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-xl font-display font-bold text-tactical-accent placeholder:text-white/10 focus:border-tactical-accent focus:ring-1 focus:ring-tactical-accent/50 transition-all appearance-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const val = parseInt(input.value);
                        if (!isNaN(val) && val > 0) {
                          startTimer(val * 60);
                          input.value = '';
                          input.blur();
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('custom-mins-input') as HTMLInputElement;
                      const val = parseInt(input.value);
                      if (!isNaN(val) && val > 0) {
                        startTimer(val * 60);
                        input.value = '';
                        input.blur();
                      }
                    }}
                    className="bg-tactical-accent text-tactical-panel px-6 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                  >
                    Set
                  </button>
                </div>
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-tighter">Enter or click Set to update</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Coach Modal */}
      <AnimatePresence>
        {showCoachModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-tactical-panel border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-tactical-accent" />
                  <h3 className="font-display font-bold uppercase tracking-wider">Coach Intelligence</h3>
                </div>
                <button onClick={() => setShowCoachModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Your Profile</label>
                  <select 
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-full bg-tactical-panel border border-white/10 rounded-lg p-2 text-sm text-white outline-none"
                  >
                    <option value="student" className="bg-tactical-panel">Student</option>
                    <option value="creator" className="bg-tactical-panel">Creator</option>
                    <option value="job + side hustle" className="bg-tactical-panel">Job + Side Hustle</option>
                    <option value="entrepreneur" className="bg-tactical-panel">Entrepreneur</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Long-term Goals</label>
                  <input 
                    type="text"
                    placeholder="e.g. Build a SaaS, Run a marathon"
                    value={longTermGoals}
                    onChange={(e) => setLongTermGoals(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Focus Area</label>
                    <select 
                      value={focusArea}
                      onChange={(e) => setFocusArea(e.target.value)}
                      className="w-full bg-tactical-panel border border-white/10 rounded-lg p-2 text-sm text-white outline-none"
                    >
                      {Object.keys(SUGGESTIONS).map(area => (
                        <option key={area} value={area} className="bg-tactical-panel">{area}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Energy Level</label>
                    <select 
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(e.target.value)}
                      className="w-full bg-tactical-panel border border-white/10 rounded-lg p-2 text-sm text-white outline-none"
                    >
                      <option value="low" className="bg-tactical-panel">Low</option>
                      <option value="medium" className="bg-tactical-panel">Medium</option>
                      <option value="high" className="bg-tactical-panel">High</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={getCoachSuggestion}
                  disabled={isSuggesting}
                  className="w-full py-4 rounded-xl bg-tactical-accent text-tactical-panel font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {isSuggesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-tactical-panel/30 border-t-tactical-panel rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Deploy Coach"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
