#!/usr/bin/env node

/**
 * Script de test pour vérifier la récupération des critiques d'album
 */

const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../app/lib/awsConfig');

async function testReviewRetrieval() {
  console.log('🔍 Test de récupération des critiques d\'album\n');
  
  // Test avec un album connu (Abbey Road - The Beatles)
  const testAlbumId = '1';
  const testUserId = 'auth0|test-user'; // Remplacez par un vrai userId pour tester
  
  try {
    console.log(`📀 Test avec l'album ID: ${testAlbumId}`);
    console.log(`👤 Test avec l'utilisateur ID: ${testUserId}`);
    
    // Vérifier si une critique existe
    const getReviewCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: testAlbumId,
        userId: testUserId 
      },
    });

    const response = await docClient.send(getReviewCommand);
    
    if (response.Item) {
      console.log('✅ Critique trouvée en base de données:');
      console.log(`📝 Critique: ${response.Item.review ? response.Item.review.substring(0, 100) + '...' : 'Non disponible'}`);
      console.log(`⭐ Note: ${response.Item.rating || 'Non disponible'}`);
      console.log(`🎵 Album: ${response.Item.albumTitle || 'Non disponible'}`);
      console.log(`👤 Artiste: ${response.Item.albumArtist || 'Non disponible'}`);
      console.log(`📅 Créé le: ${response.Item.createdAt || 'Non disponible'}`);
    } else {
      console.log('❌ Aucune critique trouvée pour cet album et cet utilisateur');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('💡 La table AlbumReviews n\'existe pas encore');
      console.log('💡 Exécutez: node scripts/create-album-reviews-table.js');
    } else if (error.name === 'AccessDeniedException') {
      console.log('💡 Problème d\'accès à DynamoDB - vérifiez vos credentials AWS');
    }
  }
  
  // Test de la structure de la table
  console.log('\n📊 Structure attendue de la table AlbumReviews:');
  console.log('- Clé de partition: albumId (String)');
  console.log('- Clé de tri: userId (String)');
  console.log('- Attributs: review, rating, albumTitle, albumArtist, albumYear, genres, styles, createdAt, updatedAt');
  
  console.log('\n✨ Test terminé !');
}

testReviewRetrieval().catch(console.error);
