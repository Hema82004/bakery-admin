import { useState } from "react";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [admin, setAdmin] = useState(null);

  // 🔹 LOGOUT FUNCTION
  const handleLogout = () => {
    setAdmin(null); // clears admin session
  };

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
