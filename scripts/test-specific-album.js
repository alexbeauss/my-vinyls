#!/usr/bin/env node

/**
 * Script de test pour un album spécifique
 * Usage: node scripts/test-specific-album.js <album_id>
 */

const albumId = process.argv[2];

if (!albumId) {
  console.log('Usage: node scripts/test-specific-album.js <album_id>');
  console.log('Exemple: node scripts/test-specific-album.js 1794222');
  process.exit(1);
}

async function testSpecificAlbum() {
  console.log(`🧪 Test de génération de critique pour l'album ${albumId}\n`);
  
  try {
    // Test de l'API GET d'abord
    console.log('1️⃣ Test GET critique...');
    const getResponse = await fetch(`http://localhost:3000/api/album/${albumId}/review`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status GET: ${getResponse.status}`);
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('Réponse GET:', JSON.stringify(getData, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.log('Erreur GET:', errorText);
    }
    
    console.log('\n2️⃣ Test POST génération...');
    const postResponse = await fetch(`http://localhost:3000/api/album/${albumId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status POST: ${postResponse.status}`);
    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('Réponse POST:', JSON.stringify(postData, null, 2));
    } else {
      const errorText = await postResponse.text();
      console.log('Erreur POST:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Vérifier si le serveur est en cours d'exécution
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Vérification du serveur...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Serveur non accessible sur http://localhost:3000');
    console.log('💡 Démarrez le serveur avec: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Serveur accessible\n');
  await testSpecificAlbum();
}

main().catch(console.error);

