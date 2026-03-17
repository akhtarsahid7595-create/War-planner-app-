import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Target, 
  Zap, 
  Brain, 
  ChevronRight, 
  X 
} from 'lucide-react';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: <Shield className="w-16 h-16 text-tactical-accent" />,
    title: "Welcome to War Planner",
    description: "This is not a regular to-do app. This is a tactical command center designed to help you execute critical missions and maintain discipline.",
    color: "tactical-accent"
  },
  {
    icon: <Target className="w-16 h-16 text-tactical-warm" />,
    title: "The 3 War Tasks",
    description: "Every day, identify exactly 3 high-leverage tasks. These are your 'War Tasks'. No negotiation, no excuses. Complete them before the day ends.",
    color: "tactical-warm"
  },
  {
    icon: <Zap className="w-16 h-16 text-blue-400" />,
    title: "Routine Blocks",
    description: "Automate your environment with Morning (Command), Deep Work (Battle), and Night (Recovery) stacks. Toggle items to build momentum.",
    color: "blue-400"
  },
  {
    icon: <Brain className="w-16 h-16 text-green-400" />,
    title: "Psychological Warfare",
    description: "Track your wins against the 'Enemy' (Laziness, Fear, Distraction). At the end of the day, record who won the mental battle.",
    color: "green-400"
  }
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="absolute top-8 right-8">
        <button 
          onClick={onComplete}
          className="text-white/40 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-tactical-panel border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          {STEPS[currentStep].icon}
        </div>

        <h3 className="font-display font-black uppercase tracking-wider text-xl mb-3">
          {STEPS[currentStep].title}
        </h3>

        <p className="text-sm text-white/60 leading-relaxed mb-8 min-h-[4.5rem]">
          {STEPS[currentStep].description}
        </p>

        {/* Step Indicators */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-tactical-accent' : 'w-2 bg-white/10'}`}
            />
          ))}
        </div>

        <div className="flex gap-3 w-full">
          {currentStep > 0 && (
            <button 
              onClick={handleBack}
              className="px-6 py-3 rounded-xl border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex-1"
            >
              Back
            </button>
          )}
          <button 
            onClick={handleNext}
            className="px-6 py-3 rounded-xl bg-tactical-accent text-tactical-panel text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-98 transition-all flex-1 flex items-center justify-center gap-2"
          >
            {currentStep === STEPS.length - 1 ? "Deploy" : "Next"}
            {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
