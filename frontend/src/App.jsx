import { useState, useEffect, useRef } from "react";

const API = "https://qafds-project.onrender.com";

const TEST_CARDS = [
  { label: "✅ Normal Payment",    number: "4242424242424242", exp_month: 12, exp_year: 2026, cvc: "123", color: "#00f5d4" },
  { label: "🚨 High Fraud Risk",   number: "4100000000000019", exp_month: 12, exp_year: 2026, cvc: "123", color: "#ff3366" },
  { label: "⚠️ Medium Risk",       number: "4000000000009235", exp_month: 12, exp_year: 2026, cvc: "123", color: "#ffd60a" },
  { label: "❌ Card Declined",     number: "4000000000000002", exp_month: 12, exp_year: 2026, cvc: "123", color: "#a78bfa" },
  { label: "💰 Insufficient Funds",number: "4000000000009995", exp_month: 12, exp_year: 2026, cvc: "123", color: "#fb923c" },
  { label: "🌍 International Card",number: "4000000000000077", exp_month: 12, exp_year: 2026, cvc: "123", color: "#60a5fa" },
];

const MERCHANTS  = ["Amazon","Netflix","Uber","Airbnb","Apple","Steam","Zomato","Flipkart","Myntra","PayTM"];
const CITIES     = ["Mumbai","Delhi","Bangalore","Chennai","Hyderabad","New York","London","Dubai","Singapore","Tokyo"];
const CATEGORIES = ["E-Commerce","Travel","Gaming","Food","Retail","Crypto","SaaS","Healthcare","Luxury","Finance"];

// ── Tiny components ────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00f5d4", height = 50, width = 220 }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sg${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function RiskRing({ score, size = 64 }) {
  const r    = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(score || 0, 1);
  const col  = score > 0.75 ? "#ff3366" : score > 0.45 ? "#ffd60a" : "#00f5d4";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.34,1.56,.64,1), stroke 0.3s" }} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono',monospace">
        {((score || 0) * 100).toFixed(0)}%
      </text>
    </svg>
  );
}

function Badge({ status }) {
  const m = {
    APPROVED: ["rgba(0,245,212,0.12)",  "#00f5d4", "rgba(0,245,212,0.3)"],
    FLAGGED:  ["rgba(255,214,10,0.12)", "#ffd60a", "rgba(255,214,10,0.3)"],
    BLOCKED:  ["rgba(255,51,102,0.12)", "#ff3366", "rgba(255,51,102,0.3)"],
    DECLINED: ["rgba(167,139,250,0.12)","#a78bfa", "rgba(167,139,250,0.3)"],
  };
  const [bg, col, border] = m[status] || m.APPROVED;
  return (
    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 700,
      letterSpacing: 0.5, background: bg, color: col, border: `1px solid ${border}` }}>
      {status}
    </span>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  // ── Authentication state ───────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken,       setAuthToken]       = useState(localStorage.getItem("authToken") || "");
  const [currentUser,     setCurrentUser]     = useState(null);
  const [authMode,        setAuthMode]        = useState("login"); // "login" or "register"
  const [authError,       setAuthError]       = useState("");
  const [authLoading,     setAuthLoading]     = useState(false);
  
  // Auth form inputs
  const [authUsername, setAuthUsername] = useState("demo");
  const [authPassword, setAuthPassword] = useState("demo123");
  const [authEmail,    setAuthEmail]    = useState("");

  const [connected,   setConnected]   = useState(false);
  const [keyInput,    setKeyInput]    = useState("");
  const [keyError,    setKeyError]    = useState("");
  const [connecting,  setConnecting]  = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [stats,        setStats]        = useState({ total:0, fraud:0, blocked:0, saved:0, fraud_rate:0 });
  const [riskHistory,  setRiskHistory]  = useState([]);
  const [activeTab,    setActiveTab]    = useState("dashboard");
  const [selectedTxn,  setSelectedTxn]  = useState(null);
  const seenIds = useRef(new Set());

  // Demo form state
  const [amount,      setAmount]      = useState("1200");
  const [merchant,    setMerchant]    = useState("Amazon");
  const [city,        setCity]        = useState("Mumbai");
  const [category,    setCategory]    = useState("E-Commerce");
  const [selCard,     setSelCard]     = useState(0);
  const [sending,     setSending]     = useState(false);
  const [sendMsg,     setSendMsg]     = useState("");

  // ── Check if user is already authenticated ──────────────────────────────
  useEffect(() => {
    if (authToken) {
      setIsAuthenticated(true);
      // Verify token by fetching current user
      fetch(`${API}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.username) {
            setCurrentUser(data);
          } else {
            localStorage.removeItem("authToken");
            setAuthToken("");
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          localStorage.removeItem("authToken");
          setAuthToken("");
          setIsAuthenticated(false);
        });
    }
  }, []);

  // ──  Authentication functions ──────────────────────────────────────────
  async function handleRegister() {
    if (!authUsername || !authPassword || !authEmail) {
      setAuthError("All fields required");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: authUsername, 
          password: authPassword, 
          email: authEmail 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Registration failed");
        setAuthLoading(false);
        return;
      }
      // Auto-login after registration
      setAuthMode("login");
      setAuthError("");
      setAuthLoading(false);
    } catch (err) {
      setAuthError("Registration failed: " + err.message);
      setAuthLoading(false);
    }
  }

  async function handleLogin() {
    if (!authUsername || !authPassword) {
      setAuthError("Username and password required");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: authUsername, 
          password: authPassword 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Login failed");
        setAuthLoading(false);
        return;
      }
      // Store token and set authenticated
      localStorage.setItem("authToken", data.access_token);
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setAuthError("");
      setAuthLoading(false);
    } catch (err) {
      setAuthError("Login failed: " + err.message);
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    setAuthToken("");
    setIsAuthenticated(false);
    setCurrentUser(null);
    setConnected(false);
    setKeyInput("");
    setKeyError("");
  }

  // ── Helper with authorization header ──────────────────────────────────
  async function apiCall(path, options = {}) {
    const headers = options.headers || {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return fetch(`${API}${path}`, { ...options, headers });
  }

  // ── Connect ──────────────────────────────────────────────────────────────
  async function connect() {
    if (!keyInput.startsWith("sk_test_")) {
      setKeyError("❌ Must start with sk_test_"); return;
    }
    setConnecting(true); setKeyError("");
    try {
      const res  = await apiCall(`/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setKeyError(`❌ ${data.detail}`); setConnecting(false); return; }
      setConnected(true);
      setConnecting(false);
      fetchAll();
    } catch {
      setKeyError("❌ Cannot reach backend. Is it running? See README.");
      setConnecting(false);
    }
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  async function fetchAll() {
    fetchTransactions();
    fetchStats();
  }

  async function fetchTransactions() {
    try {
      const res  = await apiCall(`/api/transactions?limit=50`);
      const data = await res.json();
      if (!data.success) return;
      const newTxns = data.data.filter(t => !seenIds.current.has(t.id));
      newTxns.forEach(t => seenIds.current.add(t.id));
      if (newTxns.length > 0) {
        setTransactions(prev => {
          const merged = [...newTxns, ...prev].slice(0, 300);
          return merged;
        });
        setAlerts(prev => {
          const fraudNew = newTxns.filter(t => t.is_fraud).map(t => ({ ...t, alertId: `ALT-${t.id}` }));
          return [...fraudNew, ...prev].slice(0, 100);
        });
        setRiskHistory(prev => [...prev, ...newTxns.map(t => t.hybrid_score)].slice(-40));
      }
    } catch { /* backend not ready yet */ }
  }

  async function fetchStats() {
    try {
      const res  = await apiCall(`/api/stats`);
      const data = await res.json();
      if (data.total !== undefined) setStats(data);
    } catch { /* ignore */ }
  }

  // Poll every 4 seconds when connected
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [connected]);

  // ── Create transaction ────────────────────────────────────────────────────
  async function createTransaction(cardIdx) {
    setSending(true);
    setSendMsg("⟳ Sending to Stripe...");
    const card = TEST_CARDS[cardIdx ?? selCard];
    try {
      const res  = await fetch(`${API}/api/transaction/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: card.number,
          exp_month:   card.exp_month,
          exp_year:    card.exp_year,
          cvc:         card.cvc,
          amount:      parseFloat(amount) || 100,
          merchant, city, category,
        }),
      });
      const data = await res.json();
      if (data.declined) {
        setSendMsg(`⚠️ Card declined (${data.decline_code}) — logged as DECLINED`);
      } else if (data.success) {
        setSendMsg(`✅ Transaction created! Fraud status: ${data.fraud_status} (${(data.hybrid_score * 100).toFixed(1)}% risk)`);
      } else {
        setSendMsg(`❌ ${data.detail || "Error occurred"}`);
      }
      // Fetch updated transactions after 2s
      setTimeout(fetchAll, 2000);
      setTimeout(fetchAll, 4000);
    } catch {
      setSendMsg("❌ Backend error. Is the backend running?");
    }
    setSending(false);
    setTimeout(() => setSendMsg(""), 5000);
  }

  const statusCol = s => ({ APPROVED:"#00f5d4", FLAGGED:"#ffd60a", BLOCKED:"#ff3366", DECLINED:"#a78bfa" }[s]||"#00f5d4");

  // ════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION SCREEN (show if not authenticated)
  // ════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) return (
    <div style={{ minHeight:"100vh", background:"#050a14", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 10px rgba(0,245,212,0.3)}50%{box-shadow:0 0 28px rgba(0,245,212,0.6)}}
        input:focus{outline:none;border-color:rgba(0,245,212,0.5)!important}
        input::placeholder{color:rgba(255,255,255,0.22)}
      `}</style>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,245,212,0.05) 0%, transparent 70%)" }}/>

      <div style={{ position:"relative", width:500, animation:"fadeUp 0.5s ease" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:60, height:60, borderRadius:14, margin:"0 auto 14px",
            background:"linear-gradient(135deg,#00f5d4,#0080ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, animation:"glow 3s ease-in-out infinite" }}>⚛</div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900,
            color:"#00f5d4", letterSpacing:3 }}>QAFDS</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:2, marginTop:5 }}>
            QUANTUM AI FRAUD DETECTION SYSTEM
          </div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,245,212,0.2)",
          borderRadius:14, padding:32 }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0", marginBottom:14 }}>
              {authMode === "login" ? "LOGIN" : "REGISTER"}
            </div>
          </div>

          {authMode === "login" && (
            <>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>USERNAME</div>
              <input type="text" placeholder="demo" value={authUsername} onChange={e => setAuthUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#e2e8f0", fontFamily:"inherit", marginBottom:14, transition:"border-color 0.2s" }}/>

              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>PASSWORD</div>
              <input type="password" placeholder="demo123" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#e2e8f0", fontFamily:"inherit", marginBottom:14, transition:"border-color 0.2s" }}/>

              {authError && <div style={{ fontSize:11, color:"#ff3366", marginBottom:10 }}>{authError}</div>}
              
              <button onClick={handleLogin} disabled={authLoading} style={{
                width:"100%", padding:13, borderRadius:8, fontSize:11, fontWeight:700,
                letterSpacing:1.5, cursor: authLoading?"wait":"pointer", fontFamily:"inherit",
                background:"rgba(0,245,212,0.12)", color:"#00f5d4",
                border:"1px solid rgba(0,245,212,0.35)", opacity: authLoading ? 0.7:1,
              }}>{authLoading ? "⟳ LOGGING IN..." : "▶ LOGIN"}</button>

              <div style={{ marginTop:14, fontSize:9, color:"rgba(255,255,255,0.4)", textAlign:"center" }}>
                No account? <span onClick={() => {setAuthMode("register"); setAuthError("");}} style={{color:"#00f5d4", cursor:"pointer", textDecoration:"underline"}}>Register here</span>
              </div>
            </>
          )}

          {authMode === "register" && (
            <>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>USERNAME</div>
              <input type="text" placeholder="newuser" value={authUsername} onChange={e => setAuthUsername(e.target.value)}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#e2e8f0", fontFamily:"inherit", marginBottom:14, transition:"border-color 0.2s" }}/>

              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>EMAIL</div>
              <input type="email" placeholder="user@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#e2e8f0", fontFamily:"inherit", marginBottom:14, transition:"border-color 0.2s" }}/>

              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>PASSWORD</div>
              <input type="password" placeholder="secure123" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#e2e8f0", fontFamily:"inherit", marginBottom:14, transition:"border-color 0.2s" }}/>

              {authError && <div style={{ fontSize:11, color:"#ff3366", marginBottom:10 }}>{authError}</div>}
              
              <button onClick={handleRegister} disabled={authLoading} style={{
                width:"100%", padding:13, borderRadius:8, fontSize:11, fontWeight:700,
                letterSpacing:1.5, cursor: authLoading?"wait":"pointer", fontFamily:"inherit",
                background:"rgba(0,245,212,0.12)", color:"#00f5d4",
                border:"1px solid rgba(0,245,212,0.35)", opacity: authLoading ? 0.7:1,
              }}>{authLoading ? "⟳ REGISTERING..." : "▶ CREATE ACCOUNT"}</button>

              <div style={{ marginTop:14, fontSize:9, color:"rgba(255,255,255,0.4)", textAlign:"center" }}>
                Already have an account? <span onClick={() => {setAuthMode("login"); setAuthError("");}} style={{color:"#00f5d4", cursor:"pointer", textDecoration:"underline"}}>Login here</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // CONNECT SCREEN (show if authenticated but not connected)
  // ════════════════════════════════════════════════════════════════════════
  if (!connected) return (
    <div style={{ minHeight:"100vh", background:"#050a14", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 10px rgba(0,245,212,0.3)}50%{box-shadow:0 0 28px rgba(0,245,212,0.6)}}
        input:focus{outline:none;border-color:rgba(0,245,212,0.5)!important}
        input::placeholder{color:rgba(255,255,255,0.22)}
      `}</style>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,245,212,0.05) 0%, transparent 70%)" }}/>

      <div style={{ position:"relative", width:500, animation:"fadeUp 0.5s ease" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:60, height:60, borderRadius:14, margin:"0 auto 14px",
            background:"linear-gradient(135deg,#00f5d4,#0080ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, animation:"glow 3s ease-in-out infinite" }}>⚛</div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900,
            color:"#00f5d4", letterSpacing:3 }}>QAFDS</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:2, marginTop:5 }}>
            QUANTUM AI FRAUD DETECTION SYSTEM
          </div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,245,212,0.2)",
          borderRadius:14, padding:32, position:"relative" }}>

          {/* User info & logout button */}
          {currentUser && (
            <div style={{ position:"absolute", top:16, right:16, fontSize:9, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>
              <div style={{ color:"#00f5d4", fontWeight:700, marginBottom:4 }}>{currentUser.username}</div>
              <button onClick={handleLogout} style={{
                fontSize:8, padding:"4px 8px", background:"rgba(255,51,102,0.2)", color:"#ff3366",
                border:"1px solid rgba(255,51,102,0.3)", borderRadius:4, cursor:"pointer",
              }}>LOGOUT</button>
            </div>
          )}

          {/* Step indicator */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0", marginBottom:14 }}>
              Connect Stripe Sandbox
            </div>
            <div style={{ background:"rgba(0,245,212,0.05)", border:"1px solid rgba(0,245,212,0.15)",
              borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#00f5d4", marginBottom:10, letterSpacing:1 }}>
                ⚡ MAKE SURE BACKEND IS RUNNING FIRST
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.9, fontFamily:"monospace" }}>
                1. Open terminal → cd qafds/backend<br/>
                2. pip install -r requirements.txt<br/>
                3. uvicorn main:app --reload<br/>
                4. Open another terminal → cd qafds/frontend<br/>
                5. npm install → npm start
              </div>
            </div>
          </div>

          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>
            STRIPE TEST KEY (sk_test_...)
          </div>
          <input type="password" placeholder="sk_test_51..."
            value={keyInput} onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
            onKeyDown={e => e.key === "Enter" && connect()}
            style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:12,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
              color:"#e2e8f0", fontFamily:"inherit", marginBottom:8, transition:"border-color 0.2s" }}/>

          {keyError && <div style={{ fontSize:11, color:"#ff3366", marginBottom:10 }}>{keyError}</div>}

          <button onClick={connect} disabled={connecting || !keyInput.trim()} style={{
            width:"100%", padding:13, borderRadius:8, fontSize:11, fontWeight:700,
            letterSpacing:1.5, cursor: connecting?"wait":"pointer", fontFamily:"inherit",
            background:"rgba(0,245,212,0.12)", color:"#00f5d4",
            border:"1px solid rgba(0,245,212,0.35)", opacity: !keyInput.trim()?0.5:1,
          }}>{connecting ? "⟳ CONNECTING..." : "▶ CONNECT TO STRIPE SANDBOX"}</button>

          <div style={{ marginTop:14, fontSize:9, color:"rgba(255,255,255,0.25)", lineHeight:1.8 }}>
            🔒 Key is sent only to your local backend (localhost:8000) — never to any external server.<br/>
            ✅ sk_test_ keys = ₹0 / $0 cost forever.
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:"100vh", background:"#050a14", color:"#e2e8f0",
      fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(0,245,212,0.3);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideIn{from{transform:translateX(-14px);opacity:0}to{transform:none;opacity:1}}
        @keyframes fadeUp{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,245,212,0.3)}50%{box-shadow:0 0 22px rgba(0,245,212,0.6)}}
        .row:hover{background:rgba(0,245,212,0.05)!important;cursor:pointer}
        input:focus,select:focus{outline:none;border-color:rgba(0,245,212,0.5)!important}
        select option{background:#0a1525}
      `}</style>

      {/* BG grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 50% at 20% 10%, rgba(0,245,212,0.05) 0%, transparent 60%)" }}/>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.03 }}>
          <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="#00f5d4" strokeWidth="0.5"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* NAV */}
      <div style={{ position:"sticky", top:0, zIndex:100,
        background:"rgba(5,10,20,0.96)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(0,245,212,0.1)",
        padding:"0 24px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:28, height:28, borderRadius:8,
            background:"linear-gradient(135deg,#00f5d4,#0080ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, animation:"glow 3s ease-in-out infinite" }}>⚛</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"#00f5d4", fontFamily:"'Orbitron',monospace" }}>QAFDS</div>
            <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>STRIPE SANDBOX · LIVE</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:4 }}>
          {["dashboard","demo","transactions","alerts"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:"5px 12px", borderRadius:6, fontSize:10, fontWeight:600,
              letterSpacing:1, textTransform:"uppercase", fontFamily:"inherit", cursor:"pointer",
              background: activeTab===tab ? "rgba(0,245,212,0.14)" : "transparent",
              color: activeTab===tab ? "#00f5d4" : "rgba(255,255,255,0.38)",
              border: activeTab===tab ? "1px solid rgba(0,245,212,0.32)" : "1px solid transparent",
              transition:"all 0.2s",
            }}>{tab}</button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#00f5d4", animation:"pulse 1.5s infinite" }}/>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>STRIPE CONNECTED · POLLING 4s</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ position:"relative", zIndex:1, padding:"20px 24px", maxWidth:1400, margin:"0 auto" }}>

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
              {[
                { label:"Total Transactions", value:stats.total, sub:"from Stripe sandbox",  color:"#00f5d4", icon:"◈" },
                { label:"Fraud Detected",     value:stats.fraud, sub:`${stats.fraud_rate}% rate`, color:"#ff3366", icon:"⚠" },
                { label:"Blocked",            value:stats.blocked, sub:"auto-blocked",        color:"#ffd60a", icon:"🛡" },
                { label:"Amount Saved ($)",   value:`$${(stats.saved||0).toFixed(2)}`, sub:"protected", color:"#a78bfa", icon:"💰" },
              ].map((k,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:18,
                  position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                    background:`linear-gradient(90deg,transparent,${k.color},transparent)` }}/>
                  <div style={{ fontSize:20, marginBottom:8 }}>{k.icon}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:k.color,
                    fontFamily:"'Orbitron',monospace", letterSpacing:-1 }}>{k.value}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:4 }}>{k.label}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Live feed + right panel */}
            <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:14, marginBottom:14 }}>
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)",
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.55)" }}>LIVE STRIPE TRANSACTIONS</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:"#ff3366", animation:"pulse 1s infinite" }}/>
                    <span style={{ fontSize:8, color:"#ff3366", letterSpacing:1 }}>REAL-TIME</span>
                  </div>
                </div>
                <div style={{ maxHeight:340, overflowY:"auto" }}>
                  {transactions.length === 0 ? (
                    <div style={{ padding:36, textAlign:"center", color:"rgba(255,255,255,0.28)", fontSize:11 }}>
                      Go to <span style={{ color:"#00f5d4" }}>DEMO</span> tab → create a test transaction<br/>
                      <span style={{ fontSize:9, display:"block", marginTop:6 }}>Appears here within 4 seconds</span>
                    </div>
                  ) : transactions.slice(0,25).map((t,i) => (
                    <div key={t.id} className="row" onClick={() => setSelectedTxn(t)} style={{
                      padding:"9px 18px",
                      display:"grid", gridTemplateColumns:"auto 1fr auto auto",
                      gap:12, alignItems:"center",
                      borderBottom:"1px solid rgba(255,255,255,0.03)",
                      background: t.is_fraud ? "rgba(255,51,102,0.04)" : "transparent",
                      animation: i===0 ? "slideIn 0.3s ease" : "none",
                    }}>
                      <RiskRing score={t.hybrid_score} size={38}/>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color: t.is_fraud?"#ff3366":"#e2e8f0" }}>
                          {t.merchant}
                          <span style={{ fontSize:8, color:"#00f5d4", marginLeft:6, opacity:0.6 }}>STRIPE</span>
                        </div>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.32)", marginTop:2 }}>
                          {t.card_brand} ···{t.card_last4} · {t.city} · {t.category}
                        </div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700 }}>${(t.amount||0).toFixed(2)}</div>
                      <Badge status={t.status}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:12, padding:20, flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.55)", marginBottom:12 }}>
                    HYBRID RISK SCORE TREND
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <span style={{ fontSize:26, fontWeight:700, color:"#ff3366", fontFamily:"'Orbitron',monospace" }}>
                      {stats.fraud_rate}%
                    </span>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:8 }}>fraud rate</span>
                  </div>
                  <Sparkline data={riskHistory} color="#ff3366" height={55} width={220}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:14 }}>
                    {[["Quantum","96.4%","#00f5d4"],["Classical","91.2%","#a78bfa"],["Hybrid","98.1%","#ffd60a"]].map(([l,v,c])=>(
                      <div key={l} style={{ padding:"8px", background:"rgba(255,255,255,0.03)",
                        borderRadius:7, border:`1px solid ${c}20` }}>
                        <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                        <div style={{ fontSize:8, color:"rgba(255,255,255,0.2)" }}>accuracy</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background:"rgba(0,245,212,0.04)", border:"1px solid rgba(0,245,212,0.14)",
                  borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#00f5d4", marginBottom:8, letterSpacing:1 }}>DATA SOURCE</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:2 }}>
                    ✅ Stripe Sandbox API (Real)<br/>
                    ✅ Stripe Radar Risk Scores<br/>
                    ✅ Quantum-Hybrid ML Model<br/>
                    ✅ FastAPI Backend (localhost)
                  </div>
                </div>
              </div>
            </div>

            {/* Recent alerts */}
            {alerts.length > 0 && (
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.55)" }}>FRAUD ALERTS</span>
                  <span style={{ fontSize:10, color:"#ff3366" }}>{alerts.length} ACTIVE</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)" }}>
                  {alerts.slice(0,3).map((a,i) => (
                    <div key={a.alertId} style={{ padding:16,
                      borderRight: i<2?"1px solid rgba(255,255,255,0.05)":"none",
                      background:"rgba(255,51,102,0.03)", animation:"slideIn 0.4s ease" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:10, color:"#ff3366", fontWeight:700 }}>⚠ {a.status}</span>
                        <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)" }}>{a.processing_time_ms}ms</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{a.merchant}</div>
                      <div style={{ fontSize:17, fontWeight:700, color:"#ff3366", fontFamily:"'Orbitron',monospace", marginBottom:6 }}>
                        ${(a.amount||0).toFixed(2)}
                      </div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.32)", marginBottom:8 }}>
                        {a.anomaly_type} · {a.city} · ···{a.card_last4}
                      </div>
                      {[["Q",a.quantum_score,"#00f5d4"],["C",a.classical_score,"#a78bfa"]].map(([l,v,c])=>(
                        <div key={l} style={{ marginBottom:5 }}>
                          <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", marginBottom:3 }}>{l}-SCORE</div>
                          <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:2 }}>
                            <div style={{ height:"100%", width:`${(v||0)*100}%`, background:c, borderRadius:2 }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DEMO TAB ── */}
        {activeTab === "demo" && (
          <div style={{ animation:"fadeUp 0.35s ease", maxWidth:760, margin:"0 auto" }}>
            <div style={{ padding:"12px 16px", background:"rgba(0,245,212,0.05)",
              border:"1px solid rgba(0,245,212,0.15)", borderRadius:10, marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#00f5d4", marginBottom:5, letterSpacing:1 }}>
                🎯 INTERVIEW DEMO MODE
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>
                Click any card below → real Stripe API transaction fires → appears on dashboard in ~4 seconds with live fraud scoring.
              </div>
            </div>

            {/* Config */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:12, padding:22, marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.5)", marginBottom:16 }}>
                TRANSACTION DETAILS
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"AMOUNT ($)", el: <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:7, fontSize:11,
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                        color:"#e2e8f0", fontFamily:"inherit" }}/> },
                  { label:"MERCHANT", el: <select value={merchant} onChange={e=>setMerchant(e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:7, fontSize:11,
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                        color:"#e2e8f0", fontFamily:"inherit", cursor:"pointer" }}>
                      {MERCHANTS.map(m=><option key={m}>{m}</option>)}</select> },
                  { label:"CITY", el: <select value={city} onChange={e=>setCity(e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:7, fontSize:11,
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                        color:"#e2e8f0", fontFamily:"inherit", cursor:"pointer" }}>
                      {CITIES.map(c=><option key={c}>{c}</option>)}</select> },
                  { label:"CATEGORY", el: <select value={category} onChange={e=>setCategory(e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:7, fontSize:11,
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                        color:"#e2e8f0", fontFamily:"inherit", cursor:"pointer" }}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}</select> },
                ].map((f,i) => (
                  <div key={i}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:5, letterSpacing:1 }}>{f.label}</div>
                    {f.el}
                  </div>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:12, padding:22, marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.5)", marginBottom:16 }}>
                CLICK A CARD TO FIRE REAL STRIPE TRANSACTION
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {TEST_CARDS.map((c,i) => (
                  <button key={i} onClick={() => { setSelCard(i); createTransaction(i); }}
                    disabled={sending}
                    style={{ padding:"14px 16px", borderRadius:10,
                      cursor: sending?"wait":"pointer", textAlign:"left",
                      background: selCard===i ? `${c.color}14` : "rgba(255,255,255,0.03)",
                      border:`1px solid ${selCard===i ? c.color+"45" : "rgba(255,255,255,0.09)"}`,
                      transition:"all 0.2s", fontFamily:"inherit", opacity:sending?0.6:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:c.color, marginBottom:6 }}>{c.label}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:1 }}>
                      ···· ···· ···· {c.number.slice(-4)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {sendMsg && (
              <div style={{ padding:"13px 18px", borderRadius:10, marginBottom:14, fontSize:12, fontWeight:600,
                animation:"slideIn 0.3s ease",
                background: sendMsg.startsWith("✅")?"rgba(0,245,212,0.08)":sendMsg.startsWith("⚠")?"rgba(255,214,10,0.08)":"rgba(255,51,102,0.08)",
                border: `1px solid ${sendMsg.startsWith("✅")?"rgba(0,245,212,0.3)":sendMsg.startsWith("⚠")?"rgba(255,214,10,0.3)":"rgba(255,51,102,0.3)"}`,
                color: sendMsg.startsWith("✅")?"#00f5d4":sendMsg.startsWith("⚠")?"#ffd60a":"#ff3366",
              }}>{sendMsg}</div>
            )}

            {/* Flow diagram */}
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:12, padding:18 }}>
              <div style={{ fontSize:9, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.4)", marginBottom:12 }}>
                WHAT HAPPENS WHEN YOU CLICK
              </div>
              <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 }}>
                {[
                  ["Click card","#60a5fa"],
                  ["Backend called","#00f5d4"],
                  ["Stripe API","#34d399"],
                  ["Radar scores it","#a78bfa"],
                  ["Quantum model","#00f5d4"],
                  ["Dashboard updates","#ffd60a"],
                ].map(([s,c],i,arr) => (
                  <div key={i} style={{ display:"flex", alignItems:"center" }}>
                    <div style={{ padding:"5px 10px", borderRadius:6, fontSize:9, fontWeight:600,
                      color:c, background:`${c}12`, border:`1px solid ${c}28` }}>{s}</div>
                    {i<arr.length-1 && <span style={{ color:"rgba(255,255,255,0.2)", margin:"0 3px" }}>→</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:9, color:"rgba(255,255,255,0.25)" }}>
                Click → dashboard in ~4 seconds · Cost: $0.00 · All via your localhost backend
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "transactions" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"13px 22px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.55)" }}>ALL TRANSACTIONS</span>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.28)" }}>{transactions.length} from Stripe</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr 1fr 0.8fr 0.7fr 0.7fr 0.7fr 80px",
                padding:"8px 22px", fontSize:8, fontWeight:600, letterSpacing:1.5,
                color:"rgba(255,255,255,0.28)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                {["STRIPE ID","MERCHANT","CARD","AMOUNT","Q-SCORE","C-SCORE","HYBRID","STATUS"].map(h=><div key={h}>{h}</div>)}
              </div>
              <div style={{ maxHeight:"72vh", overflowY:"auto" }}>
                {transactions.length===0 ? (
                  <div style={{ padding:36, textAlign:"center", color:"rgba(255,255,255,0.28)", fontSize:11 }}>
                    No transactions yet. Create one in the DEMO tab.
                  </div>
                ) : transactions.map((t,i) => (
                  <div key={t.id} className="row" onClick={() => setSelectedTxn(t)} style={{
                    display:"grid", gridTemplateColumns:"1.6fr 1fr 1fr 0.8fr 0.7fr 0.7fr 0.7fr 80px",
                    padding:"11px 22px", fontSize:11, alignItems:"center",
                    borderBottom:"1px solid rgba(255,255,255,0.03)",
                    background: t.is_fraud?"rgba(255,51,102,0.03)":"transparent",
                    animation: i<2?"slideIn 0.3s ease":"none",
                  }}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.38)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.stripe_id}</div>
                    <div style={{ fontWeight:600, color:t.is_fraud?"#ff3366":"#e2e8f0" }}>{t.merchant}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.42)" }}>{t.card_brand} ···{t.card_last4}</div>
                    <div style={{ fontWeight:700 }}>${(t.amount||0).toFixed(2)}</div>
                    <div style={{ color:t.quantum_score>0.5?"#ff3366":"#00f5d4", fontWeight:600, fontSize:10 }}>{((t.quantum_score||0)*100).toFixed(1)}%</div>
                    <div style={{ color:t.classical_score>0.5?"#ff3366":"#a78bfa", fontWeight:600, fontSize:10 }}>{((t.classical_score||0)*100).toFixed(1)}%</div>
                    <div style={{ color:t.hybrid_score>0.5?"#ffd60a":"#00f5d4", fontWeight:600, fontSize:10 }}>{((t.hybrid_score||0)*100).toFixed(1)}%</div>
                    <Badge status={t.status}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALERTS TAB ── */}
        {activeTab === "alerts" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"13px 22px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, fontWeight:600, letterSpacing:1.5, color:"rgba(255,255,255,0.55)" }}>FRAUD ALERT LOG</span>
                <span style={{ fontSize:10, color:"#ff3366" }}>{alerts.length} DETECTED</span>
              </div>
              <div style={{ maxHeight:"75vh", overflowY:"auto" }}>
                {alerts.length===0 ? (
                  <div style={{ padding:36, textAlign:"center", color:"rgba(255,255,255,0.28)", fontSize:11 }}>
                    No fraud alerts yet. Use <span style={{ color:"#ffd60a" }}>🚨 High Fraud Risk</span> card in DEMO tab.
                  </div>
                ) : alerts.map((a,i) => (
                  <div key={a.alertId} style={{ padding:"15px 22px",
                    borderBottom:"1px solid rgba(255,255,255,0.04)",
                    display:"grid", gridTemplateColumns:"auto 1fr auto auto",
                    gap:18, alignItems:"center",
                    background:"rgba(255,51,102,0.02)",
                    animation:i<2?"slideIn 0.4s ease":"none" }}>
                    <RiskRing score={a.hybrid_score} size={58}/>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{a.merchant}</span>
                        {a.anomaly_type && (
                          <span style={{ fontSize:8, color:"#ff3366", background:"rgba(255,51,102,0.12)",
                            padding:"2px 6px", borderRadius:4, border:"1px solid rgba(255,51,102,0.3)" }}>
                            {a.anomaly_type}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.32)", marginBottom:5 }}>
                        {a.stripe_id} · {a.card_brand} ···{a.card_last4} · {a.city}
                      </div>
                      <div style={{ display:"flex", gap:14 }}>
                        {[["Stripe Risk",a.stripe_risk_score,"#60a5fa"],["Quantum",`${((a.quantum_score||0)*100).toFixed(1)}%`,"#00f5d4"],["Classical",`${((a.classical_score||0)*100).toFixed(1)}%`,"#a78bfa"],["Hybrid",`${((a.hybrid_score||0)*100).toFixed(1)}%`,"#ffd60a"]].map(([l,v,c])=>(
                          <div key={l}><span style={{ fontSize:8, color:"rgba(255,255,255,0.28)" }}>{l}: </span>
                            <span style={{ fontSize:9, color:c, fontWeight:700 }}>{v}</span></div>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:17, fontWeight:700, color:"#ff3366", fontFamily:"'Orbitron',monospace" }}>
                        ${(a.amount||0).toFixed(2)}
                      </div>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", marginTop:3 }}>
                        {new Date(a.timestamp*1000).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge status={a.status}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedTxn && (
        <div onClick={() => setSelectedTxn(null)} style={{
          position:"fixed", inset:0, zIndex:200,
          background:"rgba(0,0,0,0.82)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0a1525", border:"1px solid rgba(0,245,212,0.2)",
            borderRadius:14, padding:26, width:480,
            animation:"fadeUp 0.3s ease", maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:selectedTxn.is_fraud?"#ff3366":"#00f5d4", marginBottom:4 }}>
                  {selectedTxn.is_fraud ? "⚠ FRAUD DETECTED" : "✓ LEGITIMATE TRANSACTION"}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)" }}>{selectedTxn.stripe_id}</div>
                <div style={{ fontSize:9, color:"#00f5d4", opacity:0.65, marginTop:2 }}>SOURCE: STRIPE SANDBOX</div>
              </div>
              <RiskRing score={selectedTxn.hybrid_score} size={68}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              {[
                ["Merchant",        selectedTxn.merchant],
                ["Amount",          `$${(selectedTxn.amount||0).toFixed(2)} ${selectedTxn.currency}`],
                ["Card",            `${selectedTxn.card_brand} ···${selectedTxn.card_last4}`],
                ["Card Country",    selectedTxn.card_country],
                ["City",            selectedTxn.city],
                ["Category",        selectedTxn.category],
                ["Status",          selectedTxn.status],
                ["Stripe Risk",     `${selectedTxn.stripe_risk_score} (${selectedTxn.stripe_risk_level})`],
                ["Quantum Score",   `${((selectedTxn.quantum_score||0)*100).toFixed(2)}%`],
                ["Classical Score", `${((selectedTxn.classical_score||0)*100).toFixed(2)}%`],
                ["Hybrid Score",    `${((selectedTxn.hybrid_score||0)*100).toFixed(2)}%`],
                ["Processing",      `${selectedTxn.processing_time_ms}ms`],
                ...(selectedTxn.anomaly_type?[["Anomaly",selectedTxn.anomaly_type]]:[]),
              ].map(([k,v])=>(
                <div key={k} style={{ padding:"8px 11px", background:"rgba(255,255,255,0.03)",
                  borderRadius:7, border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setSelectedTxn(null)} style={{
              marginTop:14, width:"100%", padding:11, borderRadius:8,
              background:"rgba(0,245,212,0.08)", border:"1px solid rgba(0,245,212,0.22)",
              color:"#00f5d4", fontSize:11, fontWeight:700, letterSpacing:1.5,
              cursor:"pointer", fontFamily:"inherit" }}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
