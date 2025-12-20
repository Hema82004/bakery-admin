import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  Bell,
  ShoppingCart,
  Users,
  Package,
  BarChart2,
  LogOut
} from "lucide-react";

export default function AdminDashboard({ onLogout }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState("dashboard");

  const [customers, setCustomers] = useState([]);

  const [stats, setStats] = useState({
    newOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    lowStock: 0
  });

  // ✔ Format Registered Date
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

  // 🔹 Update order status
  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // 🔹 Fetch orders + customers
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(data);

      // Extract unique customers
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

      // Stats
      setStats({
        newOrders: data.length,
        pendingOrders: data.filter((o) => o.status === "Pending").length,
        totalSales: data.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        lowStock: 0
      });
    });

    return () => unsub();
  }, []);

  return (
    <div style={styles.container}>
      {/* ================= SIDEBAR ================= */}
      <aside style={styles.sidebar}>
        <h2 style={{ marginBottom: 30 }}>Admin Dashboard</h2>

        <p style={styles.sideItem} onClick={() => setView("dashboard")}>
          <BarChart2 size={18} /> Dashboard
        </p>

        <p style={styles.sideItem} onClick={() => setView("orders")}>
          <ShoppingCart size={18} /> Orders
        </p>

        <p style={styles.sideItem}>
          <Package size={18} /> Products
        </p>

        <p style={styles.sideItem} onClick={() => setView("customers")}>
          <Users size={18} /> Customers
        </p>

        {/* pushes logout to bottom */}
        <div style={{ flexGrow: 1 }}></div>

        {/* LOGOUT BUTTON */}
        <p style={styles.logoutItem} onClick={onLogout}>
          <LogOut size={18} /> Logout
        </p>
      </aside>

      {/* ================= MAIN ================= */}
      <main style={styles.main}>
        <div style={styles.topbar}>
          <h2>
            {view === "dashboard"
              ? "Dashboard"
              : view === "orders"
              ? "Orders"
              : "Customers"}
          </h2>
          <Bell />
        </div>

        {/* ================= DASHBOARD VIEW ================= */}
        {view === "dashboard" && (
          <>
            {orders[0] && (
              <div style={styles.alert}>
                <span>✅ New Order Placed! Order #{orders[0].id}</span>
                <button
                  style={styles.btn}
                  onClick={() => setSelectedOrder(orders[0])}
                >
                  View Order
                </button>
              </div>
            )}

            <div style={styles.statsGrid}>
              <div style={styles.card}>
                <p>New Orders</p>
                <h3>{stats.newOrders}</h3>
              </div>
              <div style={styles.card}>
                <p>Pending Orders</p>
                <h3>{stats.pendingOrders}</h3>
              </div>
              <div style={styles.card}>
                <p>Total Sales</p>
                <h3>₹{stats.totalSales}</h3>
              </div>
              <div style={styles.card}>
                <p>Stock Alerts</p>
                <h3 style={{ color: "red" }}>{stats.lowStock}</h3>
              </div>
            </div>
          </>
        )}

        {/* ================= ORDERS VIEW ================= */}
        {view === "orders" && (
          <div style={styles.card}>
            <h3>All Orders</h3>

            <table width="100%">
              <thead>
                <tr>
                  <th align="left">Order ID</th>
                  <th align="left">Customer</th>
                  <th align="left">Status</th>
                  <th align="left">Total</th>
                  <th align="left">Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.userName}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value)
                        }
                      >
                        <option>Pending</option>
                        <option>Preparing</option>
                        <option>Out for Delivery</option>
                        <option>Delivered</option>
                      </select>
                    </td>
                    <td>₹{order.totalAmount}</td>
                    <td>
                      <button
                        style={styles.btn}
                        onClick={() => setSelectedOrder(order)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= CUSTOMERS VIEW ================= */}
        {view === "customers" && (
          <div style={styles.card}>
            <h3>Customers</h3>

            <table width="100%">
              <thead>
                <tr>
                  <th align="left">Customer Name</th>
                  <th align="left">Email</th>
                  <th align="left">User ID</th>
                  <th align="left">Registered Date</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((c) => (
                  <tr key={c.userId}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.userId}</td>
                    <td>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ================= ORDER MODAL ================= */}
      {selectedOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Order Details</h3>

            <p>
              <b>Order ID:</b> {selectedOrder.id}
            </p>
            <p>
              <b>User:</b> {selectedOrder.userName}
            </p>
            <p>
              <b>Total:</b> ₹{selectedOrder.totalAmount}
            </p>
            <p>
              <b>Status:</b> {selectedOrder.status}
            </p>

            <h4>Items</h4>
            <ul>
              {selectedOrder.items?.map((item, i) => (
                <li key={i}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>

            <button
              style={{ ...styles.btn, marginTop: 10 }}
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f4f6f8"
  },
  sidebar: {
    width: 240,
    background: "#0f172a",
    color: "#fff",
    padding: 20,
    display: "flex",
    flexDirection: "column"
  },
  sideItem: {
    display: "flex",
    gap: 10,
    cursor: "pointer",
    marginBottom: 15,
    alignItems: "center"
  },
  logoutItem: {
    display: "flex",
    gap: 10,
    cursor: "pointer",
    padding: "12px 10px",
    color: "#f87171",
    fontWeight: "bold",
    borderTop: "1px solid rgba(255,255,255,0.2)"
  },
  main: {
    flex: 1,
    padding: 20
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20
  },
  alert: {
    background: "#16a34a",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20
  },
  btn: {
    background: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 15,
    marginBottom: 20
  },
  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginBottom: 15
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 8,
    width: 400
  }
};
