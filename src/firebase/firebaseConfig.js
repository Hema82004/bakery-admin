
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCCugIDllybDDlwaNN9XVboG3RsEtBmtFw",
  authDomain: "bakery-project-588c5.firebaseapp.com",
  projectId: "bakery-project-588c5",
  storageBucket: "bakery-project-588c5.firebasestorage.app",
  messagingSenderId: "239687856068",
  appId: "1:239687856068:web:6964277d4264d9a73dfe91",
  measurementId: "G-1WF0YY6JT7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);


