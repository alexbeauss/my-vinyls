#!/usr/bin/env node

/**
 * Script de test pour diagnostiquer les problèmes de génération de critique
 * Usage: node scripts/test-review-generation.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test de l'API Gemini avec différents types d'albums
async function testGeminiAPI() {
  console.log('🧪 Test de l\'API Gemini pour la génération de critique...\n');
  
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error('❌ GOOGLE_GEMINI_API_KEY non définie dans les variables d\'environnement');
    return;
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  // Albums de test avec différents niveaux de complexité
  const testAlbums = [
    {
      id: 'test1',
      title: 'Abbey Road',
      artists: [{ name: 'The Beatles' }],
      year: 1969,
      genres: ['Rock'],
      styles: ['Psychedelic Rock', 'Pop Rock'],
      labels: [{ name: 'Apple Records' }],
      tracklist: [
        { title: 'Come Together', duration: '4:20' },
        { title: 'Something', duration: '3:02' }
      ]
    },
    {
      id: 'test2',
      title: 'Unknown Album',
      artists: [{ name: 'Unknown Artist' }],
      year: null,
      genres: [],
      styles: [],
      labels: [],
      tracklist: []
    },
    {
      id: 'test3',
      title: 'Very Long Album Title That Might Cause Issues With Generation',
      artists: [{ name: 'Very Long Artist Name That Might Also Cause Problems' }],
      year: 2023,
      genres: ['Electronic', 'Ambient', 'Experimental', 'Jazz Fusion'],
      styles: ['IDM', 'Glitch', 'Drone', 'Minimal Techno'],
      labels: [{ name: 'Very Long Label Name' }],
      tracklist: Array.from({ length: 20 }, (_, i) => ({
        title: `Track ${i + 1} - Very Long Track Title That Might Cause Issues`,
        duration: '5:30'
      }))
    }
  ];

  for (const album of testAlbums) {
    console.log(`\n📀 Test de l'album: ${album.title} - ${album.artists[0].name}`);
    console.log('─'.repeat(50));
    
    try {
      const safeGetValue = (value, fallback = 'Non spécifié') => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return fallback;
        }
        if (Array.isArray(value)) {
          return value.map(item => item.name || item.title || item).join(', ');
        }
        return value;
      };

      const prompt = `Tu es un critique musical expérimenté. Écris une critique de 100 mots de l'album suivant en français :

Titre: ${album.title}
Artiste(s): ${safeGetValue(album.artists)}
Année: ${album.year || 'Non spécifiée'}
Genre(s): ${safeGetValue(album.genres)}
Style(s): ${safeGetValue(album.styles)}
Label: ${safeGetValue(album.labels)}
Tracklist: ${album.tracklist && album.tracklist.length > 0 ? 
  album.tracklist.slice(0, 5).map(track => `${track.title} (${track.duration || 'Durée inconnue'})`).join(', ') + 
  (album.tracklist.length > 5 ? `... et ${album.tracklist.length - 5} autres titres` : '') 
  : 'Non disponible'}

Termine par "Note : X.X/10" où X.X est ta note.`;

      console.log('📤 Envoi de la requête à Gemini...');
      const startTime = Date.now();
      
      const result = await model.generateContent(prompt);
      const review = result.response.text();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Critique générée en ${duration}ms`);
      console.log(`📏 Longueur: ${review.length} caractères`);
      
      // Test d'extraction de note
      const ratingPatterns = [
        /note[:\s]*(\d+(?:\.\d+)?)\/10/i,
        /(\d+(?:\.\d+)?)\/10/i,
        /(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /(\d+(?:\.\d+)?)\s*sur\s*10/i,
        /note[:\s]*(\d+(?:\.\d+)?)/i
      ];
      
      let rating = null;
      for (const pattern of ratingPatterns) {
        const match = review.match(pattern);
        if (match) {
          rating = parseFloat(match[1]);
          if (rating >= 0 && rating <= 10) {
            break;
          }
        }
      }
      
      if (rating !== null) {
        console.log(`⭐ Note extraite: ${rating}/10`);
      } else {
        console.log('⚠️  Aucune note trouvée dans la critique');
      }
      
      console.log(`📝 Aperçu de la critique: ${review.substring(0, 100)}...`);
      
    } catch (error) {
      console.error(`❌ Erreur pour ${album.title}:`, error.message);
      
      if (error.message.includes('quota')) {
        console.log('💡 Suggestion: Quota API dépassé, attendez avant de réessayer');
      } else if (error.message.includes('API key')) {
        console.log('💡 Suggestion: Vérifiez votre clé API Gemini');
      } else if (error.message.includes('network')) {
        console.log('💡 Suggestion: Problème de connexion réseau');
      }
    }
  }
  
  console.log('\n🏁 Test terminé');
}

// Test de validation des données d'album
function testAlbumValidation() {
  console.log('\n🔍 Test de validation des données d\'album...\n');
  
  const testCases = [
    { title: 'Valid Album', artists: [{ name: 'Artist' }], shouldPass: true },
    { title: '', artists: [{ name: 'Artist' }], shouldPass: false },
    { title: 'No Artists', artists: [], shouldPass: false },
    { title: 'No Artists Array', artists: null, shouldPass: false },
    { title: 'Valid Album', artists: [{ name: 'Artist' }], shouldPass: true }
  ];
  
  for (const testCase of testCases) {
    const isValid = testCase.title && testCase.artists && testCase.artists.length > 0;
    const status = isValid === testCase.shouldPass ? '✅' : '❌';
    console.log(`${status} ${testCase.title}: ${isValid ? 'Valide' : 'Invalide'}`);
  }
}

// Exécution des tests
async function runTests() {
  console.log('🚀 Démarrage des tests de génération de critique\n');
  
  testAlbumValidation();
  await testGeminiAPI();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testGeminiAPI, testAlbumValidation };
