import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { FiMail, FiLock } from "react-icons/fi";
import backgroundImage from "../assets/img.webp";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isHovered, setIsHovered] = useState(false);

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
      {/* Import Bakery-style fonts directly in the component */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600&family=Sacramento&display=swap');`}
      </style>

      <div style={styles.card}>
        <div style={styles.headerContainer}>
          <h1 style={styles.bakeryLogo}>Sweet Delights</h1>
          <h2 style={styles.title}>Admin Portal</h2>
          <p style={styles.subtitle}>Freshly baked updates await!</p>
        </div>

        <div style={styles.inputBox}>
          <FiMail style={styles.icon} />
          <input
            placeholder="Admin Email"
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputBox}>
          <FiLock style={styles.icon} />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button 
          onClick={handleLogin} 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            ...styles.button,
            backgroundColor: isHovered ? "#8d6e63" : "#b5651d",
            transform: isHovered ? "scale(1.02)" : "scale(1)"
          }}
        >
          Enter Kitchen
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    // Uses the imported variable for the image
    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), url(${backgroundImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat", // Prevents tiling if the screen is huge
    fontFamily: "'Quicksand', sans-serif",
  },
  card: {
    width: "380px",
    background: "rgba(255, 255, 255, 0.95)", // Slightly see-through to feel integrated
    padding: "40px",
    borderRadius: "24px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    textAlign: "center",
    backdropFilter: "blur(10px)", // Creates a nice frosted glass effect over your image
  },
  headerContainer: {
    marginBottom: "30px",
  },
  bakeryLogo: {
    fontFamily: "'Sacramento', cursive",
    fontSize: "42px",
    color: "#6d4c41", // Chocolate brown
    margin: 0,
  },
  title: {
    margin: "5px 0 0 0",
    fontSize: "20px",
    fontWeight: 700,
    color: "#4e342e",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  subtitle: {
    margin: "5px 0 0 0",
    color: "#8d6e63",
    fontSize: "14px",
  },
  inputBox: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    padding: "12px 15px",
    borderRadius: "12px",
    marginBottom: "18px",
    border: "2px solid #f3e5f5", // Soft lavender/cream border
    transition: "0.3s",
  },
  icon: {
    fontSize: "18px",
    marginRight: "12px",
    color: "#b5651d", // Pastry gold
  },
  input: {
    border: "none",
    outline: "none",
    flex: 1,
    background: "transparent",
    fontSize: "16px",
    fontFamily: "'Quicksand', sans-serif",
    color: "#4e342e",
  },
  button: {
    width: "100%",
    padding: "14px",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 10px rgba(181, 101, 29, 0.3)",
    backgroundColor: "#b5651d", // Set default color here
  },
  error: {
    color: "#d32f2f",
    fontSize: "14px",
    marginBottom: "15px",
    fontWeight: "600",
    background: "#ffebee",
    padding: "8px",
    borderRadius: "8px",
  },
};