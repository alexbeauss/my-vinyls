#!/usr/bin/env node

/**
 * Script de test pour le prompt JSON des critiques
 */

const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach((l) => {
    l = l.trim();
    if (!l || l.startsWith('#')) return;
    const i = l.indexOf('=');
    if (i < 0) return;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  });
}

loadEnv('.env.local');
loadEnv('.env');

async function testNewPrompt() {
  console.log('🎯 Test du prompt JSON de génération des critiques\n');

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.log('❌ Clé API Google Gemini manquante');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
      },
    });

    const testPrompt = `Tu es un critique musical français exigeant (ton Les Inrocks / Magic) : précis, incarné, sans jargon creux.

Écris une critique de 200-280 mots en français sur cet album :
- Titre : Abbey Road
- Artiste(s) : The Beatles
- Année : 1969
- Genre : Rock
- Style : Psychedelic Rock, Pop Rock
- Pistes (aperçu) : Come Together, Something, Maxwell's Silver Hammer, Oh! Darling, Octopus's Garden + 12 autres

Règles :
- Prose continue uniquement (pas de listes, pas de titres de sections)
- Base-toi uniquement sur les infos fournies ; n'invente pas d'anecdotes biographiques ni de faits non fournis
- Évoque l'intention, la forme (composition / production / jeu) et un verdict clair
- Note : sois avare des 9+ (9+ = chef-d'œuvre rare ; 7-8 = très bon ; 5-6 = moyen ; <5 = faible)
- recommendedAlbum : un album réel, différent de celui critiqué, qui prolonge l'écoute (titre exact, artiste, année)

Réponds uniquement en JSON avec exactement cette forme :
{
  "review": "texte de la critique sans note ni album recommandé à la fin",
  "rating": 7.4,
  "recommendedAlbum": {
    "title": "Titre exact",
    "artist": "Artiste",
    "year": 1971
  }
}`;

    console.log('🚀 Génération JSON…');
    const startTime = Date.now();
    const result = await model.generateContent(testPrompt);
    const raw = result.response.text();
    const duration = Date.now() - startTime;

    const parsed = JSON.parse(raw);
    const wordCount = (parsed.review || '').split(/\s+/).filter(Boolean).length;

    console.log(`✅ Réponse en ${duration}ms`);
    console.log(`📏 Mots (review): ${wordCount}`);
    console.log(`⭐ Note: ${parsed.rating}`);
    console.log(
      `🎵 Recommandé: ${parsed.recommendedAlbum?.title} - ${parsed.recommendedAlbum?.artist} (${parsed.recommendedAlbum?.year})`
    );
    console.log('\n📝 Critique:');
    console.log('─'.repeat(80));
    console.log(parsed.review);
    console.log('─'.repeat(80));
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testNewPrompt().catch(console.error);
