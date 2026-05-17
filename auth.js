import { auth } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

window.registrar = async () => {

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {

    await createUserWithEmailAndPassword(auth, email, senha);

    alert("Conta criada com sucesso");

  } catch (e) {

    alert(e.message);

  }

};

window.login = async () => {

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {

    await signInWithEmailAndPassword(auth, email, senha);

    alert("Login realizado");

  } catch {

    alert("Email ou senha incorreto");

  }

};

window.sair = async () => {

  await signOut(auth);

};

onAuthStateChanged(auth, (user) => {

  if (user) {

    console.log("Logado:", user.email);

  } else {

    console.log("Deslogado");

  }

});
