#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier les problèmes de génération de critiques
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Discogs = require('disconnect');

async function diagnoseReviewIssues() {
  console.log('🔍 Diagnostic des problèmes de génération de critiques\n');
  
  // 1. Vérification des variables d'environnement
  console.log('1️⃣ Vérification des variables d\'environnement...');
  
  const requiredEnvVars = [
    'GOOGLE_GEMINI_API_KEY',
    'DISCOGS_USER_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Variables d\'environnement manquantes:', missingVars);
    return;
  } else {
    console.log('✅ Toutes les variables d\'environnement sont présentes');
  }
  
  // 2. Test de l'API Google Gemini
  console.log('\n2️⃣ Test de l\'API Google Gemini...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
    
    const testPrompt = `Critique musicale de 120-150 mots en français :

ALBUM: Abbey Road - The Beatles (1969)
GENRE: Rock | STYLE: Psychedelic Rock, Pop Rock
TRACKS: Come Together, Something, Maxwell's Silver Hammer, Oh! Darling, Octopus's Garden + 12 autres

Écris une critique qui couvre :
1. L'essence de l'album (vision, intention)
2. Analyse musicale (points forts/faiblesses)
3. Impact et influence
4. Note finale sur 10 avec décimale

Termine par "Note : X.X/10"`;
    
    const startTime = Date.now();
    const result = await model.generateContent(testPrompt);
    const review = result.response.text();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Gemini fonctionne - Génération en ${duration}ms`);
    console.log(`📏 Longueur critique: ${review.length} caractères`);
    
    // Vérifier la note
    const ratingMatch = review.match(/note[:\s]*(\d+(?:\.\d+)?)\/10/i);
    if (ratingMatch) {
      console.log(`⭐ Note extraite: ${ratingMatch[1]}/10`);
    } else {
      console.log('⚠️  Aucune note trouvée dans la critique');
    }
    
  } catch (error) {
    console.log('❌ Erreur Gemini:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('💡 Problème de quota - vérifiez votre plan Google AI Studio');
    } else if (error.message.includes('API key')) {
      console.log('💡 Clé API invalide - vérifiez GOOGLE_GEMINI_API_KEY');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Timeout - problème de réseau ou serveur lent');
    }
  }
  
  // 3. Test de l'API Discogs
  console.log('\n3️⃣ Test de l\'API Discogs...');
  
  try {
    const dis = new Discogs.Client({ userToken: process.env.DISCOGS_USER_TOKEN });
    
    const startTime = Date.now();
    const release = await dis.database().getRelease(1); // Abbey Road
    const duration = Date.now() - startTime;
    
    console.log(`✅ Discogs fonctionne - Récupération en ${duration}ms`);
    console.log(`📀 Album test: ${release.title} - ${release.artists[0].name}`);
    
  } catch (error) {
    console.log('❌ Erreur Discogs:', error.message);
    
    if (error.status === 401) {
      console.log('💡 Token invalide - vérifiez DISCOGS_USER_TOKEN');
    } else if (error.status === 429) {
      console.log('💡 Rate limit atteint - attendez avant de réessayer');
    } else if (error.status === 404) {
      console.log('💡 Album non trouvé - ID invalide');
    }
  }
  
  // 4. Test de performance combiné
  console.log('\n4️⃣ Test de performance combiné...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const dis = new Discogs.Client({ userToken: process.env.DISCOGS_USER_TOKEN });
    
    const startTime = Date.now();
    
    // Simuler le processus complet
    console.log('📡 Récupération album...');
    const albumStart = Date.now();
    const album = await dis.database().getRelease(1);
    const albumDuration = Date.now() - albumStart;
    console.log(`✅ Album récupéré en ${albumDuration}ms`);
    
    console.log('🤖 Génération critique...');
    const reviewStart = Date.now();
    const prompt = `Critique de 100 mots de ${album.title} par ${album.artists[0].name}. Termine par "Note : X.X/10"`;
    const result = await model.generateContent(prompt);
    const review = result.response.text();
    const reviewDuration = Date.now() - reviewStart;
    console.log(`✅ Critique générée en ${reviewDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`🎉 Processus complet en ${totalDuration}ms`);
    
    // Analyse des performances
    if (totalDuration < 10000) {
      console.log('🚀 Excellent: Processus très rapide');
    } else if (totalDuration < 30000) {
      console.log('✅ Bon: Processus dans les temps');
    } else if (totalDuration < 60000) {
      console.log('⚠️  Lent: Processus acceptable mais proche des limites');
    } else {
      console.log('❌ Trop lent: Risque de timeout');
    }
    
  } catch (error) {
    console.log('❌ Erreur lors du test combiné:', error.message);
  }
  
  // 5. Recommandations
  console.log('\n5️⃣ Recommandations:');
  console.log('• Vérifiez les logs Vercel pour les erreurs spécifiques');
  console.log('• Surveillez les quotas Google Gemini');
  console.log('• Respectez les limites de rate Discogs');
  console.log('• Utilisez le retry automatique côté client');
  console.log('• Considérez un cache pour les albums populaires');
  
  console.log('\n✨ Diagnostic terminé !');
}

main().catch(console.error);

async function main() {
  await diagnoseReviewIssues();
}
