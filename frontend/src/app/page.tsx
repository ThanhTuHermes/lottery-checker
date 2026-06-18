"use client";

import { useState } from "react";

interface Match {
  region: string;
  province: string;
  prize: string;
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

const PRIZE_LABELS: Record<string, string> = {
  dac_biet: "Giải Đặc Biệt",
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

export default function Home() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber || !drawDate) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber: ticketNumber.trim(), drawDate }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ matched: false, matches: [], error: "Lỗi kết nối server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-lg">
            XS
          </div>
          <div>
            <h1 className="text-xl font-bold">Dò Vé Số Kiến Thiết</h1>
            <p className="text-xs text-gray-400">Tra cứu nhanh — Tất cả các đài Miền Nam, Trung, Bắc</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Form */}
        <form onSubmit={handleCheck} className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ticket Number */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Số vé cần dò
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{2,7}"
                maxLength={7}
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="VD: 795785"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg tracking-widest font-mono"
                required
              />
            </div>

            {/* Draw Date */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ngày mở thưởng
              </label>
              <input
                type="date"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={loading || !ticketNumber || !drawDate}
                className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang dò...
                  </span>
                ) : (
                  "Dò Vé Số 🎯"
                )}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500 text-center">
            Chỉ cần nhập số vé + ngày → hệ thống tự dò trên tất cả các đài
          </p>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-6">
            {result.error ? (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-xl p-4 text-yellow-200 text-center">
                ⚠️ {result.error}
              </div>
            ) : result.matched ? (
              <div className="space-y-3">
                <div className="bg-green-900/30 border border-green-600 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-1">🎉</div>
                  <h2 className="text-xl font-bold text-green-400">TRÚNG THƯỞNG!</h2>
                  <p className="text-sm text-gray-300">
                    Số <span className="font-mono font-bold text-white">{ticketNumber}</span> —{" "}
                    Ngày {drawDate}
                  </p>
                </div>

                {result.matches.map((m, i) => (
                  <div
                    key={i}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {PRIZE_LABELS[m.prize] || m.prize}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Đài: <span className="text-white font-medium">{m.province}</span>
                          <span className="mx-2 text-gray-600">|</span>
                          Vùng: <span className="text-white">{REGION_LABELS[m.region] || m.region}</span>
                        </p>
                        <p className="text-gray-400 text-sm">
                          Mã vé: <span className="font-mono text-white">{m.draw_code}</span>
                          <span className="mx-2 text-gray-600">|</span>
                          Số trúng: <span className="font-mono text-green-400">{m.winning_number}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          m.days_left > 7
                            ? "bg-green-900/50 text-green-400"
                            : m.days_left > 0
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-red-900/50 text-red-400"
                        }`}>
                          {m.days_left > 0
                            ? `Còn ${m.days_left} ngày`
                            : "HẠN ĐỔI"}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Hạn: {m.claim_deadline}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">😔</div>
                <h2 className="text-lg font-semibold text-gray-300">Không trúng</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Số <span className="font-mono">{ticketNumber}</span> không trúng giải nào ngày {drawDate}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-600">
          <p>Dữ liệu được crawl từ minhngoc.net.vn + xskt.com.vn (đối chiéo 2 nguồn)</p>
          <p className="mt-1">© 2026 Lottery Checker — Không liên kết với tổ chức xổ số chính thức</p>
        </footer>
      </div>
    </main>
  );
}
