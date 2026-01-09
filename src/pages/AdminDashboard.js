import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"; // Added addDoc, deleteDoc
import { db } from "../firebase/firebaseConfig";
import {
  Bell,
  ShoppingCart,
  Users,
  Package,
  BarChart2,
  LogOut,
  Trash2, // Added for delete icon
  Plus
} from "lucide-react";

export default function AdminDashboard({ onLogout }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]); // New State
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "", image: "" }); // New State
  const [stats, setStats] = useState({
    newOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    lowStock: 0
  });

  // --- LOGIC: Add Product ---
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price: Number(newProduct.price),
        createdAt: new Date()
      });
      setNewProduct({ name: "", price: "", category: "", image: "" });
      alert("Added to menu! 🧁");
    } catch (err) {
      console.error("Error adding product:", err);
    }
  };

  // --- LOGIC: Delete Product ---
  const deleteProduct = async (id) => {
    if (window.confirm("Remove this item from the menu?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  useEffect(() => {
    // Listen to Orders
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setOrders(sorted);
      
      const unique = {};
      data.forEach((order) => {
        if (!unique[order.userId]) {
          unique[order.userId] = {
            userId: order.userId,
            name: order.userName,
            email: order.userEmail,
            createdAt: order.createdAt
          };
        }
      });
      setCustomers(Object.values(unique));
      setStats(prev => ({
        ...prev,
        newOrders: data.length,
        pendingOrders: data.filter((o) => ["pending", "placed", "preparing"].includes(o.status?.toLowerCase())).length,
        totalSales: Number(data.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2))
      }));
    });

    // Listen to Products
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prodData);
      setStats(prev => ({ ...prev, lowStock: prodData.length }));
    });

    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  return (
    <div style={styles.container}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&family=Sacramento&display=swap');`}
      </style>

      {/* ================= SIDEBAR ================= */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <h1 style={styles.bakeryLogo}>from karaikudi</h1>
          <p style={styles.adminTag}>Admin Portal</p>
        </div>

        <nav style={styles.nav}>
          <div style={{...styles.sideItem, ...(view === "dashboard" ? styles.activeSideItem : {})}} onClick={() => setView("dashboard")}>
            <BarChart2 size={20} /> <span>Dashboard</span>
          </div>
          <div style={{...styles.sideItem, ...(view === "orders" ? styles.activeSideItem : {})}} onClick={() => setView("orders")}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div style={{...styles.sideItem, ...(view === "products" ? styles.activeSideItem : {})}} onClick={() => setView("products")}>
            <Package size={20} /> <span>Products</span>
          </div>
          <div style={{...styles.sideItem, ...(view === "customers" ? styles.activeSideItem : {})}} onClick={() => setView("customers")}>
            <Users size={20} /> <span>Customers</span>
          </div>
        </nav>

        <div style={styles.logoutContainer} onClick={onLogout}>
          <LogOut size={18} /> <span>Logout</span>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <h2 style={styles.viewTitle}>{view.charAt(0).toUpperCase() + view.slice(1)}</h2>
            <p style={styles.dateToday}>{new Date().toDateString()}</p>
          </div>
          <div style={styles.notificationBadge}>
             <Bell size={20} color="#6d4c41" />
             <span style={styles.badgeDot}></span>
          </div>
        </header>

        {/* ================= DASHBOARD VIEW ================= */}
        {view === "dashboard" && (
          <div style={styles.contentFade}>
            {/* Stats Cards... (Same as your previous code) */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{...styles.iconCircle, background: '#fff3e0'}}><ShoppingCart color="#ff9800" /></div>
                <div><p style={styles.statLabel}>New Orders</p><h3 style={styles.statValue}>{stats.newOrders}</h3></div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.iconCircle, background: '#efebe9'}}><Package color="#8d6e63" /></div>
                <div><p style={styles.statLabel}>Pending</p><h3 style={styles.statValue}>{stats.pendingOrders}</h3></div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.iconCircle, background: '#e8f5e9'}}><BarChart2 color="#4caf50" /></div>
                <div><p style={styles.statLabel}>Total Sales</p><h3 style={styles.statValue}>₹{stats.totalSales}</h3></div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.iconCircle, background: '#ffebee'}}><Bell color="#f44336" /></div>
                <div><p style={styles.statLabel}>Items in Menu</p><h3 style={styles.statValue}>{stats.lowStock}</h3></div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PRODUCTS VIEW ================= */}
        {view === "products" && (
          <div style={styles.contentFade}>
            <div style={styles.formCard}>
              <h3 style={{ color: "#3e2723", marginBottom: 20 }}>Add New Product</h3>
              <form onSubmit={handleAddProduct} style={styles.productForm}>
                <input style={styles.input} placeholder="Item Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required />
                <input style={styles.input} type="number" placeholder="Price (₹)" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} required />
                <select style={styles.input} value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} required>
                  <option value="">Category</option>
                  <option value="Sweets">Sweets</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Specials">Karaikudi Specials</option>
                </select>
                <input style={styles.input} placeholder="Image URL" value={newProduct.image} onChange={(e) => setNewProduct({...newProduct, image: e.target.value})} required />
                <button type="submit" style={styles.btnPrimary}><Plus size={18}/> Add Item</button>
              </form>
            </div>

            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}><img src={p.image} alt="" style={styles.prodThumb} /></td>
                      <td style={styles.td}><b>{p.name}</b></td>
                      <td style={styles.td}>{p.category}</td>
                      <td style={styles.td}>₹{p.price}</td>
                      <td style={styles.td}>
                        <button style={styles.btnDelete} onClick={() => deleteProduct(p.id)}><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TABLES (Orders/Customers) ================= */}
        {(view === "orders" || view === "customers") && (
          <div style={styles.tableCard}>
             {/* ... Your existing table logic for Orders and Customers ... */}
             <table style={styles.table}>
               <thead>
                 <tr>
                   {view === "orders" ? (
                     <><th>Order ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></>
                   ) : (
                     <><th>Customer Name</th><th>Email</th><th>User ID</th><th>Registered Date</th></>
                   )}
                 </tr>
               </thead>
               <tbody>
                 {view === "orders" ? orders.map((order) => (
                   <tr key={order.id} style={styles.tr}>
                     <td style={styles.td}><b>#{order.id.slice(0,8)}...</b></td>
                     <td style={styles.td}>{order.userName}</td>
                     <td style={styles.td}>
                       <select style={styles.selectStatus} value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)}>
                         <option>Pending</option><option>Preparing</option><option>Out for Delivery</option><option>Delivered</option>
                       </select>
                     </td>
                     <td style={styles.td}>₹{order.totalAmount}</td>
                     <td style={styles.td}><button style={styles.btnView} onClick={() => setSelectedOrder(order)}>Details</button></td>
                   </tr>
                 )) : customers.map((c) => (
                   <tr key={c.userId} style={styles.tr}>
                     <td style={styles.td}><b>{c.name}</b></td>
                     <td style={styles.td}>{c.email}</td>
                     <td style={styles.td}><code style={styles.code}>{c.userId}</code></td>
                     <td style={styles.td}>{formatDate(c.createdAt)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </main>

      {/* Order Modal... (Keep as is) */}
      {selectedOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
                <h3>Order Preview</h3>
                <span style={{cursor: 'pointer'}} onClick={() => setSelectedOrder(null)}>×</span>
            </div>
            <div style={styles.modalBody}>
                <div style={styles.modalRow}><span>ID:</span> <b>#{selectedOrder.id}</b></div>
                <div style={styles.modalRow}><span>Customer:</span> <b>{selectedOrder.userName}</b></div>
                <div style={styles.modalRow}><span>Total:</span> <b style={{color: '#16a34a'}}>₹{selectedOrder.totalAmount}</b></div>
                <h4 style={{marginTop: 20, color: '#6d4c41'}}>Items Ordered</h4>
                <div style={styles.itemsList}>
                {selectedOrder.items?.map((item, i) => (
                    <div key={i} style={styles.itemRow}><span>{item.name}</span><span>× {item.quantity}</span></div>
                ))}
                </div>
            </div>
            <button style={styles.btnClose} onClick={() => setSelectedOrder(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- UPDATED STYLES ---
const styles = {
  // ... Paste all your existing styles here ...
  // PLUS THESE NEW ONES FOR PRODUCTS:
  formCard: {
    background: "#fff",
    padding: "25px",
    borderRadius: "20px",
    marginBottom: "30px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.02)",
    border: "1px solid #f3e5f5"
  },
  productForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px"
  },
  input: {
    flex: 1,
    minWidth: "150px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d7ccc8",
    fontFamily: "'Quicksand', sans-serif"
  },
  btnPrimary: {
    background: "#6d4c41",
    color: "#fff",
    border: "none",
    padding: "10px 25px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  prodThumb: {
    width: "45px",
    height: "45px",
    borderRadius: "8px",
    objectFit: "cover",
    background: "#eee"
  },
  btnDelete: {
    background: "#ffebee",
    color: "#f44336",
    border: "none",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.2s"
  },
  // (Include all original styles like container, sidebar, table, etc., here)
  container: { display: "flex", minHeight: "100vh", background: "#fdfaf9", fontFamily: "'Quicksand', sans-serif" },
  sidebar: { width: 260, background: "#3e2723", color: "#fff", padding: "30px 20px", display: "flex", flexDirection: "column", boxShadow: "4px 0 10px rgba(0,0,0,0.05)" },
  logoContainer: { textAlign: "center", marginBottom: 40 },
  bakeryLogo: { fontFamily: "'Sacramento', cursive", fontSize: "32px", color: "#d7ccc8", margin: 0 },
  adminTag: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "2px", color: "#8d6e63", marginTop: -5 },
  nav: { flexGrow: 1 },
  sideItem: { display: "flex", gap: 12, cursor: "pointer", padding: "12px 15px", borderRadius: "10px", marginBottom: 8, alignItems: "center", transition: "0.2s", color: "#bcaaa4" },
  activeSideItem: { background: "#5d4037", color: "#fff" },
  logoutContainer: { display: "flex", gap: 10, cursor: "pointer", padding: "15px", color: "#ff8a80", fontWeight: "bold", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 20 },
  main: { flex: 1, padding: "40px", overflowY: "auto" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  viewTitle: { fontSize: "28px", color: "#3e2723", margin: 0 },
  dateToday: { color: "#8d6e63", margin: 0, fontSize: "14px" },
  notificationBadge: { position: "relative", background: "#fff", padding: "10px", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  badgeDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, background: "#f44336", borderRadius: "50%", border: "2px solid #fff" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 30 },
  statCard: { background: "#fff", padding: "20px", borderRadius: "20px", boxShadow: "0 5px 15px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "15px", border: "1px solid #f3e5f5" },
  iconCircle: { width: "50px", height: "50px", borderRadius: "15px", display: "flex", justifyContent: "center", alignItems: "center" },
  statLabel: { color: "#8d6e63", margin: 0, fontSize: "14px" },
  statValue: { margin: 0, fontSize: "22px", color: "#3e2723" },
  tableCard: { background: "#fff", borderRadius: "20px", padding: "20px", boxShadow: "0 5px 15px rgba(0,0,0,0.02)", border: "1px solid #f3e5f5" },
  table: { width: "100%", borderCollapse: "collapse" },
  tr: { borderBottom: "1px solid #efebe9" },
  td: { padding: "15px", color: "#5d4037", fontSize: "14px" },
  selectStatus: { padding: "6px", borderRadius: "8px", border: "1px solid #d7ccc8", fontFamily: "'Quicksand', sans-serif" },
  btnView: { background: "#efebe9", color: "#5d4037", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(62, 39, 35, 0.4)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "25px", width: "450px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "20px", color: "#3e2723" },
  modalRow: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  itemsList: { background: "#fdfaf9", padding: "15px", borderRadius: "15px" },
  itemRow: { display: "flex", justifyContent: "space-between", padding: "5px 0" },
  btnClose: { width: "100%", marginTop: "25px", padding: "12px", background: "#6d4c41", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }
};