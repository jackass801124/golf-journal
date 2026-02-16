import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * 目標管理組件 - 支援 Firebase 雲端目標儲存與權限保護
 * @param {Array} rounds - 從 Firebase 讀取的真實歷史數據
 */
export default function GoalsView({ rounds }) {
  const [targetScore, setTargetScore] = useState(85);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  
  const auth = getAuth();
  const db = getFirestore();

  // 1. 監聽 Auth 狀態，確保拿到 uid 後才執行資料庫操作
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. 從 Firebase 讀取使用者設定的目標桿數
  useEffect(() => {
    if (!user) return;
    
    // 路徑規範：/artifacts/{appId}/users/{userId}/settings/goals
    // 這裡簡化為 /users/{userId}/settings/goals 以符合一般專案邏輯
    const userGoalRef = doc(db, 'users', user.uid, 'settings', 'goals');
    
    const unsubscribe = onSnapshot(userGoalRef, (docSnap) => {
      if (docSnap.exists()) {
        setTargetScore(docSnap.data().targetScore);
      }
    }, (error) => {
      console.error("讀取目標失敗:", error);
    });
    
    return () => unsubscribe();
  }, [user, db]);

  // 3. 儲存目標桿數到雲端
  const saveGoal = async (newScore) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userGoalRef = doc(db, 'users', user.uid, 'settings', 'goals');
      await setDoc(userGoalRef, { 
        targetScore: newScore,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("儲存目標失敗:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. 計算目前平均桿數
  const currentAvg = rounds && rounds.length > 0 
    ? (rounds.reduce((sum, r) => sum + Number(r.totalScore), 0) / rounds.length) 
    : 89.3;

  // 5. 計算達成進度 (110桿=0%, 目標桿數=100%)
  const startPoint = 110;
  const diff = startPoint - targetScore;
  const currentProgress = Math.max(5, Math.min(95, ((startPoint - currentAvg) / (diff || 1)) * 100));

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-lg animate-in fade-in slide-in-from-bottom-4">
      {/* 標題與儲存狀態 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#f0f4f1] p-3 rounded-2xl text-2xl shadow-sm">⛳</div>
          <h2 className="text-2xl font-serif font-bold text-[#1a4d2e]">目標管理</h2>
        </div>
        {isSaving && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[10px] text-gray-400">雲端同步中</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* 目標設定區卡片 */}
        <div className="bg-[#fcfaf2] p-8 rounded-[35px] border border-[#d4af37]/10 shadow-sm relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1a4d2e] tracking-tight">年度目標桿數</span>
              <input 
                type="number" 
                value={targetScore}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTargetScore(val);
                  saveGoal(val); 
                }}
                className="w-24 p-3 text-center text-2xl font-serif font-bold bg-white border-2 border-[#d4af37]/20 rounded-2xl outline-none focus:border-[#d4af37] transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">目標達成進度</span>
                <span className="text-xs text-gray-400">
                  當前平均 <span className="font-serif font-bold text-[#1a4d2e] ml-1">{currentAvg.toFixed(1)}</span> 桿
                </span>
              </div>
              
              <div className="relative h-12 bg-gray-100 rounded-2xl p-1.5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-[#1a4d2e] to-[#d4af37] rounded-xl flex items-center justify-end px-4 transition-all duration-1000 ease-out shadow-md"
                  style={{ width: `${currentProgress}%` }}
                >
                  <span className="text-white text-[10px] font-black tracking-tighter drop-shadow-md">
                    {currentProgress.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] pointer-events-none font-serif">GOAL</div>
        </div>

        {/* 練習目標清單 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-bold text-[#1a4d2e] text-sm">練習目標</h4>
            <span className="px-3 py-1 bg-[#1a4d2e]/5 text-[#1a4d2e] text-[10px] rounded-full font-bold">本週計畫</span>
          </div>
          
          <GoalItem label="推桿練習" sub="每週至少 3 次模擬果嶺練習" checked={true} icon="🎯" />
          <GoalItem label="開球準確度" sub="球道命中率穩定提升至 70%" checked={false} icon="🏹" />
          <GoalItem label="短桿技巧" sub="50 碼內精準度提升，一桿上果嶺" checked={false} icon="📍" />
        </div>
      </div>
    </div>
  );
}

function GoalItem({ label, sub, checked, icon }) {
  const [isChecked, setIsChecked] = useState(checked);
  return (
    <div 
      onClick={() => setIsChecked(!isChecked)}
      className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-[#d4af37]/30 transition-all cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-colors ${isChecked ? 'bg-gray-50' : 'bg-[#fcfaf2]'}`}>
          {icon}
        </div>
        <div>
          <p className={`font-bold transition-all ${isChecked ? 'text-gray-300 line-through' : 'text-[#2c3e2f]'}`}>{label}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</p>
        </div>
      </div>
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${isChecked ? 'bg-[#4caf50] scale-110 shadow-lg shadow-green-100' : 'border-2 border-gray-100 rotate-45 group-hover:rotate-0'}`}>
        {isChecked ? <span className="text-white text-sm font-bold">✓</span> : <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>}
      </div>
    </div>
  );
}