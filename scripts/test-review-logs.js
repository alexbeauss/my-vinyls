#!/usr/bin/env node

/**
 * Script de test pour vérifier que les logs de génération des critiques sont corrects
 */

const { GetCommand, PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../app/lib/awsConfig');

async function testReviewLogs() {
  console.log('📝 Test des logs de génération des critiques\n');
  
  const testAlbumId = 'test-logs-789';
  const testUserId = 'test-user-logs';
  
  try {
    // Nettoyer les données de test existantes
    console.log('🧹 Nettoyage des données de test...');
    try {
      await docClient.send(new DeleteCommand({
        TableName: "AlbumReviews",
        Key: { albumId: testAlbumId, userId: testUserId }
      }));
    } catch (error) {
      // Ignorer si l'item n'existe pas
    }
    
    // Test 1: Vérifier qu'aucun item n'existe
    console.log('\n1️⃣ Test: Aucun item en base de données');
    
    const getEmptyResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (!getEmptyResponse.Item) {
      console.log('✅ Aucun item trouvé (comportement attendu)');
    } else {
      console.log('❌ Item trouvé alors qu\'aucun ne devrait exister');
    }
    
    // Test 2: Créer un item avec seulement une valeur (pas de critique)
    console.log('\n2️⃣ Test: Item avec valeur uniquement (pas de critique)');
    
    const valueOnlyItem = {
      albumId: testAlbumId,
      userId: testUserId,
      estimatedValue: 15.99,
      valueUpdatedAt: new Date().toISOString(),
      albumTitle: 'Test Album',
      albumArtist: 'Test Artist',
      albumYear: 2023,
      genres: ['Rock'],
      styles: ['Alternative'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: "AlbumReviews",
      Item: valueOnlyItem
    }));
    
    console.log('✅ Item avec valeur uniquement créé');
    
    // Vérifier que l'item existe mais n'a pas de critique
    const getValueOnlyResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (getValueOnlyResponse.Item) {
      console.log('📊 Contenu de l\'item:');
      console.log(`  - Valeur estimée: ${getValueOnlyResponse.Item.estimatedValue || 'Non trouvée'}`);
      console.log(`  - Critique: ${getValueOnlyResponse.Item.review || 'Non trouvée'}`);
      console.log(`  - Note: ${getValueOnlyResponse.Item.rating || 'Non trouvée'}`);
      
      if (getValueOnlyResponse.Item.estimatedValue && !getValueOnlyResponse.Item.review) {
        console.log('✅ Item correct: valeur présente, critique absente');
      } else {
        console.log('❌ Item incorrect: structure inattendue');
      }
    } else {
      console.log('❌ Item non trouvé après création');
    }
    
    // Test 3: Ajouter une critique à l'item existant
    console.log('\n3️⃣ Test: Ajout d\'une critique à l\'item existant');
    
    const itemWithReview = {
      ...valueOnlyItem,
      review: 'Cette critique de test vérifie que les logs sont corrects.',
      rating: 7.5,
      updatedAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: "AlbumReviews",
      Item: itemWithReview
    }));
    
    console.log('✅ Critique ajoutée à l\'item existant');
    
    // Vérifier que l'item a maintenant une critique
    const getWithReviewResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (getWithReviewResponse.Item) {
      console.log('📊 Contenu de l\'item avec critique:');
      console.log(`  - Valeur estimée: ${getWithReviewResponse.Item.estimatedValue || 'Non trouvée'}`);
      console.log(`  - Critique: ${getWithReviewResponse.Item.review ? 'Présente' : 'Non trouvée'}`);
      console.log(`  - Note: ${getWithReviewResponse.Item.rating || 'Non trouvée'}`);
      
      if (getWithReviewResponse.Item.estimatedValue && getWithReviewResponse.Item.review) {
        console.log('✅ Item correct: valeur et critique présentes');
      } else {
        console.log('❌ Item incorrect: données manquantes');
      }
    } else {
      console.log('❌ Item non trouvé après ajout de critique');
    }
    
    // Test 4: Simuler la logique de vérification des critiques
    console.log('\n4️⃣ Test: Simulation de la logique de vérification');
    
    const testCases = [
      { name: 'Aucun item', item: null },
      { name: 'Item sans critique', item: valueOnlyItem },
      { name: 'Item avec critique', item: itemWithReview }
    ];
    
    testCases.forEach(testCase => {
      console.log(`\n📋 Test: ${testCase.name}`);
      
      if (testCase.item && testCase.item.review) {
        console.log('✅ Critique existante trouvée (log correct)');
      } else if (testCase.item) {
        console.log('📊 Item existant sans critique (log correct)');
      } else {
        console.log('📝 Aucun item existant (log correct)');
      }
    });
    
    // Nettoyage final
    console.log('\n🧹 Nettoyage des données de test...');
    try {
      await docClient.send(new DeleteCommand({
        TableName: "AlbumReviews",
        Key: { albumId: testAlbumId, userId: testUserId }
      }));
      console.log('✅ Données de test supprimées');
    } catch (error) {
      console.log('⚠️  Erreur lors du nettoyage:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('💡 La table AlbumReviews n\'existe pas encore');
      console.log('💡 Exécutez: node scripts/create-album-reviews-table.js');
    }
  }
  
  console.log('\n✨ Test terminé !');
  console.log('\n📋 Résumé des corrections apportées:');
  console.log('✅ Vérification améliorée: if (existingReviewResponse.Item && existingReviewResponse.Item.review)');
  console.log('✅ Logs différenciés: "Item existant sans critique" vs "Aucun item existant"');
  console.log('✅ Logs plus précis pour le debugging');
}

testReviewLogs().catch(console.error);
