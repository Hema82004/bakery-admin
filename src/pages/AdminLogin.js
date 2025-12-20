import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { FiMail, FiLock } from "react-icons/fi";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      const adminRef = doc(db, "admin", userCred.user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        setError("❌ You are not authorized as admin");
        return;
      }

      onLogin(userCred.user);
    } catch (err) {
      setError("❌ Invalid email or password");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Admin Login</h2>
        <p style={styles.subtitle}>Sign in to continue</p>

        <div style={styles.inputBox}>
          <FiMail style={styles.icon} />
          <input
            placeholder="Enter admin email"
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputBox}>
          <FiLock style={styles.icon} />
          <input
            type="password"
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button onClick={handleLogin} style={styles.button}>
          Login
        </button>
      </div>
    </div>
  );
}

/* ------------------ STYLES ------------------ */

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f2e9e4",
  },
  card: {
    width: "360px",
    background: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  title: {
    margin: 0,
    marginBottom: "10px",
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginBottom: "20px",
    color: "#6b6b6b",
  },
  inputBox: {
    display: "flex",
    alignItems: "center",
    background: "#f7f7f7",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "15px",
    border: "1px solid #ddd",
  },
  icon: {
    fontSize: "18px",
    marginRight: "8px",
    color: "#555",
  },
  input: {
    border: "none",
    outline: "none",
    flex: 1,
    background: "transparent",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#b5651d",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    transition: "0.3s",
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginBottom: "10px",
  },
};
