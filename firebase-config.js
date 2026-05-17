import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDK11aMTJepWZGe_GqqFvB7W-3IwENbZKY",
  authDomain: "financeira-6cb17.firebaseapp.com",
  projectId: "financeira-6cb17",
  storageBucket: "financeira-6cb17.firebasestorage.app",
  messagingSenderId: "1054909648852",
  appId: "1:1054909648852:web:a92d38e5ba640987cd9041",
  measurementId: "G-BH5LR1DFDN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
