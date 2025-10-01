#!/usr/bin/env node

/**
 * Script de test pour vérifier le nouveau prompt de génération des critiques
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testNewPrompt() {
  console.log('🎯 Test du nouveau prompt de génération des critiques\n');
  
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.log('❌ Clé API Google Gemini manquante');
    console.log('💡 Définissez GOOGLE_GEMINI_API_KEY dans votre environnement');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3, // Plus déterministe pour des critiques cohérentes
        topK: 20, // Plus restrictif pour un vocabulaire précis
        topP: 0.8, // Plus focalisé sur les meilleures options
        maxOutputTokens: 1200, // Plus d'espace pour des analyses détaillées
      }
    });
    
    // Test avec un album connu
    const testPrompt = `Tu es un critique musical légendaire, rédacteur en chef de Pitchfork avec 20 ans d'expérience. Tu as écrit pour Rolling Stone, NME, et The Quietus. Tu es connu pour ton exigence implacable et tes analyses sans concession. Écris une critique musicale de 250-350 mots en français :

ALBUM: Abbey Road - The Beatles (1969)
GENRE: Rock | STYLE: Psychedelic Rock, Pop Rock
TRACKS: Come Together, Something, Maxwell's Silver Hammer, Oh! Darling, Octopus's Garden + 12 autres

STRUCTURE OBLIGATOIRE :
1. ANALYSE DE L'INTENTION : Que cherche à accomplir cet album ? Quelle est sa vision artistique ?
2. ÉVALUATION TECHNIQUE : Composition, arrangements, production, performances instrumentales
3. COHÉRENCE ARTISTIQUE : L'album tient-il ses promesses ? Y a-t-il des failles conceptuelles ?
4. INNOVATION vs CONFORMISME : Apporte-t-il quelque chose de nouveau ou recycle-t-il des clichés ?
5. VERDICT FINAL : Impact émotionnel et intellectuel, place dans la discographie de l'artiste

ÉCHELLE DE NOTATION STRICTE :
- 9.0-10.0 : RÉVOLUTIONNAIRE - Redéfinit le genre, influence durable, perfection technique et artistique
- 8.0-8.9 : EXCEPTIONNEL - Chef-d'œuvre avec quelques imperfections mineures, influence majeure
- 7.0-7.9 : TRÈS BON - Album solide avec des moments brillants, quelques défauts notables
- 6.0-6.9 : BON - Qualité correcte mais sans éclat particulier, quelques bonnes idées
- 5.0-5.9 : MOYEN - Compétent mais sans inspiration, remplissage convenable
- 4.0-4.9 : DÉCEVANT - Problèmes techniques ou artistiques majeurs, raté partiel
- 3.0-3.9 : MAUVAIS - Échec artistique notable, peu d'intérêt musical
- 2.0-2.9 : TRÈS MAUVAIS - Presque sans valeur, erreurs grossières
- 1.0-1.9 : CATASTROPHIQUE - Échec complet, sans aucun mérite
- 0.0-0.9 : INSUPPORTABLE - Offense à la musique, à éviter absolument

EXIGENCES CRITIQUES :
- Sois IMPLACABLE : Un 8/10 doit être justifié par une excellence réelle
- Évite la complaisance : La plupart des albums sont moyens (5-6/10)
- Analyse technique précise : Production, mixage, arrangements, performances
- Contextualise : Compare aux références du genre et à l'époque
- Sois constructif : Même dans la critique, explique pourquoi quelque chose ne fonctionne pas
- Termine par "Note : X.X/10" avec une décimale précise

TON : Professionnel, incisif, sans complaisance mais équitable. Utilise un vocabulaire riche et précis.`;
    
    console.log('🚀 Génération d\'une critique test avec le nouveau prompt...');
    const startTime = Date.now();
    
    const result = await model.generateContent(testPrompt);
    const review = result.response.text();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Critique générée en ${duration}ms`);
    console.log(`📏 Longueur: ${review.length} caractères`);
    
    console.log('\n📝 Critique générée:');
    console.log('─'.repeat(80));
    console.log(review);
    console.log('─'.repeat(80));
    
    // Analyser la critique générée
    console.log('\n📊 Analyse de la critique:');
    
    // Vérifier la structure
    const hasStructure = review.includes('ANALYSE') || review.includes('ÉVALUATION') || review.includes('COHÉRENCE') || review.includes('INNOVATION') || review.includes('VERDICT');
    console.log(`✅ Structure respectée: ${hasStructure ? 'Oui' : 'Non'}`);
    
    // Vérifier la note
    const ratingMatch = review.match(/note[:\s]*(\d+(?:\.\d+)?)\/10/i);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      console.log(`⭐ Note attribuée: ${rating}/10`);
      
      // Analyser la sévérité
      if (rating >= 8.0) {
        console.log('🎯 Sévérité: Très exigeant (note élevée justifiée)');
      } else if (rating >= 6.0) {
        console.log('🎯 Sévérité: Modérément exigeant');
      } else if (rating >= 4.0) {
        console.log('🎯 Sévérité: Critique sévère');
      } else {
        console.log('🎯 Sévérité: Très sévère');
      }
    } else {
      console.log('❌ Aucune note trouvée dans la critique');
    }
    
    // Vérifier le vocabulaire
    const sophisticatedWords = ['nuance', 'paradigme', 'esthétique', 'paradoxe', 'dichotomie', 'épistémologie', 'herméneutique'];
    const hasSophisticatedVocab = sophisticatedWords.some(word => review.toLowerCase().includes(word));
    console.log(`📚 Vocabulaire sophistiqué: ${hasSophisticatedVocab ? 'Oui' : 'Non'}`);
    
    // Vérifier la longueur
    const wordCount = review.split(/\s+/).length;
    console.log(`📏 Nombre de mots: ${wordCount}`);
    
    if (wordCount >= 250 && wordCount <= 350) {
      console.log('✅ Longueur respectée (250-350 mots)');
    } else {
      console.log('⚠️  Longueur hors des limites recommandées');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('💡 Problème de quota - vérifiez votre plan Google AI Studio');
    } else if (error.message.includes('API key')) {
      console.log('💡 Clé API invalide - vérifiez GOOGLE_GEMINI_API_KEY');
    }
  }
  
  console.log('\n✨ Test terminé !');
  console.log('\n📋 Améliorations apportées au prompt:');
  console.log('✅ Persona plus crédible et exigeant');
  console.log('✅ Structure obligatoire en 5 points');
  console.log('✅ Échelle de notation plus stricte et détaillée');
  console.log('✅ Exigences critiques plus précises');
  console.log('✅ Paramètres de génération optimisés');
  console.log('✅ Longueur augmentée (250-350 mots)');
  console.log('✅ Ton plus professionnel et incisif');
}

testNewPrompt().catch(console.error);
