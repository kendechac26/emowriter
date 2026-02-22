from flask import Flask, render_template, request, jsonify
import os
import json
from openai import OpenAI
app = Flask(__name__)

# Récupération clé production
api_key = os.environ.get("OPENAI_API_KEY")

if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing in Render environment variables")

client = OpenAI(api_key=api_key)

# ==============================
# PROFILS D'ÉMOTIONS
# ==============================

emotion_profiles = {
    "neutre": "Reste factuel et sans intensité émotionnelle.",
    "empathique": "Ajoute chaleur humaine, compréhension et sensibilité.",
    "professionnelle": "Adopte un ton formel, structuré et respectueux.",
    "poétique": "Utilise des métaphores, des images fortes et un rythme fluide.",
    "motivée": "Adopte un ton énergique, dynamique et inspirant.",
    "académique": "Structure logiquement avec vocabulaire soutenu et rigoureux.",
    "argumentative": "Renforce les arguments et ajoute des connecteurs logiques."
}

# ==============================
# PROFILS DE REGISTRE
# ==============================

register_profiles = {
    "familier": "Utilise un langage simple, naturel et proche de l’oral.",
    "courant": "Utilise un langage standard, clair et accessible.",
    "soutenu": "Utilise un vocabulaire riche, précis et formel.",
    "litteraire": "Utilise un style élégant, travaillé et artistique."
}

# ==============================
# ROUTE PAGE PRINCIPALE
# ==============================

@app.route("/")
def home():
    return render_template("index.html")

# ==============================
# ROUTE API PRINCIPALE
# ==============================

@app.route("/edit", methods=["POST"])
def edit_text():
    try:
        data = request.get_json(force=True) or {}

        text = data.get("text", "").strip()
        emotion = data.get("emotion", "neutre")
        register = data.get("register", "courant")
        languages = data.get("languages") or []
        dissertation_mode = data.get("dissertationMode", False)

        if not text:
            return jsonify({
                "detected_language": "",
                "corrected_text": "Aucun texte fourni.",
                "translations": {}
            })

        # ==========================
        # CONSTRUCTION DU PROMPT
        # ==========================

        if dissertation_mode:

            prompt = f"""
Tu es un expert académique.

Réécris le texte sous forme de dissertation structurée :
- Introduction
- Développement
- Conclusion
- Aucun ajout d’idées

Émotion : {emotion}
Registre : {register}

Retourne uniquement du JSON brut :

{{
  "detected_language": "...",
  "corrected_text": "...",
  "translations": {{}}
}}

Texte :
{text}
"""

        else:

            if languages:

                languages_str = ", ".join(languages)

                prompt = f"""
Tu es un assistant de réécriture professionnel.

ÉTAPES OBLIGATOIRES :

1. Détecte la langue originale.
2. Corrige et reformule le texte dans cette même langue.
3. Le champ "corrected_text" doit rester STRICTEMENT dans la langue originale.
4. Ensuite seulement, traduis le texte corrigé dans : {languages_str}.

RÈGLES IMPORTANTES :
- Ne jamais remplacer le texte original par une traduction.
- Les traductions doivent être uniquement dans le champ "translations".

PARAMÈTRES :
Émotion : {emotion}
Registre : {register}

Retourne uniquement du JSON brut :

{{
  "detected_language": "...",
  "corrected_text": "...",
  "translations": {{
    "Langue": "..."
  }}
}}

Texte :
{text}
"""

            else:

                prompt = f"""
Tu es un assistant de réécriture professionnel.

RÈGLES :
- Ne pas inventer d’informations
- Ne pas modifier le sens
- Transformer clairement le style

PARAMÈTRES :
Émotion : {emotion}
Registre : {register}

Ne fais aucune traduction.

Retourne uniquement du JSON brut :

{{
  "detected_language": "...",
  "corrected_text": "...",
  "translations": {{}}
}}

Texte :
{text}
"""

        # ==========================
        # APPEL OPENAI
        # ==========================

        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )

        raw_result = response.choices[0].message.content.strip()

        # Nettoyage markdown éventuel
        if "```" in raw_result:
            parts = raw_result.split("```")
            if len(parts) >= 2:
                raw_result = parts[1]
            raw_result = raw_result.replace("json", "").strip()

        try:
            parsed = json.loads(raw_result)
        except:
            return jsonify({
                "detected_language": "Non détectée",
                "corrected_text": raw_result,
                "translations": {}
            })

        return jsonify({
            "detected_language": parsed.get("detected_language", ""),
            "corrected_text": parsed.get("corrected_text", ""),
            "translations": parsed.get("translations", {})
        })

    except Exception as e:
        print("ERREUR BACKEND :", e)
        return jsonify({
            "detected_language": "",
            "corrected_text": "Erreur serveur.",
            "translations": {}
        }), 500

# ==============================
# LANCEMENT
# ==============================

if __name__ == "__main__":
    app.run()