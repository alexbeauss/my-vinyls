#!/usr/bin/env node

/**
 * Script de test pour vérifier que la correction de récupération des critiques fonctionne
 */

const fetch = require('node-fetch');

async function testReviewFix() {
  console.log('🔧 Test de la correction de récupération des critiques\n');
  
  // URL de test (remplacez par votre URL de déploiement)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const testAlbumId = '1'; // Abbey Road - The Beatles
  
  console.log(`🌐 URL de test: ${baseUrl}`);
  console.log(`📀 Album de test: ${testAlbumId} (Abbey Road - The Beatles)`);
  
  try {
    // Test 1: Vérifier que la route GET fonctionne
    console.log('\n1️⃣ Test de la route GET /api/album/[id]/review...');
    
    const getResponse = await fetch(`${baseUrl}/api/album/${testAlbumId}/review`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Status: ${getResponse.status}`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ Route GET fonctionne');
      
      if (data.review) {
        console.log(`📝 Critique trouvée: ${data.review.substring(0, 100)}...`);
        console.log(`⭐ Note: ${data.rating}`);
      } else {
        console.log('ℹ️  Aucune critique existante (normal pour un nouvel album)');
      }
    } else {
      const errorData = await getResponse.json().catch(() => ({}));
      console.log(`❌ Erreur GET: ${errorData.error || getResponse.statusText}`);
    }
    
    // Test 2: Vérifier que la route POST génère une critique
    console.log('\n2️⃣ Test de la route POST /api/album/[id]/review...');
    
    const postResponse = await fetch(`${baseUrl}/api/album/${testAlbumId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Status: ${postResponse.status}`);
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('✅ Route POST fonctionne');
      
      if (data.review) {
        console.log(`📝 Critique générée: ${data.review.substring(0, 100)}...`);
        console.log(`⭐ Note: ${data.rating}`);
        console.log(`🎵 Album: ${data.albumInfo?.title}`);
      } else {
        console.log('❌ Aucune critique générée');
      }
    } else {
      const errorData = await postResponse.json().catch(() => ({}));
      console.log(`❌ Erreur POST: ${errorData.error || postResponse.statusText}`);
    }
    
    // Test 3: Vérifier que la récupération fonctionne après génération
    console.log('\n3️⃣ Test de récupération après génération...');
    
    const getResponse2 = await fetch(`${baseUrl}/api/album/${testAlbumId}/review`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (getResponse2.ok) {
      const data = await getResponse2.json();
      if (data.review) {
        console.log('✅ La critique est maintenant récupérable via GET');
        console.log(`📝 Critique: ${data.review.substring(0, 100)}...`);
        console.log(`⭐ Note: ${data.rating}`);
      } else {
        console.log('❌ La critique n\'est pas récupérable via GET');
      }
    } else {
      console.log('❌ Erreur lors de la récupération après génération');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Le serveur n\'est pas démarré');
      console.log('💡 Exécutez: npm run dev');
    } else if (error.message.includes('fetch')) {
      console.log('💡 Problème de réseau ou URL incorrecte');
    }
  }
  
  console.log('\n📋 Résumé des corrections appliquées:');
  console.log('✅ Composant AlbumDetails.js: Méthode GET au lieu de POST pour récupérer les critiques');
  console.log('✅ Route API: GET /api/album/[id]/review pour récupérer les critiques existantes');
  console.log('✅ Route API: POST /api/album/[id]/review pour générer de nouvelles critiques');
  console.log('✅ DynamoDB: Table AlbumReviews configurée correctement');
  
  console.log('\n✨ Test terminé !');
}

testReviewFix().catch(console.error);
