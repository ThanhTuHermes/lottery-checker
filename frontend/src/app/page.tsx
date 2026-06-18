"use client";

import { useState, useEffect } from "react";

interface Match {
  region: string;
  province: string;
  prize: string;
  prize_rank: number;
  winning_number: string;
  reward_amount: number | null;
  draw_code: string;
  claim_deadline: string;
  days_left: number;
}

interface CheckResult {
  matched: boolean;
  matches: Match[];
  error?: string;
}

interface SystemStats {
  total_draws: number;
  total_prizes: number;
  total_checks: number;
}

const PRIZE_LABELS: Record<string, string> = {
  dac_biet: "Giải Đặc Biệt",
  phu_dac_biet: "Giải Phụ Đặc Biệt",
  khuyen_khich: "Giải Khuyến Khích",
  nhat: "Giải Nhất",
  nhi: "Giải Nhì",
  ba: "Giải Ba",
  tu: "Giải Tư",
  nam: "Giải Năm",
  sau: "Giải Sáu",
  bay: "Giải Bảy",
  tam: "Giải Tám",
};

const REGION_LABELS: Record<string, string> = {
  south: "Miền Nam",
  central: "Miền Trung",
  north: "Miền Bắc",
};

interface ConfettiParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

function ConfettiShower() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  useEffect(() => {
    const colors = [
      "#fbbf24", // amber-400
      "#f59e0b", // amber-500
      "#fcd34d", // amber-300
      "#eab308", // yellow-500
      "#dfa711", // darker gold
      "#fffbeb", // gold sheen
    ];
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 1.5,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            top: `-15px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

function AmountCounter({ amount }: { amount: number | null }) {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    if (amount === null) return;
    
    let startTime: number | null = null;
    const duration = 1000; // 1 second
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const ease = 1 - Math.pow(2, -10 * percentage); // easeOutExpo
      
      setDisplayValue(Math.floor(ease * amount));
      
      if (percentage < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [amount]);

  if (amount === null) return <span>Chưa có trị giá</span>;

  return <span>{displayValue.toLocaleString("vi-VN")}đ</span>;
}

const playChaChing = () => {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  
  // Coin chime 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(850, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
  gain1.gain.setValueAtTime(0.15, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  // Coin chime 2 (triggered slightly later, higher pitch)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1500, ctx.currentTime + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + 0.25);
  gain2.gain.setValueAtTime(0.0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  // Coin chime 3 (harmonics for metal sheen)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "triangle";
  osc3.frequency.setValueAtTime(2200, ctx.currentTime + 0.1);
  gain3.gain.setValueAtTime(0.0, ctx.currentTime);
  gain3.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
  gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc3.connect(gain3);
  gain3.connect(ctx.destination);

  osc1.start();
  osc1.stop(ctx.currentTime + 0.2);
  
  osc2.start(ctx.currentTime + 0.08);
  osc2.stop(ctx.currentTime + 0.4);

  osc3.start(ctx.currentTime + 0.1);
  osc3.stop(ctx.currentTime + 0.4);
};

const getRankText = (prize: string) => {
  switch (prize) {
    case "dac_biet": return "ĐB";
    case "phu_dac_biet": return "PĐB";
    case "khuyen_khich": return "KK";
    case "nhat": return "1";
    case "nhi": return "2";
    case "ba": return "3";
    case "tu": return "4";
    case "nam": return "5";
    case "sau": return "6";
    case "bay": return "7";
    case "tam": return "8";
    default: return "G";
  }
};

const formatDateVN = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const getPrizeIcon = (prize: string) => {
  switch (prize) {
    case "dac_biet": return "👑";
    case "phu_dac_biet": return "⭐";
    case "khuyen_khich": return "🍀";
    case "nhat": return "🥇";
    case "nhi": return "🥈";
    case "ba": return "🥉";
    case "tu": return "🎗️";
    case "nam": return "🎖️";
    case "sau": return "🎟️";
    case "bay": return "🎫";
    case "tam": return "🎯";
    default: return "💰";
  }
};

const getClaimBadge = (days: number) => {
  if (days <= 0) {
    return {
      text: "Hết hạn đổi",
      classes: "bg-red-50 text-red-700 border border-red-200"
    };
  }
  if (days === 1) {
    return {
      text: "Hạn cuối hôm nay!",
      classes: "bg-orange-100 text-orange-800 border border-orange-200 animate-pulse font-bold"
    };
  }
  if (days <= 7) {
    return {
      text: `Còn ${days} ngày`,
      classes: "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse font-semibold"
    };
  }
  return {
    text: `Còn ${days} ngày`,
    classes: "bg-green-50 text-green-700 border border-green-200"
  };
};

function PrizeCard({ m, i, total }: { m: Match; i: number; total: number }) {
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const px = (x - centerX) / centerX;
    const py = (y - centerY) / centerY;
    
    const maxTilt = 8; // Max tilt 8 degrees
    const rX = -py * maxTilt;
    const rY = px * maxTilt;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out",
      boxShadow: "0 20px 30px rgba(0, 0, 0, 0.15)",
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    });
  };

  const countdown = getClaimBadge(m.days_left);
  const isSpecial = m.prize === "dac_biet" || m.prize === "phu_dac_biet";
  const rankBadgeClass = isSpecial ? "rank-badge-gold" : "rank-badge-silver";

  return (
    <div
      className="animate-deal-card"
      style={{
        marginTop: i > 0 ? "-1.5rem" : "0px",
        zIndex: total - i,
        animationDelay: `${i * 100}ms`
      }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
        className="bg-[#fffdf9] text-stone-900 border-2 border-amber-400 rounded-2xl overflow-hidden shadow-xl cursor-pointer relative transform-gpu holographic-shimmer select-none"
      >
        {/* Red/Gold side ribbon */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-red-600 via-amber-400 to-red-600"></div>

        <div className="p-5 pl-7">
          {/* Top info and badge */}
          <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                {/* Rank Badge with glowing pulse animation */}
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black border-2 ${rankBadgeClass} shrink-0 shadow-sm font-mono`}>
                  {getRankText(m.prize)}
                </span>
                
                <span className="text-xl">{getPrizeIcon(m.prize)}</span>
                <h3 className="font-cinzel text-base md:text-lg font-black text-red-700 uppercase tracking-wide">
                  {PRIZE_LABELS[m.prize] || m.prize}
                </h3>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playChaChing();
                  }}
                  className="p-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/60 text-stone-500 hover:text-amber-600 transition-all flex items-center justify-center w-6 h-6 cursor-pointer hover:scale-110 active:scale-95 shadow-sm"
                  title="Nghe âm thanh chiến thắng"
                >
                  🔊
                </button>
              </div>
              <p className="text-[10px] text-stone-500 font-bold tracking-wider uppercase mt-1.5 ml-9">
                ĐÀI {m.province} • MIỀN {REGION_LABELS[m.region] || m.region}
              </p>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${countdown.classes}`}>
                <span className="mr-1 w-1 h-1 rounded-full bg-current"></span>
                {countdown.text}
              </span>
              <p className="text-[9px] text-stone-400 mt-0.5">Hạn: {formatDateVN(m.claim_deadline)}</p>
            </div>
          </div>

          {/* Reward Details Box */}
          <div className="bg-gradient-to-r from-red-50 to-amber-50/50 border border-amber-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner relative z-10">
            <div>
              <span className="text-[9px] text-stone-400 uppercase tracking-wider block font-bold">Số tiền trúng thưởng</span>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-red-700 via-amber-600 to-red-800 bg-clip-text text-transparent">
                <AmountCounter amount={m.reward_amount} />
              </span>
            </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-amber-200/40 pt-1.5 sm:pt-0 sm:pl-3">
              <span className="text-[9px] text-stone-400 uppercase tracking-wider block font-bold">
                Mã vé • Số trúng
              </span>
              <div className="font-mono text-xs font-bold text-stone-600">
                Kỳ vé: <span className="text-stone-800">{m.draw_code || "N/A"}</span>
              </div>
              <div className="text-xs text-stone-500">
                Số trúng: <strong className="font-mono text-green-600 font-extrabold text-sm">{m.winning_number}</strong>
              </div>
            </div>
          </div>

          {/* Inked Stamp Overlay */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none transform rotate-12 z-0">
            <div className="border-4 border-double border-red-600 rounded-full w-20 h-20 flex items-center justify-center flex-col text-red-600 font-black tracking-widest text-[10px] p-2">
              <span>KẾT QUẢ</span>
              <span className="text-xs">TRÚNG</span>
              <span>THƯỞNG</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // Set today's date on mount
  useEffect(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;
    setDrawDate(today);
    setMaxDate(today);
  }, []);

  const fetchStats = async () => {
    try {
      let res = await fetch("/api/stats");
      if (!res.ok && typeof window !== "undefined" && window.location.hostname === "localhost") {
        res = await fetch("http://localhost:3001/api/stats");
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
      setApiConnected(false);
    }
  };

  // Fetch system stats on load
  useEffect(() => {
    fetchStats();
  }, []);

  // Format inputs as XXX XXX or XXX XXXX for readability
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 7) return;

    let formatted = raw;
    if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)} ${raw.slice(3)}`;
    }
    setInputValue(formatted);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = inputValue.replace(/\s+/g, "");
    if (!cleanNumber || !drawDate) return;

    setLoading(true);
    setResult(null);

    try {
      let res;
      try {
        res = await fetch("/api/check-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketNumber: cleanNumber, drawDate }),
        });
      } catch (err) {
        // Fallback to localhost if relative proxy is not accessible
        if (typeof window !== "undefined" && window.location.hostname === "localhost") {
          res = await fetch("http://localhost:3001/api/check-ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketNumber: cleanNumber, drawDate }),
          });
        } else {
          throw err;
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi từ máy chủ (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      // Refresh stats
      fetchStats();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setResult({
        matched: false,
        matches: [],
        error: errorMessage || "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1c0606] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#3a0d0d] via-[#1c0606] to-[#0f0303] text-white flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 selection:bg-amber-500 selection:text-black">
      
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none select-none border-t border-l border-amber-400 m-4"></div>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none select-none border-t border-r border-amber-400 m-4"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10 pointer-events-none select-none border-b border-l border-amber-400 m-4 bg-transparent"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10 pointer-events-none select-none border-b border-r border-amber-400 m-4 bg-transparent"></div>

      <div className="w-full max-w-lg flex flex-col items-center gap-6 mt-4">
        
        {/* Header Branding */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-yellow-300 animate-float mb-3">
            <span className="text-3xl filter drop-shadow">🏮</span>
          </div>
          <h1 className="font-cinzel text-2xl md:text-3xl font-black tracking-widest bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 bg-clip-text text-transparent uppercase drop-shadow">
            Vé Số Kiến Thiết
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-amber-500/80 mt-1">
            Tra Cứu Kết Quả 3 Miền Siêu Tốc
          </p>
        </div>

        {/* The Main Ticket-Style Form Card */}
        <div className="w-full bg-[#fffdf8] text-stone-900 rounded-t-3xl shadow-[0_25px_50px_-12px_rgba(183,28,28,0.4)] border-2 border-amber-400 relative overflow-hidden flex flex-col">
          
          {/* Gold foiled/Red Header Banner */}
          <div className="relative bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-amber-100 px-6 py-5 border-b-4 border-amber-400">
            <div className="absolute top-2 left-2 right-2 border border-dashed border-amber-400/40 rounded-lg py-1 px-3 flex justify-between items-center text-[10px] uppercase font-bold tracking-wider opacity-60">
              <span>Mệnh Giá: 10.000đ</span>
              <span>Dò mọi tỉnh thành</span>
            </div>
            <div className="text-center mt-3">
              <h2 className="font-cinzel text-xl font-bold tracking-widest text-yellow-300">
                TRA CỨU VÉ SỐ
              </h2>
              <p className="text-[10px] font-semibold tracking-widest text-amber-200/80 uppercase">
                Nhập số & ngày để tự động dò tất cả giải
              </p>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCheck} className="p-6 space-y-5 flex-1">
            
            {/* Input: Ticket Number */}
            <div className="space-y-1.5">
              <label htmlFor="ticket-number" className="block text-xs uppercase font-extrabold text-stone-500 tracking-wider">
                Số vé cần dò
              </label>
              <div className="relative">
                <input
                  id="ticket-number"
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="000 000"
                  className="w-full text-center font-mono text-4xl font-extrabold tracking-widest text-red-700 bg-amber-50/40 border-2 border-amber-300/60 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-2xl py-3.5 outline-none transition-all placeholder:text-stone-300 shadow-inner"
                  required
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] text-stone-400 font-bold uppercase pointer-events-none">
                  {inputValue.replace(/\s+/g, "").length}/7 số
                </span>
              </div>
            </div>

            {/* Input: Date Picker */}
            <div className="space-y-1.5">
              <label htmlFor="draw-date" className="block text-xs uppercase font-extrabold text-stone-500 tracking-wider">
                Ngày mở thưởng
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <input
                  id="draw-date"
                  type="date"
                  value={drawDate}
                  max={maxDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-amber-50/40 border-2 border-amber-300/60 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-2xl text-stone-800 placeholder-stone-400 outline-none transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* Check Button */}
            <button
              type="submit"
              disabled={loading || !inputValue.replace(/\s+/g, "") || !drawDate}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-700 via-amber-500 to-red-700 hover:from-red-600 hover:via-amber-400 hover:to-red-600 active:scale-[0.98] disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-cinzel font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all duration-300 tracking-wider uppercase border border-amber-400/40 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang Dò Kết Quả...
                  </>
                ) : (
                  <>
                    Tra Cứu Kết Quả 🎯
                  </>
                )}
              </span>
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>

          </form>

          {/* Decorative Serrated Torn Ticket Edge */}
          <div className="relative w-full h-4 bg-[#fffdf8] -mt-1">
            <div className="absolute left-0 right-0 bottom-0 h-3 bg-gradient-to-t from-black/5 to-transparent"></div>
            <div className="absolute left-0 right-0 -bottom-3 h-3 bg-repeat-x bg-[length:16px_10px]" style={{
              backgroundImage: `radial-gradient(circle at 8px -5px, transparent 8px, #fffdf8 8px)`
            }}></div>
          </div>

        </div>

        {/* Results Area */}
        <div className="w-full mt-2">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 animate-fade-in-up">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-red-500/10 border-b-red-600 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                  🔮
                </div>
              </div>
              <p className="mt-4 text-amber-200/90 text-sm font-semibold tracking-wide animate-pulse">
                Đang quay lồng cầu, đối chiếu số vé...
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4 animate-fade-in-up">
              
              {result.error && (
                <div className="bg-red-950/60 border border-red-500/40 text-red-200 rounded-2xl p-5 text-center shadow-lg">
                  <div className="text-3xl mb-2">⚠️</div>
                  <h3 className="font-bold text-lg">Đã xảy ra lỗi</h3>
                  <p className="text-sm text-red-300/80 mt-1">{result.error}</p>
                </div>
              )}

              {!result.error && result.matched && (
                <div className="flex flex-col gap-4">
                  {/* Total matches banner */}
                  <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/30 rounded-2xl p-4 text-center">
                    <span className="text-3xl">🎉</span>
                    <h2 className="font-cinzel text-xl font-extrabold text-yellow-300 mt-1">TRÚNG THƯỞNG RỒI!</h2>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Chúc mừng bạn đã trúng <strong className="text-yellow-400">{result.matches.length}</strong> giải trong kỳ quay ngày {formatDateVN(drawDate)}
                    </p>
                  </div>

                  {/* Stacked matches list */}
                  <div className="flex flex-col gap-3 relative mt-2 min-h-[100px]">
                    <ConfettiShower />
                    {result.matches.map((m, i) => (
                      <PrizeCard key={i} m={m} i={i} total={result.matches.length} />
                    ))}
                  </div>
                </div>
              )}

              {!result.error && !result.matched && (
                <div className="bg-[#fffdf9] text-stone-900 border-2 border-stone-300 rounded-2xl overflow-hidden shadow-xl p-8 text-center relative">
                  {/* Top orange status line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400"></div>

                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 shadow-inner border border-amber-100">
                    🍀
                  </div>

                  <h3 className="font-cinzel text-xl font-bold text-stone-700 tracking-wide">
                    Không trúng thưởng
                  </h3>
                  
                  <p className="text-stone-600 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                    Vé số <strong className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-base">{inputValue}</strong> mở thưởng ngày <strong>{formatDateVN(drawDate)}</strong> chưa trúng giải nào.
                  </p>

                  <div className="mt-5 p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 text-stone-500 text-xs italic">
                    {"\"Chúc bạn may mắn lần sau! Thần tài gõ cửa, tài lộc ngập tràn sẽ gõ cửa nhà bạn ở những tờ vé tiếp theo.\""}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer info and stats */}
        <footer className="w-full mt-8 border-t border-amber-950/40 pt-6 text-center text-xs text-stone-500 space-y-4">
          
          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 bg-[#250d0d] border border-amber-950/60 rounded-xl p-3 text-[10px]">
              <div className="text-center">
                <span className="block text-stone-400 uppercase font-bold">Kỳ quay</span>
                <span className="text-amber-400 font-extrabold text-sm">{stats.total_draws.toLocaleString()}</span>
              </div>
              <div className="text-center border-x border-amber-950/60">
                <span className="block text-stone-400 uppercase font-bold">Giải thưởng</span>
                <span className="text-amber-400 font-extrabold text-sm">{stats.total_prizes.toLocaleString()}</span>
              </div>
              <div className="text-center">
                <span className="block text-stone-400 uppercase font-bold">Tổng lượt dò</span>
                <span className="text-amber-400 font-extrabold text-sm">{stats.total_checks.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* System connection info */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? "bg-green-500" : apiConnected === false ? "bg-red-500" : "bg-stone-500 animate-pulse"}`}></span>
              Trạng thái: {apiConnected ? "Đã kết nối" : apiConnected === false ? "Mất kết nối server" : "Đang kiểm tra..."}
            </span>
            <span className="text-stone-600">•</span>
            <span>Cập nhật: Tự động hàng ngày (16:30 - 18:30)</span>
          </div>

          <p className="text-[10px] text-stone-600">
            Dữ liệu đối chiếu chéo từ Minh Ngọc & XS Kiến Thiết • Dùng cho mục đích tham khảo cứu hộ
          </p>

          <div className="flex justify-center gap-4 pt-1">
            <a
              href="https://github.com/ThanhTuHermes/lottery-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/60 hover:bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 transition-colors duration-200"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              GitHub Repository
            </a>
          </div>

          <p className="text-[9px] text-stone-700">
            © 2026 Lottery Checker | ThanhTuHermes
          </p>

        </footer>

      </div>
    </main>
  );
}

