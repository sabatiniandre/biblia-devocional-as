import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Calendar, 
  Clock, 
  ArrowLeft,
  LayoutGrid,
  History,
  TrendingDown,
  TrendingUp,
  Play
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { READING_PLANS, ReadingPlan } from '../data/devotionals';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface UserPlanData {
  planId: string;
  startDate: Timestamp;
  completedDays: number[];
  lastUpdate: Timestamp;
}

interface DevotionalViewProps {
  user: User;
  onNavigate: (ref: string) => void;
}

export function DevotionalView({ user, onNavigate }: DevotionalViewProps) {
  const [activePlans, setActivePlans] = useState<UserPlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
  const [showPlanSelection, setShowPlanSelection] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'readingPlans'), (snapshot) => {
      const plans = snapshot.docs.map(doc => doc.data() as UserPlanData);
      setActivePlans(plans);
      setLoading(false);
      
      if (plans.length > 0 && showPlanSelection) {
        setShowPlanSelection(false);
        const firstActive = READING_PLANS.find(p => p.id === plans[0].planId);
        if (firstActive) setSelectedPlan(firstActive);
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  const joinPlan = async (plan: ReadingPlan, startDate: Date = new Date()) => {
    const userPlanRef = doc(db, 'users', user.uid, 'readingPlans', plan.id);
    await setDoc(userPlanRef, {
      planId: plan.id,
      startDate: Timestamp.fromDate(startDate),
      completedDays: [],
      lastUpdate: serverTimestamp()
    });
    setSelectedPlan(plan);
    setShowPlanSelection(false);
  };

  const toggleDayCompletion = async (planId: string, day: number, isCompleted: boolean) => {
    const userPlanRef = doc(db, 'users', user.uid, 'readingPlans', planId);
    if (!isCompleted) {
      await updateDoc(userPlanRef, {
        completedDays: arrayUnion(day),
        lastUpdate: serverTimestamp()
      });
    } else {
      await updateDoc(userPlanRef, {
        completedDays: arrayRemove(day),
        lastUpdate: serverTimestamp()
      });
    }
  };

  const calculateStatus = (planData: UserPlanData, duration: number) => {
    const start = planData.startDate.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - start.getTime();
    const currentDayOfPlan = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // We compare currentDayOfPlan with the highest completed day
    const maxCompletedDay = planData.completedDays.length > 0 
      ? Math.max(...planData.completedDays) 
      : 0;
      
    const lag = currentDayOfPlan - maxCompletedDay;

    const endDate = new Date(start);
    endDate.setDate(start.getDate() + duration - 1);

    return {
      currentDayOfPlan,
      maxCompletedDay,
      lag,
      endDate,
      progress: (planData.completedDays.length / duration) * 100
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (showPlanSelection) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-stone-900">Planos de Leitura</h2>
          <p className="text-stone-500">Escolha um plano para fortalecer sua rotina devocional.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {READING_PLANS.map(plan => {
            const isActive = activePlans.some(p => p.planId === plan.id);
            return (
              <motion.button
                key={plan.id}
                whileHover={{ y: -4 }}
                onClick={() => isActive ? joinPlan(plan) : joinPlan(plan)}
                className={cn(
                  "flex flex-col text-left p-6 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden",
                  isActive 
                    ? "bg-stone-900 border-stone-900 text-white shadow-xl shadow-stone-200" 
                    : "bg-white border-stone-100 hover:border-stone-800 text-stone-900"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                  )}>
                    {plan.durationDays} Dias • {plan.category}
                  </div>
                  {isActive && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                </div>
                
                <h3 className="text-xl font-serif font-bold mb-2 group-hover:translate-x-1 transition-transform">{plan.name}</h3>
                <p className={cn(
                  "text-sm mb-6 flex-1",
                  isActive ? "text-stone-400" : "text-stone-500"
                )}>
                  {plan.description}
                </p>

                <div className="flex items-center gap-2 font-bold text-sm">
                  {isActive ? "Continuar Plano" : "Iniciar Agora"}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  const planData = activePlans.find(p => p.planId === selectedPlan?.id);
  const status = selectedPlan && planData ? calculateStatus(planData, selectedPlan.durationDays) : null;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowPlanSelection(true)}
            className="p-3 bg-stone-100 hover:bg-stone-200 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div className="space-y-1">
            <h2 className="text-3xl font-serif font-bold text-stone-900">{selectedPlan?.name}</h2>
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4" />
                Início: {planData?.startDate.toDate().toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4" />
                Término: {status?.endDate.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Status</p>
              {status.lag <= 0 ? (
                <div className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold">EM DIA</div>
              ) : (
                <div className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">DEFASADO</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {status.lag <= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
              <div>
                <p className="text-xl font-bold text-stone-900">
                  {status.lag > 0 ? `${status.lag} dias atrasado` : 'No prazo correto'}
                </p>
                <p className="text-xs text-stone-500">Com base no dia {status.currentDayOfPlan} do plano</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-50 shadow-sm space-y-4">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Progresso Total</p>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-serif font-bold text-stone-900">{status.progress.toFixed(0)}%</p>
                <p className="text-xs text-stone-500 font-bold">{planData?.completedDays.length}/{selectedPlan?.durationDays} dias</p>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${status.progress}%` }}
                  className="h-full bg-stone-900"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-50 shadow-sm flex flex-col justify-center">
             <button 
              onClick={() => {
                const tomorrow = new Date(planData!.startDate.toDate());
                tomorrow.setDate(tomorrow.getDate() + 1);
                updateDoc(doc(db, 'users', user.uid, 'readingPlans', selectedPlan!.id), {
                  startDate: Timestamp.fromDate(tomorrow)
                });
              }}
              className="w-full py-2 mb-2 text-[10px] font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest"
             >
                Ajustar Data de Início
             </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedPlan?.items.map(item => {
          const isCompleted = planData?.completedDays.includes(item.day) || false;
          const isToday = status?.currentDayOfPlan === item.day;

          return (
            <div 
              key={item.day}
              className={cn(
                "p-5 rounded-[2rem] border-2 transition-all flex flex-col gap-4",
                isCompleted 
                  ? "bg-green-50/50 border-green-100/50" 
                  : isToday 
                    ? "bg-stone-900 border-stone-900 text-white shadow-lg"
                    : "bg-white border-stone-100 hover:border-stone-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  isToday ? "text-stone-400" : "text-stone-400"
                )}>
                  Dia {item.day}
                </span>
                <button 
                  onClick={() => toggleDayCompletion(selectedPlan.id, item.day, isCompleted)}
                  className="transition-transform active:scale-90"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className={cn("w-6 h-6", isToday ? "text-white/20" : "text-stone-200")} />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.readings.map(ref => (
                  <button
                    key={ref}
                    onClick={() => onNavigate(`nvibr/${ref}`)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      isToday 
                        ? "bg-white/10 text-white hover:bg-white/20" 
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    )}
                  >
                    <Play className="w-3 h-3" />
                    {ref.toUpperCase().replace('/', ' ')}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
