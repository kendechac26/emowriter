// ===============================
// SERVICE WORKER (PWA)
// ===============================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/static/service-worker.js")
    .then(() => console.log("Service Worker enregistré"))
    .catch((err) => console.log("Erreur SW:", err));
}

// ===============================
// GÉNÉRATION IA PRINCIPALE
// ===============================

async function editText() {
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

    if (loader) loader.style.display = "none";

    document.getElementById("original-text").innerText = text;
    document.getElementById("corrected-text").innerText =
      data.corrected_text || "";

    document.getElementById("detected-language").innerText =
      data.detected_language || "";

    updateSpeechLanguage(data.detected_language);

    // Traductions
    let translationsHTML = "";

    if (data.translations && Object.keys(data.translations).length > 0) {
      translationsHTML += "<h3>🌐 Traductions</h3>";

      for (const [lang, translatedText] of Object.entries(data.translations)) {
        translationsHTML += `
          <div class="comparison-box">
            <strong>${lang}</strong>
            <p>${translatedText}</p>
          </div>
        `;
      }
    }

    document.getElementById("translations").innerHTML = translationsHTML;
  } catch (error) {
    if (loader) loader.style.display = "none";
    alert("Erreur serveur.");
  }
}

// ===============================
// DICTÉE VOCALE AVANCÉE
// ===============================

const startBtn = document.getElementById("voice-start");
const pauseBtn = document.getElementById("voice-pause");
const stopBtn = document.getElementById("voice-stop");
const wave = document.querySelector(".audio-wave");
const textarea = document.getElementById("input");

let recognition;
let isListening = false;
let currentLang = "fr-FR";

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = currentLang;

  recognition.onstart = () => {
    isListening = true;
    if (wave) wave.style.visibility = "visible";
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }

    textarea.value = transcript;

    if (transcript.length > 40) {
      debounceReformulation(transcript);
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (wave) wave.style.visibility = "hidden";
  };

  if (startBtn) {
    startBtn.onclick = () => recognition.start();
  }

  if (pauseBtn) {
    pauseBtn.onclick = () => recognition.stop();
  }

  if (stopBtn) {
    stopBtn.onclick = () => {
      recognition.stop();
      textarea.value += "\n";
    };
  }
} else {
  if (startBtn) startBtn.style.display = "none";
  if (pauseBtn) pauseBtn.style.display = "none";
  if (stopBtn) stopBtn.style.display = "none";
}

// ===============================
// ADAPTATION AUTOMATIQUE LANGUE
// ===============================

function updateSpeechLanguage(detectedLang) {
  const map = {
    français: "fr-FR",
    anglais: "en-US",
    espagnol: "es-ES",
    allemand: "de-DE",
    italien: "it-IT",
    portugais: "pt-PT",
  };

  if (map[detectedLang?.toLowerCase()]) {
    currentLang = map[detectedLang.toLowerCase()];
    if (recognition) {
      recognition.lang = currentLang;
    }
  }
}

// ===============================
// REFORMULATION INTELLIGENTE
// ===============================

let reformulationTimeout;

function debounceReformulation(text) {
  clearTimeout(reformulationTimeout);

  reformulationTimeout = setTimeout(async () => {
    try {
      const response = await fetch("/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          emotion: "neutre",
          register: "courant",
          languages: [],
        }),
      });

      const data = await response.json();

      if (data.corrected_text) {
        textarea.value = data.corrected_text;
      }
    } catch (e) {
      console.log("Reformulation erreur", e);
    }
  }, 2000); // attend 2s sans parler
}
