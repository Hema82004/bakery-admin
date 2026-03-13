import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase/firebaseConfig";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── On refresh: check if Firebase still has an active admin session ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Verify they are actually an admin
          const adminDoc = await getDoc(doc(db, "admin", user.uid));
          if (adminDoc.exists() && adminDoc.data().role === "admin") {
            setAdmin(user);
          } else {
            setAdmin(null);
          }
        } catch (e) {
          console.error("Auth check failed:", e);
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setAdmin(null);
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#FFF8F0",
        fontFamily: "'DM Sans', sans-serif", flexDirection: "column", gap: 16
      }}>
        <div style={{ fontSize: 48 }}>🍰</div>
        <div style={{ fontSize: 14, color: "#aaa", fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {admin ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <AdminLogin onLogin={setAdmin} />
      )}
    </>
  );
}

export default App;