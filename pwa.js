let deferredInstallPrompt = null;

const installButton = document.getElementById("installAppBtn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton?.classList.add("is-visible");
});

installButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    alert("No iPhone, abra no Safari, toque em Compartilhar e escolha Adicionar à Tela Inicial.");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.classList.remove("is-visible");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton?.classList.remove("is-visible");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker não registrado:", error);
    });
  });
}
