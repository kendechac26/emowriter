async function editText() {
  console.log("JS chargé");
  const text = document.getElementById("input")?.value.trim();
  const emotion = document.getElementById("emotion")?.value;
  const register = document.getElementById("register")?.value;

  const checkboxes = document.querySelectorAll("input[type=checkbox]:checked");
  const languages = Array.from(checkboxes)
    .filter((cb) => cb.id !== "dissertation-mode")
    .map((cb) => cb.value);

  const dissertationMode =
    document.getElementById("dissertation-mode")?.checked || false;

  if (!text) {
    alert("Veuillez entrer un texte.");
    return;
  }

  const loader = document.getElementById("loader-overlay");
  if (loader) loader.style.display = "flex";

  try {
    const response = await fetch("/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        emotion,
        register,
        languages,
        dissertationMode,
      }),
    });

    const data = await response.json();

    console.log("DATA:", data); // DEBUG

    if (loader) loader.style.display = "none";

    const originalBlock = document.getElementById("original-text");
    const correctedBlock = document.getElementById("corrected-text");
    const detectedBlock = document.getElementById("detected-language");
    const translationsBlock = document.getElementById("translations");

    if (originalBlock) originalBlock.innerText = text;
    if (correctedBlock) correctedBlock.innerText = data.corrected_text || "";
    if (detectedBlock) detectedBlock.innerText = data.detected_language || "";

    if (translationsBlock) {
      let html = "";

      if (data.translations && Object.keys(data.translations).length > 0) {
        html += "<h3>🌐 Traductions</h3>";

        for (const [lang, translatedText] of Object.entries(
          data.translations,
        )) {
          html += `
            <div class="comparison-box">
              <strong>${lang}</strong>
              <p>${translatedText}</p>
            </div>
          `;
        }
      }

      translationsBlock.innerHTML = html;
    }
  } catch (error) {
    if (loader) loader.style.display = "none";
    console.error("Erreur JS:", error);
    alert("Erreur serveur.");
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/static/service-worker.js")
      .then(() => console.log("Service Worker enregistré"))
      .catch((err) => console.log("Erreur SW:", err));
  }
}
