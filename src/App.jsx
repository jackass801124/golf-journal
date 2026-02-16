import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  query 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithCustomToken 
} from 'firebase/auth';

// --- Firebase 配置 (維持您原有的配置，但加上保護機制) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyCURZU99Qmgqx7s4bPKBujuYt3FB8p-WJI",
      authDomain: "my-golf-journal-6c73a.firebaseapp.com",
      projectId: "my-golf-journal-6c73a",
      storageBucket: "my-golf-journal-6c73a.firebasestorage.app",
      messagingSenderId: "212339114526",
      appId: "1:212339114526:web:be2e7033312ec0c4c8640f",
      measurementId: "G-DRF1NP6PSW"
    };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-golf-journal-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('new-round');
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 初始化身份驗證 (遵循 RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽個人化 Firestore 資料 (遵循 RULE 1 & 2)
  useEffect(() => {
    if (!user) {
      setRounds([]);
      return;
    }

    // 資料路徑：/artifacts/{appId}/users/{userId}/rounds
    const roundsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'rounds');
    const q = query(roundsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 在記憶體中進行排序
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setRounds(sorted);
    }, (err) => {
      console.error("Firestore Listen Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSave = async (roundData) => {
    if (!user) return;
    try {
      const userRoundsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'rounds');
      await addDoc(userRoundsRef, {
        ...roundData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setActiveTab('history');
    } catch (err) {
      console.error('儲存失敗：', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f2]">
        <div className="animate-pulse text-[#1a4d2e] font-bold">LOADING GOLF DATA...</div>
      </div>
    );
  }

  // --- 未登入介面 ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-[#1a4d2e] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-5xl">⛳</span>
          </div>
          <h1 className="serif-font text-4xl text-[#1a4d2e] font-black mb-2">47's Golf Journal</h1>
          <p className="text-gray-500 tracking-widest uppercase text-xs font-bold">Personalized Cloud Edition</p>
        </div>
        
        <div className="bg-white p-8 rounded-[40px] shadow-sm max-w-sm w-full border border-gray-100">
          <p className="text-gray-600 mb-8 leading-relaxed font-medium">歡迎使用雲端高爾夫日誌！請登入 Google 帳號以啟用個人專屬的揮桿數據空間。</p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            使用 Google 帳號登入
          </button>
          <p className="text-[10px] text-gray-400 mt-6">您的資料將安全地儲存於個人私有雲端中</p>
        </div>
      </div>
    );
  }

  // --- 已登入主介面 ---
  return (
    <div className="min-h-screen bg-[#f8f7f2] font-sans text-gray-800 pb-12 transition-all duration-500">
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&family=Noto+Sans+TC:wght@400;700&display=swap');
        
        .golf-header {
          background: linear-gradient(135deg, #1a4d2e 0%, #2d5a3f 100%);
          border-bottom-left-radius: 40px;
          border-bottom-right-radius: 40px;
        }
        .serif-font { font-family: 'Noto Serif TC', serif; }
        .glass-card {
          background: white;
          border-radius: 32px;
          box-shadow: 0 10px 40px rgba(26, 77, 46, 0.06);
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .content-container { min-height: 520px; }
      `}</style>

      {/* Header */}
      <header className="golf-header pt-12 pb-24 px-6 text-center shadow-lg relative">
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest bg-black/10 px-4 py-1.5 rounded-full transition-all"
        >
          登出 Logout
        </button>
        <h1 className="serif-font text-5xl text-white mb-2">47's Golf Journal</h1>
        <p className="text-white/60 text-sm tracking-widest uppercase">
          {user.displayName || 'Golfer'}'s Dashboard
        </p>
      </header>

      {/* Navigation */}
      <div className="max-w-md mx-auto -mt-12 px-4 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'new-round', label: '⛳ 新增回合' },
            { id: 'history', label: '📜 歷史記錄' },
            { id: 'stats', label: '📊 統計分析' },
            { id: 'goals', label: '🎯 目標管理' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95 ${
                activeTab === tab.id 
                ? 'bg-[#1a4d2e] text-[#d4af37] border-2 border-[#d4af37]' 
                : 'bg-white text-gray-400 border-2 border-transparent hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-xl mx-auto mt-8 px-4">
        <div className="glass-card p-6 md:p-8">
          <div className="content-container transition-opacity duration-300">
            {activeTab === 'new-round' && <NewRoundView onSave={handleSave} />}
            {activeTab === 'history' && <HistoryView rounds={rounds} loading={false} />}
            {activeTab === 'stats' && <StatsView rounds={rounds} />}
            {activeTab === 'goals' && <GoalsView rounds={rounds} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// 子組件 (維持原先的美觀視覺)
function NewRoundView({ onSave }) {
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState(Array(18).fill(''));
  const totalScore = scores.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-[#1a4d2e] flex items-center gap-2"><span>📝</span> 記錄今日表現</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">比賽日期 Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#d4af37]/30 focus:bg-white transition-all" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">球場名稱 Course</label>
          <input type="text" placeholder="例：林口球場" value={course} onChange={e => setCourse(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#d4af37]/30 focus:bg-white transition-all" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">18 洞成績 Scorecard</label>
        <div className="grid grid-cols-6 gap-2">
          {scores.map((s, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-[9px] text-center text-gray-300 font-mono">{i+1}</span>
              <input type="number" value={s} placeholder="-" onChange={e => { const n = [...scores]; n[i] = e.target.value; setScores(n); }} className="w-full h-10 text-center bg-gray-50 rounded-lg border border-gray-100 focus:border-[#d4af37] outline-none text-sm font-bold transition-all" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#1a4d2e] p-6 rounded-3xl flex justify-between items-center text-white mt-6 shadow-lg">
        <div><p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Total Strokes</p><p className="text-lg font-bold">總桿數</p></div>
        <span className="serif-font text-5xl font-black text-[#d4af37] drop-shadow-sm">{totalScore}</span>
      </div>
      <button onClick={() => onSave({ course, date, totalScore, scores: scores.map(n => Number(n) || 0) })} className="w-full bg-[#d4af37] hover:bg-[#c4a030] text-[#1a4d2e] font-black py-4 rounded-2xl text-lg shadow-md active:scale-[0.98] transition-all transform">儲存此回合資料</button>
    </div>
  );
}

function HistoryView({ rounds, loading }) {
  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 italic">正在載入雲端數據...</div>;
  if (rounds.length === 0) return <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-2"><span>⛳</span><span>目前尚未有任何揮桿紀錄</span></div>;
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-xl font-bold text-[#1a4d2e] mb-4">歷史數據 History</h2>
      <div className="space-y-3">
        {rounds.map(r => (
          <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border-l-4 border-[#d4af37] hover:bg-white hover:shadow-sm transition-all group">
            <div><p className="text-[10px] font-bold text-gray-400 group-hover:text-[#d4af37] transition-colors">{r.date}</p><h3 className="font-bold text-[#1a4d2e]">{r.course || '未命名球場'}</h3></div>
            <div className="serif-font text-2xl font-black text-[#1a4d2e] bg-white w-12 h-12 flex items-center justify-center rounded-xl shadow-sm border border-gray-100">{r.totalScore}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsView({ rounds }) {
  const totalRounds = rounds.length;
  const avg = totalRounds ? (rounds.reduce((s, r) => s + Number(r.totalScore), 0) / totalRounds).toFixed(1) : 0;
  const best = totalRounds ? Math.min(...rounds.map(r => Number(r.totalScore))) : "--";
  const trendData = [...rounds].slice(0, 5).reverse().map(r => Number(r.totalScore));
  const maxVal = Math.max(...trendData, 100);
  const minVal = Math.min(...trendData, 70);

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500">
      <h2 className="text-xl font-bold text-[#1a4d2e] mb-4">統計看板 Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#fcfaf2] p-6 rounded-3xl text-center border border-[#f0e6cc] shadow-sm">
          <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Average</p>
          <p className="serif-font text-4xl font-black text-[#1a4d2e]">{avg}</p>
          <p className="text-xs text-[#1a4d2e]/60 font-bold mt-1">平均桿數</p>
        </div>
        <div className="bg-[#1a4d2e] p-6 rounded-3xl text-center shadow-lg">
          <p className="text-[10px] text-[#d4af37]/60 mb-1 font-bold uppercase tracking-widest">Best Record</p>
          <p className="serif-font text-4xl font-black text-[#d4af37]">{best}</p>
          <p className="text-xs text-white/60 font-bold mt-1">生涯最佳</p>
        </div>
      </div>
      <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">最近五場趨勢 Trend</h3>
        <div className="h-24 flex items-end justify-between gap-2 px-2">
          {trendData.length > 0 ? trendData.map((val, idx) => {
            const height = ((maxVal - val + 20) / (maxVal - minVal + 40)) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-[#1a4d2e]">{val}</span>
                <div style={{ height: `${height}%` }} className="w-full max-w-[20px] bg-gradient-to-t from-[#1a4d2e] to-[#2d5a3f] rounded-t-md opacity-80 transition-all duration-1000"></div>
              </div>
            );
          }) : <div className="w-full text-center py-6 text-gray-300 text-sm italic">揮桿數據累積中...</div>}
        </div>
      </div>
    </div>
  );
}

function GoalsView({ rounds }) {
  const bestScore = rounds.length ? Math.min(...rounds.map(r => Number(r.totalScore))) : 120;
  const target = 80;
  const startLevel = 120;
  const progress = Math.max(0, Math.min(100, ((startLevel - bestScore) / (startLevel - target)) * 100));
  return (
    <div className="text-center space-y-6 animate-in slide-in-from-top-2 duration-500">
      <h2 className="text-xl font-bold text-[#1a4d2e]">目標管理 Goals</h2>
      <div className="p-10 bg-[#1a4d2e] text-white rounded-[40px] relative shadow-xl overflow-hidden group">
        <div className="relative z-10">
          <p className="text-xs opacity-60 uppercase font-bold tracking-widest">Breaking Target</p>
          <div className="serif-font text-8xl font-black text-[#d4af37] my-2 group-hover:scale-110 transition-transform duration-500">{target}</div>
          <p className="text-sm font-bold tracking-widest mb-6">單輪破 {target} 桿計畫</p>
          <div className="mt-4 space-y-2 text-left">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider"><span>目前最佳: {bestScore}</span><span>達成率: {progress.toFixed(0)}%</span></div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 p-[2px] shadow-inner"><div className="h-full bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>
          </div>
        </div>
        <div className="absolute top-[-20px] right-[-20px] text-white/5 text-9xl font-black select-none">GOAL</div>
      </div>
    </div>
  );
}