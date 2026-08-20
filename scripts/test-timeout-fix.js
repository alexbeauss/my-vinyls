#!/usr/bin/env node

/**
 * Script de test pour vérifier les améliorations de timeout
 * Teste la génération de critiques avec gestion des timeouts
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testTimeoutImprovements() {
  console.log('🧪 Test des améliorations de timeout pour la génération de critiques\n');
  
  // Configuration Gemini
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
  
  // Test avec un prompt optimisé
  const testPrompt = `Critique musicale de 120-150 mots en français :

ALBUM: Abbey Road - The Beatles (1969)
GENRE: Rock | STYLE: Psychedelic Rock, Pop Rock
TRACKS: Come Together, Something, Maxwell's Silver Hammer, Oh! Darling, Octopus's Garden + 12 autres

Écris une critique qui couvre :
1. L'essence de l'album (vision, intention)
2. Analyse musicale (points forts/faiblesses)
3. Impact et influence
4. Note finale sur 10 avec décimale

CRITÈRES :
- 9-10/10 : Chef-d'œuvre exceptionnel
- 7-8/10 : Très bon avec imperfections mineures  
- 5-6/10 : Correct mais sans éclat
- 3-4/10 : Décevant avec problèmes notables
- 1-2/10 : Raté, peu d'intérêt
- 0/10 : Échec complet

RÈGLES :
- Sois honnête et équilibré
- Commence par ce que l'album EST
- Pointe les défauts constructivement
- Compare aux standards du genre
- Termine par "Note : X.X/10"`;

  console.log('📤 Test de génération avec prompt optimisé...');
  console.log('⏱️  Timeout configuré à 45 secondes\n');
  
  try {
    const startTime = Date.now();
    
    // Timeout de 45 secondes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de génération Gemini')), 45000);
    });
    
    const generationPromise = model.generateContent(testPrompt);
    
    const result = await Promise.race([generationPromise, timeoutPromise]);
    const review = result.response.text();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Critique générée avec succès en ${duration}ms`);
    console.log(`📏 Longueur: ${review.length} caractères`);
    console.log(`📝 Aperçu: ${review.substring(0, 200)}...`);
    
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
        break;
      }
    }
    
    if (rating !== null) {
      console.log(`⭐ Note extraite: ${rating}/10`);
    } else {
      console.log('⚠️  Aucune note trouvée dans la critique');
    }
    
    // Vérification de la qualité
    if (review.length < 50) {
      console.log('❌ Critique trop courte, probablement incomplète');
    } else if (review.length > 300) {
      console.log('⚠️  Critique plus longue que prévu (mais acceptable)');
    } else {
      console.log('✅ Longueur de critique appropriée');
    }
    
    console.log('\n🎯 Test de performance:');
    if (duration < 10000) {
      console.log('🚀 Excellent: Génération très rapide (< 10s)');
    } else if (duration < 30000) {
      console.log('✅ Bon: Génération dans les temps (< 30s)');
    } else if (duration < 45000) {
      console.log('⚠️  Lent mais acceptable (< 45s)');
    } else {
      console.log('❌ Trop lent: Dépassement du timeout');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.message.includes('Timeout')) {
      console.log('💡 Le timeout fonctionne correctement');
    } else if (error.message.includes('quota')) {
      console.log('💡 Problème de quota Google Gemini');
    } else if (error.message.includes('API key')) {
      console.log('💡 Problème de configuration API');
    }
  }
}

// Test de retry simulé
async function testRetryMechanism() {
  console.log('\n🔄 Test du mécanisme de retry...');
  
  let attempt = 0;
  const maxRetries = 2;
  
  while (attempt <= maxRetries) {
    attempt++;
    console.log(`Tentative ${attempt}/${maxRetries + 1}`);
    
    try {
      // Simulation d'une requête qui peut échouer
      const shouldFail = Math.random() < 0.3; // 30% de chance d'échec
      
      if (shouldFail && attempt <= maxRetries) {
        throw new Error('Erreur simulée - retry nécessaire');
      }
      
      console.log('✅ Succès simulé');
      break;
      
    } catch (error) {
      console.log(`❌ Échec: ${error.message}`);
      
      if (attempt <= maxRetries) {
        const delay = 2000 * attempt; // Délai progressif
        console.log(`⏳ Retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log('💥 Toutes les tentatives ont échoué');
      }
    }
  }
}

async function main() {
  console.log('🚀 Démarrage des tests de timeout...\n');
  
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error('❌ GOOGLE_GEMINI_API_KEY non définie');
    process.exit(1);
  }
  
  await testTimeoutImprovements();
  await testRetryMechanism();
  
  console.log('\n✨ Tests terminés !');
  console.log('\n📋 Résumé des améliorations:');
  console.log('• Timeout Vercel configuré à 60s');
  console.log('• Timeout client à 45s avec retry automatique');
  console.log('• Prompt optimisé pour génération plus rapide');
  console.log('• Gestion d\'erreur améliorée côté serveur et client');
  console.log('• Mécanisme de retry avec délai progressif');
}

main().catch(console.error);
