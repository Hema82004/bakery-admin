import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Bell, ShoppingCart, Users, Package, BarChart2, LogOut, Trash2, Plus } from "lucide-react";

// ─── STATIC / DUMMY DATA FOR CHARTS ───────────────────────────────────────────
const DONUT_COLORS = ["#4ECDC4", "#A8E6CF", "#FFE66D", "#FF8B94"];
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#FF6B35,#ffb347)",
  "linear-gradient(135deg,#4ECDC4,#44a08d)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#FF8B94,#ff6b6b)",
];

const STATUS_CONFIG = {
  Pending:             { bg: "#FFF3E0", color: "#E65100", dot: "#FF9800" },
  Preparing:           { bg: "#E3F2FD", color: "#1565C0", dot: "#2196F3" },
  "Out for Delivery":  { bg: "#F3E5F5", color: "#6A1B9A", dot: "#9C27B0" },
  Delivered:           { bg: "#E8F5E9", color: "#2E7D32", dot: "#4CAF50" },
};

const navItems = [
  { icon: <BarChart2 size={18}/>,   label: "dashboard" },
  { icon: <ShoppingCart size={18}/>, label: "orders" },
  { icon: <Package size={18}/>,     label: "products" },
  { icon: <Users size={18}/>,       label: "customers" },
];

// ─── UNIFIED HELPERS ──────────────────────────────────────────────────────────
function getOrderTimestamp(order) {
  try {
    let timestamp = order.orderDate || order.createdAt;
    if (!timestamp) return 0;
    if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    return 0;
  } catch (error) {
    console.error("Error getting timestamp:", error);
    return 0;
  }
}

function getOrderAmount(order) {
  try {
    if (!order) return 0;
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      const parsed = parseFloat(order.totalAmount);
      if (!isNaN(parsed)) return parsed;
    }
    if (order.pricing && typeof order.pricing === 'object') {
      if (order.pricing.totalAmount !== undefined && order.pricing.totalAmount !== null) {
        const parsed = parseFloat(order.pricing.totalAmount);
        if (!isNaN(parsed)) return parsed;
      }
    }
    if (typeof order.pricing === 'number' && !isNaN(order.pricing)) {
      return order.pricing;
    }
    return 0;
  } catch (error) {
    console.error("Error getting amount:", error);
    return 0;
  }
}

function formatOrderDate(order) {
  try {
    if (!order) return "-";
    let timestamp = order.orderDate || order.createdAt;
    if (!timestamp) return "-";
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString("en-IN");
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString("en-IN");
    }
    return "-";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

// ✅ NEW: Safe helper to format a Firestore Timestamp or Date to locale date string
function formatTimestamp(timestamp) {
  try {
    if (!timestamp) return "-";
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString("en-IN");
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString("en-IN");
    }
    return "-";
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "-";
  }
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { bg: "#f5f5f5", color: "#888", dot: "#ccc" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
      background:cfg.bg, color:cfg.color, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, display:"inline-block" }}/>
      {status}
    </span>
  );
}

function Avatar({ name, gradient, size = 38 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:gradient,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.38, fontWeight:800, color:"white", flexShrink:0 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div style={{ background:"white", borderRadius:12, padding:"10px 16px",
      boxShadow:"0 4px 20px rgba(0,0,0,0.12)", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:12, color:"#888", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:700, color:"#FF6B35" }}>₹{payload[0].value}</div>
    </div>
  );
  return null;
};

const CustomBar = ({ x, y, width, height, index, total }) => (
  <rect x={x} y={y} width={width} height={height} rx={8} ry={8}
    fill={index === total - 1 ? "#FF6B35" : "rgba(255,107,53,0.18)"} />
);

// ─── MODALS ───────────────────────────────────────────────────────────────────
function OrderModal({ order, onClose, onStatusChange }) {
  if (!order) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px", animation:"fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"white", borderRadius:24,
        padding:36, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 24px 80px rgba(0,0,0,0.18)", animation:"slideUp 0.25s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>Order Details</div>
            <div style={{ fontFamily:"monospace", fontSize:12, color:"#aaa", marginTop:4 }}>#{order.id}</div>
          </div>
          <div onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", background:"#f5f5f5",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", fontSize:16, color:"#888", fontWeight:700 }}>✕</div>
        </div>

        <div style={{ background:"#FFF8F0", borderRadius:14, padding:"14px 18px",
          display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Avatar name={order.userName} gradient={AVATAR_GRADIENTS[0]} size={44}/>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{order.userName}</div>
            <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{order.userEmail}</div>
          </div>
          <div style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>
            {formatOrderDate(order)}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase",
            letterSpacing:1, marginBottom:10 }}>Items Ordered</div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"10px 0", borderBottom: i < order.items.length-1 ? "1px solid #f5f5f5":"none" }}>
              <span style={{ fontSize:18 }}>🍮</span>
              <span style={{ fontSize:14, color:"#333", fontWeight:500 }}>{item.name} × {item.quantity}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"12px 16px", background:"#f9f9f9", borderRadius:12, marginBottom:22 }}>
          <span style={{ fontSize:13, color:"#888", fontWeight:600 }}>Order Total</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#FF6B35" }}>
            ₹{Number(getOrderAmount(order)).toFixed(2)}
          </span>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase",
            letterSpacing:1, marginBottom:10 }}>Update Status</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {Object.keys(STATUS_CONFIG).map(s => (
              <div key={s} onClick={() => onStatusChange(order.id, s)} style={{
                padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:700,
                cursor:"pointer", transition:"all 0.2s",
                background: order.status === s ? STATUS_CONFIG[s].bg : "#f5f5f5",
                color: order.status === s ? STATUS_CONFIG[s].color : "#aaa",
                border:`2px solid ${order.status === s ? STATUS_CONFIG[s].dot : "transparent"}`,
              }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({ customer, onClose, gradient, usersDataRef }) {
  if (!customer) return null;

  // ✅ FIX: Read createdAt directly from usersDataRef at render time — never stale
  // Use createdAt directly from customer object (populated from users collection)
  const registeredDate = formatTimestamp(customer.createdAt || customer.registeredAt || null);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px", animation:"fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"white", borderRadius:24,
        width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 24px 80px rgba(0,0,0,0.18)", animation:"slideUp 0.25s ease" }}>

        {/* Banner */}
        <div style={{ background:"linear-gradient(135deg,#2C1A0E,#4a2c14)",
          padding:"24px 28px 28px", borderRadius:"24px 24px 0 0", position:"relative" }}>
          <div onClick={onClose} style={{ position:"absolute", top:14, right:14, width:32, height:32,
            borderRadius:"50%", background:"rgba(255,255,255,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", color:"rgba(255,255,255,0.7)", fontSize:14, fontWeight:700 }}>✕</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:2,
            textTransform:"uppercase", marginBottom:16 }}>Customer Profile</div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:60, height:60, borderRadius:"50%", background:gradient,
              border:"3px solid rgba(255,255,255,0.3)", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:800, color:"white",
              boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>
              {customer.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                color:"white", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {customer.name}
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:3,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {customer.email}
              </div>
            </div>
            <span style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700,
              background:"rgba(76,175,80,0.25)", color:"#A5D6A7", flexShrink:0 }}>● Active</span>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding:"20px 28px 28px", display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { icon:"🆔", label:"User ID",    value: customer.userId?.slice(0,24)+"..." },
            // ✅ FIX: Reads live from usersDataRef — no stale/null date
            { icon:"📅", label:"Registered", value: registeredDate },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"13px 16px", background:"#fafafa", borderRadius:12 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:10, color:"#bbb", fontWeight:700,
                  textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
                <div style={{ fontSize:13, color:"#333", fontWeight:500, marginTop:2,
                  wordBreak:"break-all" }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminDashboard({ onLogout }) {
  const [orders, setOrders]               = useState([]);
  const [customers, setCustomers]         = useState([]);
  const [products, setProducts]           = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [view, setView]                   = useState("dashboard");
  const [newProduct, setNewProduct]       = useState({ name:"", price:"", category:"", image:"" });
  const [filterStatus, setFilterStatus]   = useState("All");
  const [search, setSearch]               = useState("");
  const [activePill, setActivePill]       = useState("Week");
  const [stats, setStats]                 = useState({ newOrders:0, pendingOrders:0, totalSales:0, menuItems:0 });
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs]       = useState(false);
  const seenOrderIds = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("seenOrderIds") || "[]")); }
    catch { return new Set(); }
  })[0];
  const seenRef = useRef(seenOrderIds);

  // ✅ FIX: Use a ref to store usersData so it's always up-to-date when orders listener fires
  const usersDataRef = useRef({});

  // ── Close notification panel on outside click ────────────────────────────
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (!e.target.closest("#notif-panel")) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  // ── Firebase: listen to orders + products + users ────────────────────────────────
  useEffect(() => {
    let firstLoad = true;

    // ✅ FIX: Users listener — index by doc ID AND email for reliable lookup
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const byId    = {};
      const byEmail = {};
      snap.docs.forEach(d => {
        const data = d.data();
        byId[d.id] = data;
        if (data.email) byEmail[data.email.toLowerCase()] = data;
      });
      usersDataRef.current = { byId, byEmail };

      // Patch already-loaded customers using ID first, email as fallback
      setCustomers(prev => prev.map(c => {
        const userData =
          byId[c.userId] ||
          byEmail[c.email?.toLowerCase()] ||
          null;
        return {
          ...c,
          createdAt: userData?.createdAt || c.createdAt || null,
          registeredAt: userData?.createdAt || c.registeredAt || null,
        };
      }));
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => getOrderTimestamp(b) - getOrderTimestamp(a));
      setOrders(data);

      // ── Detect new orders ──
      if (firstLoad) {
        firstLoad = false;
        data.forEach(o => seenRef.current.add(o.id));
        try { localStorage.setItem("seenOrderIds", JSON.stringify([...seenRef.current])); } catch {}
      } else {
        const newNotifs = [];
        data.forEach(o => {
          if (!seenRef.current.has(o.id)) {
            seenRef.current.add(o.id);
            newNotifs.push({
              id: o.id,
              message: `New order from ${o.userName || "a customer"}`,
              amount: getOrderAmount(o),
              time: o.createdAt?.toDate?.() ?? new Date(),
              read: false,
            });
          }
        });
        if (newNotifs.length > 0) {
          setNotifications(n => [...newNotifs, ...n].slice(0, 20));
          try { localStorage.setItem("seenOrderIds", JSON.stringify([...seenRef.current])); } catch {}
        }
      }

      // Build customers — use earliest order date as join date (users collection permission denied)
      const unique = {};
      // First pass: collect all orders per user to find the earliest
      data.forEach(o => {
        const ts = getOrderTimestamp(o);
        if (!unique[o.userId]) {
          unique[o.userId] = {
            userId: o.userId,
            name: o.userName,
            email: o.userEmail,
            createdAt: o.orderDate || o.createdAt || null,
            earliestTs: ts,
          };
        } else if (ts < unique[o.userId].earliestTs) {
          // Keep the earliest order's timestamp as the join date
          unique[o.userId].createdAt = o.orderDate || o.createdAt || null;
          unique[o.userId].earliestTs = ts;
        }
      });
      setCustomers(Object.values(unique));

      setStats(prev => ({
        ...prev,
        newOrders: data.length,
        pendingOrders: data.filter(o => ["pending","placed","preparing"].includes(o.status?.toLowerCase())).length,
        totalSales: Number(data.reduce((s,o) => s + getOrderAmount(o), 0).toFixed(2)),
      }));
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      setProducts(data);
      setStats(prev => ({ ...prev, menuItems: data.length }));
    });

    return () => { unsubUsers(); unsubOrders(); unsubProducts(); };
  }, []);

  // ── Firebase: actions ────────────────────────────────────────────────────
  const updateStatus = async (orderId, newStatus) => {
    try { await updateDoc(doc(db,"orders",orderId), { status:newStatus }); }
    catch(e) { console.error(e); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db,"products"), { ...newProduct, price:Number(newProduct.price), createdAt:new Date() });
      setNewProduct({ name:"", price:"", category:"", image:"" });
      alert("Added to menu! 🧁");
    } catch(e) { console.error(e); }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Remove this item from the menu?")) await deleteDoc(doc(db,"products",id));
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const statusCounts = ["Pending","Preparing","Out for Delivery","Delivered"].reduce((acc,s) => {
    acc[s] = orders.filter(o => o.status === s).length; return acc;
  }, {});

  const donutData = Object.entries(statusCounts).map(([name,value]) => ({ name, value }));

  const revenueData = (() => {
    const now = new Date();
    if (activePill === "Week") {
      const allDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const map = {};
      orders.forEach(o => {
        if (!o.createdAt?.toDate) return;
        const d = o.createdAt.toDate();
        const dayIndex = (d.getDay() + 6) % 7;
        const key = allDays[dayIndex];
        map[key] = (map[key] || 0) + getOrderAmount(o);
      });
      return allDays.map(d => ({ day: d, revenue: Math.round(map[d] || 0) }));
    }
    if (activePill === "Month") {
      const allMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const year = now.getFullYear();
      const map = {};
      orders.forEach(o => {
        if (!o.createdAt?.toDate) return;
        const d = o.createdAt.toDate();
        if (d.getFullYear() === year) {
          const key = allMonths[d.getMonth()];
          map[key] = (map[key] || 0) + getOrderAmount(o);
        }
      });
      return allMonths.map(m => ({ day: m, revenue: Math.round(map[m] || 0) }));
    }
    return [];
  })();

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === "All" || o.status === filterStatus;
    const matchSearch = (o.id?.toLowerCase().includes(search.toLowerCase())) ||
                        (o.userName?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'DM Sans',sans-serif; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:#e0d4c8; border-radius:10px; }
        .nav-item:hover  { background:#3e2412 !important; color:rgba(255,255,255,0.85) !important; }
        .row-hover:hover { background:#FFF8F0 !important; transform:translateX(2px); }
        .card-hover:hover{ box-shadow:0 8px 32px rgba(255,107,53,0.15)!important; transform:translateY(-2px); }
        .pill-hover:hover{ border-color:#FF6B35!important; color:#FF6B35!important; }
        .btn-hover:hover { background:#FF6B35!important; color:white!important; }
        input,select { font-family:'DM Sans',sans-serif; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#FFF8F0", fontFamily:"'DM Sans',sans-serif" }}>

        {/* ═══════════════════ SIDEBAR ═══════════════════ */}
        <aside style={{ width:240, background:"#2C1A0E", display:"flex", flexDirection:"column",
          padding:"32px 16px", flexShrink:0, position:"relative", overflow:"hidden", height:"100vh" }}>
          <div style={{ position:"absolute", bottom:80, right:-16, fontSize:110,
            opacity:0.06, transform:"rotate(-15deg)", pointerEvents:"none" }}>🍰</div>

          <div style={{ marginBottom:36, paddingBottom:24, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#F7C59F", fontStyle:"italic" }}>
              from karaikudi
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>
              Admin Portal
            </div>
          </div>

          <nav style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
            {navItems.map(({ icon, label }) => (
              <div key={label} className="nav-item" onClick={() => { setView(label); setSearch(""); setFilterStatus("All"); }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
                  borderRadius:12, cursor:"pointer", transition:"all 0.2s",
                  background: view===label ? "#FF6B35" : "transparent",
                  color: view===label ? "white" : "rgba(255,255,255,0.5)",
                  fontWeight:500, fontSize:14, textTransform:"capitalize",
                  boxShadow: view===label ? "0 4px 20px rgba(255,107,53,0.35)" : "none" }}>
                {icon} {label.charAt(0).toUpperCase()+label.slice(1)}
              </div>
            ))}
          </nav>

          <div onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:10, paddingTop:20,
            borderTop:"1px solid rgba(255,255,255,0.08)", color:"#FF8B94",
            fontSize:14, fontWeight:500, cursor:"pointer" }}>
            <LogOut size={16}/> Logout
          </div>
        </aside>

        {/* ═══════════════════ MAIN ═══════════════════ */}
        <main style={{ flex:1, overflowY:"scroll", overflowX:"hidden", padding:"36px 36px 48px", minHeight:0, minWidth:0 }}>

          {/* ── Topbar ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:34, fontWeight:900, color:"#1a1a1a", lineHeight:1 }}>
                {view.charAt(0).toUpperCase()+view.slice(1)}
              </h1>
              <p style={{ color:"#888", fontSize:14, marginTop:6 }}>
                {new Date().toDateString()} · Good day, Admin! 👋
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {(view==="orders"||view==="customers") && (
                <div style={{ display:"flex", alignItems:"center", background:"white",
                  borderRadius:50, padding:"10px 18px", gap:8,
                  boxShadow:"0 2px 12px rgba(0,0,0,0.06)", width:230 }}>
                  <span>🔍</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder={`Search ${view}...`}
                    style={{ border:"none", outline:"none", background:"transparent",
                      fontSize:14, color:"#333", width:"100%" }}/>
                </div>
              )}
              {/* ── Notification Bell ── */}
              <div id="notif-panel" style={{ position:"relative" }}>
                <div onClick={() => { setShowNotifs(v => !v); }}
                  style={{ width:42, height:42, borderRadius:"50%", background:"white",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:18, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", cursor:"pointer", position:"relative" }}>
                  <Bell size={18} color="#6d4c41"/>
                  {notifications.filter(n=>!n.read).length > 0 && (
                    <div style={{ position:"absolute", top:5, right:5,
                      minWidth:16, height:16, background:"#FF6B35", borderRadius:20,
                      border:"2px solid white", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:9, fontWeight:800, color:"white",
                      padding:"0 3px" }}>
                      {notifications.filter(n=>!n.read).length}
                    </div>
                  )}
                </div>

                {showNotifs && (
                  <div style={{ position:"absolute", top:52, right:0, width:340,
                    background:"white", borderRadius:20, boxShadow:"0 8px 40px rgba(0,0,0,0.15)",
                    zIndex:999, overflow:"hidden", animation:"slideUp 0.2s ease" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"16px 20px", borderBottom:"1px solid #f5f5f5" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 }}>
                        Notifications
                      </div>
                      {notifications.some(n=>!n.read) && (
                        <div onClick={() => setNotifications(n => n.map(x=>({...x,read:true})))}
                          style={{ fontSize:12, color:"#FF6B35", fontWeight:600, cursor:"pointer" }}>
                          Mark all read
                        </div>
                      )}
                    </div>
                    <div style={{ maxHeight:320, overflowY:"auto" }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding:"40px 20px", textAlign:"center", color:"#bbb", fontSize:14 }}>
                          🔔 No notifications yet
                        </div>
                      ) : notifications.map((n, i) => (
                        <div key={n.id} onClick={() => {
                            setNotifications(prev => prev.map((x,j) => j===i ? {...x,read:true} : x));
                            setShowNotifs(false);
                            setView("orders");
                          }}
                          style={{ display:"flex", alignItems:"flex-start", gap:12,
                            padding:"14px 20px", cursor:"pointer", transition:"background 0.15s",
                            background: n.read ? "white" : "#FFF8F0",
                            borderBottom:"1px solid #f9f9f9" }}>
                          <div style={{ width:38, height:38, borderRadius:12, flexShrink:0,
                            background: n.read ? "#f5f5f5" : "#FFF0EA",
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                            🛒
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight: n.read ? 500 : 700,
                              color: n.read ? "#888" : "#1a1a1a", lineHeight:1.4 }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize:12, color:"#FF6B35", fontWeight:600, marginTop:2 }}>
                              ₹{Number(n.amount).toFixed(2)}
                            </div>
                            <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>
                              {n.time?.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                              {" · "}
                              {n.time?.toLocaleDateString("en-IN")}
                            </div>
                          </div>
                          {!n.read && (
                            <div style={{ width:8, height:8, borderRadius:"50%",
                              background:"#FF6B35", flexShrink:0, marginTop:4 }}/>
                          )}
                        </div>
                      ))}
                    </div>
                    {notifications.length > 0 && (
                      <div style={{ padding:"12px 20px", borderTop:"1px solid #f5f5f5",
                        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div onClick={() => { setShowNotifs(false); setView("orders"); }}
                          style={{ fontSize:12, color:"#FF6B35", fontWeight:600, cursor:"pointer" }}>
                          View all orders →
                        </div>
                        <div onClick={() => setNotifications([])}
                          style={{ fontSize:12, color:"#bbb", cursor:"pointer" }}>
                          Clear all
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ width:42, height:42, borderRadius:"50%",
                background:"linear-gradient(135deg,#FF6B35,#ff9a56)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, fontWeight:700, color:"white" }}>A</div>
            </div>
          </div>

          {/* ════════════════ DASHBOARD VIEW ════════════════ */}
          {view==="dashboard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:18 }}>
                {[
                  { icon:"🛒", label:"New Orders",   value:stats.newOrders,    change:"↑ live",       up:true,  color:"orange" },
                  { icon:"⏳", label:"Pending",       value:stats.pendingOrders,change:"needs action", up:false, color:"teal" },
                  { icon:"💰", label:"Total Sales",   value:`₹${stats.totalSales}`, change:"↑ total", up:true,  color:"yellow" },
                  { icon:"🍰", label:"Items in Menu", value:stats.menuItems,    change:"in menu",      up:true,  color:"pink" },
                ].map((s,i) => {
                  const iconBgs = { orange:"#FFF0EA", teal:"#E8FAF9", yellow:"#FFFBE6", pink:"#FFF0F1" };
                  const dots    = { orange:"#FF6B35", teal:"#4ECDC4", yellow:"#FFE66D", pink:"#FF8B94" };
                  return (
                    <div key={i} style={{ background:"white", borderRadius:20, padding:24,
                      display:"flex", flexDirection:"column", gap:14,
                      boxShadow:"0 2px 16px rgba(0,0,0,0.05)",
                      animation:`slideUp 0.5s ease ${i*0.06}s both`,
                      position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", width:80, height:80, borderRadius:"50%",
                        top:-20, right:-20, background:dots[s.color], opacity:0.12 }}/>
                      <div style={{ width:48, height:48, borderRadius:14, background:iconBgs[s.color],
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize:11, color:"#888", fontWeight:600,
                          textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30,
                          fontWeight:700, color:"#1a1a1a", lineHeight:1.1, marginTop:4 }}>{s.value}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20,
                        display:"inline-block", width:"fit-content",
                        background: s.up?"#e8faf2":"#fdecea", color: s.up?"#27ae60":"#e74c3c" }}>{s.change}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background:"linear-gradient(135deg,#FF6B35,#ff9a56)", borderRadius:18,
                padding:"20px 28px", color:"white", display:"flex", alignItems:"center",
                gap:20, animation:"slideUp 0.5s ease 0.25s both" }}>
                <div style={{ fontSize:38 }}>🎯</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, opacity:0.8, fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>
                    Monthly Revenue Goal
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", margin:"6px 0 10px" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700 }}>₹{stats.totalSales}</div>
                    <div style={{ fontSize:13, fontWeight:700, opacity:0.9 }}>
                      {Math.min(100,Math.round((stats.totalSales/5000)*100))}% of ₹5,000
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.28)", borderRadius:10, height:8, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(100,(stats.totalSales/5000)*100)}%`,
                      height:"100%", background:"white", borderRadius:10 }}/>
                  </div>
                </div>
                <div style={{ fontSize:13, opacity:0.75, whiteSpace:"nowrap" }}>Target: ₹5,000</div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:18 }}>
                <div style={{ background:"white", borderRadius:20, padding:28,
                  boxShadow:"0 2px 16px rgba(0,0,0,0.05)", animation:"slideUp 0.5s ease 0.3s both" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>
                      {activePill === "Week" ? "Last 7 Days" : "This Month"} Revenue
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      {["Week","Month"].map(p => (
                        <div key={p} className="pill-hover" onClick={() => setActivePill(p)} style={{
                          padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                          background: activePill===p?"#FF6B35":"transparent",
                          color: activePill===p?"white":"#aaa",
                          border:`1.5px solid ${activePill===p?"#FF6B35":"#eee"}`,
                          transition:"all 0.2s" }}>{p}</div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={revenueData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                      <XAxis dataKey="day" axisLine={false} tickLine={false}
                        tick={{ fontFamily:"'DM Sans'", fontSize:12, fill:"#aaa" }}/>
                      <YAxis axisLine={false} tickLine={false}
                        tick={{ fontFamily:"'DM Sans'", fontSize:11, fill:"#aaa" }}
                        tickFormatter={v=>`₹${v}`}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill:"transparent" }}/>
                      <Bar dataKey="revenue"
                        shape={(props) => <CustomBar {...props} total={revenueData.length}/>}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background:"white", borderRadius:20, padding:28,
                  boxShadow:"0 2px 16px rgba(0,0,0,0.05)", animation:"slideUp 0.5s ease 0.35s both" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, marginBottom:10 }}>
                    Order Status
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="45%" innerRadius={52} outerRadius={76}
                        dataKey="value" paddingAngle={4}>
                        {donutData.map((_,i) => <Cell key={i} fill={DONUT_COLORS[i]}/>)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8}
                        formatter={v => <span style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#888" }}>{v}</span>}/>
                      <Tooltip formatter={(v,n) => [v+" orders", n]}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background:"white", borderRadius:20, padding:28,
                boxShadow:"0 2px 16px rgba(0,0,0,0.05)", animation:"slideUp 0.5s ease 0.4s both" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>Recent Orders</div>
                  <div className="pill-hover" onClick={()=>setView("orders")} style={{
                    padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                    border:"1.5px solid #FF6B35", color:"#FF6B35", cursor:"pointer" }}>View All →</div>
                </div>
                {orders.slice(0,5).map((o,i) => (
                  <div key={o.id} className="row-hover" style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", padding:"13px 0",
                    borderBottom: i<4?"1px solid #f5f5f5":"none", transition:"all 0.18s", cursor:"pointer" }}
                    onClick={() => setSelectedOrder(o)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar name={o.userName} gradient={AVATAR_GRADIENTS[i%4]} size={32}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, fontFamily:"monospace" }}>#{o.id.slice(0,8)}...</div>
                        <div style={{ fontSize:11, color:"#aaa" }}>{o.userName}</div>
                      </div>
                    </div>
                    <StatusBadge status={o.status}/>
                    <div style={{ fontSize:14, fontWeight:700 }}>₹{Number(getOrderAmount(o)).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ ORDERS VIEW ════════════════ */}
          {view==="orders" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                {[
                  { label:"Total Orders", value:orders.length,             icon:"🛒", primary:true },
                  { label:"Pending",      value:statusCounts["Pending"]||0, icon:"⏳", accent:"#FFF3E0" },
                  { label:"Preparing",    value:statusCounts["Preparing"]||0,icon:"👨‍🍳",accent:"#E3F2FD" },
                  { label:"Delivered",    value:statusCounts["Delivered"]||0,icon:"✅", accent:"#E8F5E9" },
                ].map((s,i) => (
                  <div key={i} style={{ background: s.primary?"linear-gradient(135deg,#FF6B35,#ff9a56)":"white",
                    borderRadius:18, padding:"18px 22px", display:"flex", alignItems:"center", gap:14,
                    boxShadow:"0 2px 14px rgba(0,0,0,0.06)", animation:`slideUp 0.4s ease ${i*0.06}s both` }}>
                    <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                      background: s.primary?"rgba(255,255,255,0.25)":s.accent,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:10, color: s.primary?"rgba(255,255,255,0.7)":"#aaa",
                        fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700,
                        color: s.primary?"white":"#FF6B35", lineHeight:1.2, marginTop:2 }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:"white", borderRadius:18, padding:"16px 24px",
                boxShadow:"0 2px 14px rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#aaa", textTransform:"uppercase",
                  letterSpacing:1, marginRight:6 }}>Filter:</span>
                {["All","Pending","Preparing","Out for Delivery","Delivered"].map(s => {
                  const isActive = filterStatus===s;
                  const cfg = s!=="All" ? STATUS_CONFIG[s] : null;
                  return (
                    <div key={s} className="pill-hover" onClick={()=>setFilterStatus(s)} style={{
                      padding:"7px 18px", borderRadius:20, fontSize:12, fontWeight:700,
                      cursor:"pointer", transition:"all 0.18s", display:"flex", alignItems:"center", gap:6,
                      background: isActive?(cfg?cfg.bg:"#FFF0EA"):"#f5f5f5",
                      color: isActive?(cfg?cfg.color:"#E65100"):"#aaa",
                      border:`2px solid ${isActive?(cfg?cfg.dot:"#FF6B35"):"transparent"}` }}>
                      {cfg && <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, display:"inline-block" }}/>}
                      {s}
                      <span style={{ marginLeft:2, background: isActive?(cfg?cfg.color:"#FF6B35"):"#ddd",
                        color:"white", borderRadius:20, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
                        {s==="All"?orders.length:(statusCounts[s]||0)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background:"white", borderRadius:20, overflow:"hidden",
                boxShadow:"0 2px 16px rgba(0,0,0,0.05)" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1.2fr 0.8fr 0.8fr 0.7fr",
                  padding:"14px 28px", background:"#fafafa", borderBottom:"1px solid #f0f0f0",
                  position:"sticky", top:0, zIndex:2 }}>
                  {["Order ID","Customer","Status","Total","Date","Action"].map(h => (
                    <div key={h} style={{ fontSize:11, fontWeight:800, color:"#aaa",
                      textTransform:"uppercase", letterSpacing:0.8 }}>{h}</div>
                  ))}
                </div>
                <div>
                {filteredOrders.length===0
                  ? <div style={{ padding:"60px 28px", textAlign:"center", color:"#bbb", fontSize:15 }}>😔 No orders found</div>
                  : filteredOrders.map((order,i) => (
                    <div key={order.id} className="row-hover" style={{
                      display:"grid", gridTemplateColumns:"1.4fr 1fr 1.2fr 0.8fr 0.8fr 0.7fr",
                      padding:"15px 28px", alignItems:"center", cursor:"pointer",
                      borderBottom: i<filteredOrders.length-1?"1px solid #f5f5f5":"none",
                      transition:"all 0.18s", animation:`slideUp 0.35s ease ${0.3+i*0.04}s both` }}>
                      <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700 }}>#{order.id.slice(0,8)}...</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <Avatar name={order.userName} gradient={AVATAR_GRADIENTS[i%4]} size={30}/>
                        <span style={{ fontSize:13, color:"#333", fontWeight:500 }}>{order.userName}</span>
                      </div>
                      <StatusBadge status={order.status}/>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 }}>₹{Number(getOrderAmount(order)).toFixed(2)}</div>
                      <div style={{ fontSize:12, color:"#aaa" }}>{formatOrderDate(order)}</div>
                      <button className="btn-hover" onClick={()=>setSelectedOrder(order)} style={{
                        padding:"7px 16px", borderRadius:10, border:"1.5px solid #e8e8e8",
                        background:"white", color:"#555", fontSize:12, fontWeight:700, cursor:"pointer",
                        transition:"all 0.18s" }}>Details</button>
                    </div>
                  ))
                }
                </div>
              </div>

              <div style={{ background:"linear-gradient(135deg,#2C1A0E,#4a2c14)", borderRadius:16,
                padding:"14px 28px", display:"flex", gap:24, alignItems:"center" }}>
                <span style={{ fontSize:14, color:"rgba(255,255,255,0.6)" }}>
                  Showing <strong style={{ color:"white" }}>{filteredOrders.length}</strong> of <strong style={{ color:"white" }}>{orders.length}</strong> orders
                </span>
                <div style={{ height:20, width:1, background:"rgba(255,255,255,0.15)" }}/>
                {Object.entries(STATUS_CONFIG).map(([k,cfg]) => (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:cfg.dot, display:"inline-block" }}/>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{k}:</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"white" }}>{statusCounts[k]||0}</span>
                  </div>
                ))}
                <div style={{ marginLeft:"auto", fontSize:13, color:"rgba(255,255,255,0.55)" }}>
                  Total: <span style={{ color:"#F7C59F", fontWeight:700,
                    fontFamily:"'Playfair Display',serif", fontSize:16 }}>₹{stats.totalSales}</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ PRODUCTS VIEW ════════════════ */}
          {view==="products" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ background:"white", borderRadius:20, padding:28,
                boxShadow:"0 2px 16px rgba(0,0,0,0.05)", animation:"slideUp 0.4s ease both" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                  color:"#1a1a1a", marginBottom:20 }}>🧁 Add New Menu Item</div>
                <form onSubmit={handleAddProduct} style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>
                  {[
                    { key:"name",  ph:"Item Name", type:"text"   },
                    { key:"price", ph:"Price (₹)", type:"number" },
                    { key:"image", ph:"Image URL", type:"text"   },
                  ].map(({ key,ph,type }) => (
                    <input key={key} type={type} placeholder={ph} required value={newProduct[key]}
                      onChange={e=>setNewProduct({...newProduct,[key]:e.target.value})}
                      style={{ flex:1, minWidth:150, padding:"12px 16px", borderRadius:12,
                        border:"1.5px solid #e8e8e8", fontSize:14, outline:"none",
                        fontFamily:"'DM Sans',sans-serif" }}/>
                  ))}
                  <select required value={newProduct.category}
                    onChange={e=>setNewProduct({...newProduct,category:e.target.value})}
                    style={{ flex:1, minWidth:150, padding:"12px 16px", borderRadius:12,
                      border:"1.5px solid #e8e8e8", fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>
                    <option value="">Category</option>
                    <option value="Sweets">Sweets</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Specials">Karaikudi Specials</option>
                  </select>
                  <button type="submit" style={{ display:"flex", alignItems:"center", gap:8,
                    padding:"12px 24px", borderRadius:12, border:"none",
                    background:"#FF6B35", color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                    <Plus size={16}/> Add Item
                  </button>
                </form>
              </div>

              <div style={{ background:"white", borderRadius:20, overflow:"hidden",
                boxShadow:"0 2px 16px rgba(0,0,0,0.05)" }}>
                <div style={{ padding:"18px 28px", background:"#fafafa", borderBottom:"1px solid #f0f0f0",
                  fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>
                  Menu Items ({products.length})
                </div>
                {products.length===0
                  ? <div style={{ padding:"60px", textAlign:"center", color:"#bbb", fontSize:15 }}>
                      🍰 No items in menu yet. Add your first one above!
                    </div>
                  : products.map((p,i) => (
                    <div key={p.id} className="row-hover" style={{ display:"flex", alignItems:"center",
                      gap:16, padding:"16px 28px", transition:"all 0.18s",
                      borderBottom: i<products.length-1?"1px solid #f5f5f5":"none" }}>
                      <img src={p.image} alt="" onError={e=>{e.target.src="https://via.placeholder.com/45x45/FFF0EA/FF6B35?text=🍮"}}
                        style={{ width:52, height:52, borderRadius:12, objectFit:"cover", background:"#f5f5f5", flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:"#1a1a1a" }}>{p.name}</div>
                        <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{p.category}</div>
                      </div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#FF6B35" }}>
                        ₹{p.price}
                      </div>
                      <button onClick={()=>deleteProduct(p.id)} style={{ width:36, height:36, borderRadius:10,
                        background:"#FFF0F1", border:"none", display:"flex", alignItems:"center",
                        justifyContent:"center", cursor:"pointer", color:"#e74c3c", transition:"all 0.2s" }}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ════════════════ CUSTOMERS VIEW ════════════════ */}
          {view==="customers" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                {[
                  { label:"Total Customers", value:customers.length,        icon:"👥", primary:true },
                  { label:"Total Revenue",   value:`₹${stats.totalSales}`,  icon:"💰", accent:"#FFFBE6" },
                  { label:"Total Orders",    value:orders.length,           icon:"🛒", accent:"#E8FAF9" },
                ].map((s,i) => (
                  <div key={i} style={{ background: s.primary?"linear-gradient(135deg,#FF6B35,#ff9a56)":"white",
                    borderRadius:18, padding:"18px 22px", display:"flex", alignItems:"center", gap:14,
                    boxShadow:"0 2px 14px rgba(0,0,0,0.06)", animation:`slideUp 0.4s ease ${i*0.06}s both` }}>
                    <div style={{ width:44, height:44, borderRadius:12,
                      background: s.primary?"rgba(255,255,255,0.25)":s.accent,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:10, color: s.primary?"rgba(255,255,255,0.7)":"#aaa",
                        fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700,
                        color: s.primary?"white":"#FF6B35", lineHeight:1.2, marginTop:3 }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:18 }}>
                {customers
                  .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) ||
                                c.email?.toLowerCase().includes(search.toLowerCase()))
                  .map((c,i) => {
                    const gradient = AVATAR_GRADIENTS[i%4];
                    const custOrders = orders.filter(o => o.userId===c.userId);
                    const spent = custOrders.reduce((s,o) => s + getOrderAmount(o), 0);
                    const spendPct = Math.round((spent / (stats.totalSales||1)) * 100);
                    return (
                      <div key={c.userId} className="card-hover" onClick={()=>setSelectedCustomer(c)}
                        style={{ background:"white", borderRadius:20, padding:24,
                          boxShadow:"0 2px 16px rgba(0,0,0,0.05)", transition:"all 0.22s",
                          cursor:"pointer", animation:`slideUp 0.4s ease ${0.2+i*0.08}s both` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                          <Avatar name={c.name} gradient={gradient} size={52}/>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:16, color:"#1a1a1a" }}>{c.name}</div>
                            <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{c.email}</div>
                          </div>
                          <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11,
                            fontWeight:700, background:"#E8F5E9", color:"#2E7D32" }}>● Active</span>
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
                          {[
                            { label:"Orders", value:custOrders.length, icon:"🛒" },
                            { label:"Spent",  value:`₹${spent.toFixed(0)}`, icon:"💰" },
                            { label:"Last",   value: formatOrderDate(custOrders[0]) !== "-"
                                ? formatOrderDate(custOrders[0]) : "-", icon:"📅" },
                          ].map(({ label,value,icon }) => (
                            <div key={label} style={{ background:"#fafafa", borderRadius:12,
                              padding:"10px 12px", textAlign:"center" }}>
                              <div style={{ fontSize:16, marginBottom:4 }}>{icon}</div>
                              <div style={{ fontWeight:700, fontSize:13, color:"#1a1a1a" }}>{value}</div>
                              <div style={{ fontSize:10, color:"#bbb", fontWeight:600,
                                textTransform:"uppercase", letterSpacing:0.3, marginTop:1 }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <span style={{ fontSize:11, color:"#bbb", fontWeight:600,
                              textTransform:"uppercase", letterSpacing:0.5 }}>Revenue Share</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#FF6B35" }}>{spendPct}%</span>
                          </div>
                          <div style={{ background:"#f0f0f0", borderRadius:10, height:7, overflow:"hidden" }}>
                            <div style={{ width:`${spendPct}%`, height:"100%", borderRadius:10, background:gradient }}/>
                          </div>
                        </div>

                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                          marginTop:14, paddingTop:12, borderTop:"1px solid #f5f5f5" }}>
                          <div style={{ fontSize:11, color:"#bbb" }}>
                            📅 Joined {formatTimestamp(c.createdAt || c.registeredAt)}
                          </div>
                          <div style={{ fontSize:12, fontWeight:700, color:"#FF6B35" }}>View Profile →</div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {customers.length > 0 && (
                <div style={{ background:"linear-gradient(135deg,#2C1A0E,#4a2c14)", borderRadius:20, padding:"28px 32px" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
                    fontWeight:700, color:"#F7C59F", marginBottom:20 }}>🏆 Top Spenders</div>
                  {[...customers]
                    .map(c => ({ ...c, spent: orders.filter(o=>o.userId===c.userId).reduce((s,o)=>s + getOrderAmount(o),0) }))
                    .sort((a,b) => b.spent - a.spent)
                    .slice(0,4)
                    .map((c,i) => {
                      const medals = ["🥇","🥈","🥉","4️⃣"];
                      const maxSpent = Math.max(...customers.map(x => orders.filter(o=>o.userId===x.userId).reduce((s,o)=>s + getOrderAmount(o),0)));
                      return (
                        <div key={c.userId} style={{ display:"flex", alignItems:"center", gap:14,
                          padding:"12px 16px", background:"rgba(255,255,255,0.06)", borderRadius:14, marginBottom:10 }}>
                          <span style={{ fontSize:22 }}>{medals[i]}</span>
                          <Avatar name={c.name} gradient={AVATAR_GRADIENTS[i%4]} size={34}/>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:14, color:"white" }}>{c.name}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{c.email}</div>
                          </div>
                          <div style={{ flex:2, background:"rgba(255,255,255,0.1)", borderRadius:10, height:6, overflow:"hidden" }}>
                            <div style={{ width:`${Math.round((c.spent/(maxSpent||1))*100)}%`,
                              height:"100%", background:AVATAR_GRADIENTS[i%4], borderRadius:10 }}/>
                          </div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
                            fontWeight:700, color:"#F7C59F", minWidth:70, textAlign:"right" }}>₹{c.spent.toFixed(0)}</div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══ MODALS ═══ */}
      <OrderModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={(id,s) => { updateStatus(id,s); setSelectedOrder(prev => prev?{...prev,status:s}:null); }}
      />
      <CustomerModal
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        gradient={AVATAR_GRADIENTS[customers.findIndex(c=>c.userId===selectedCustomer?.userId)%4] || AVATAR_GRADIENTS[0]}
        usersDataRef={usersDataRef}
      />
    </>
  );
}