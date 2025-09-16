#!/usr/bin/env node

/**
 * Script de test pour vérifier que les données sont correctement préservées
 * lors de la sauvegarde des critiques et des valeurs
 */

const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../app/lib/awsConfig');

async function testDataPreservation() {
  console.log('🧪 Test de préservation des données critiques et valeurs\n');
  
  const testAlbumId = 'test-album-123';
  const testUserId = 'test-user-456';
  
  try {
    // Nettoyer les données de test existantes
    console.log('🧹 Nettoyage des données de test...');
    try {
      await docClient.send(new GetCommand({
        TableName: "AlbumReviews",
        Key: { albumId: testAlbumId, userId: testUserId }
      }));
    } catch (error) {
      // Ignorer si l'item n'existe pas
    }
    
    // Test 1: Sauvegarder une valeur estimée
    console.log('\n1️⃣ Test de sauvegarde d\'une valeur estimée...');
    
    const valueItem = {
      albumId: testAlbumId,
      userId: testUserId,
      estimatedValue: 25.50,
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
      Item: valueItem
    }));
    
    console.log('✅ Valeur sauvegardée');
    
    // Vérifier que la valeur est bien sauvegardée
    const getValueResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (getValueResponse.Item && getValueResponse.Item.estimatedValue === 25.50) {
      console.log('✅ Valeur correctement récupérée');
    } else {
      console.log('❌ Problème avec la récupération de la valeur');
    }
    
    // Test 2: Sauvegarder une critique (doit préserver la valeur)
    console.log('\n2️⃣ Test de sauvegarde d\'une critique (doit préserver la valeur)...');
    
    const reviewItem = {
      albumId: testAlbumId,
      userId: testUserId,
      review: 'Cette critique de test vérifie que les données sont préservées.',
      rating: 8.5,
      albumTitle: 'Test Album',
      albumArtist: 'Test Artist',
      albumYear: 2023,
      genres: ['Rock'],
      styles: ['Alternative'],
      updatedAt: new Date().toISOString()
    };
    
    // Simuler la logique de préservation des données
    const existingItem = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (existingItem.Item) {
      // Conserver toutes les données existantes sauf review, rating et updatedAt
      Object.keys(existingItem.Item).forEach(key => {
        if (key !== 'review' && key !== 'rating' && key !== 'updatedAt') {
          reviewItem[key] = existingItem.Item[key];
        }
      });
      
      // Conserver la date de création originale
      if (existingItem.Item.createdAt) {
        reviewItem.createdAt = existingItem.Item.createdAt;
      }
    }
    
    await docClient.send(new PutCommand({
      TableName: "AlbumReviews",
      Item: reviewItem
    }));
    
    console.log('✅ Critique sauvegardée');
    
    // Vérifier que la valeur est toujours présente
    const getReviewResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (getReviewResponse.Item) {
      console.log('📊 Données finales:');
      console.log(`  - Valeur estimée: ${getReviewResponse.Item.estimatedValue || 'Non trouvée'}`);
      console.log(`  - Critique: ${getReviewResponse.Item.review ? 'Présente' : 'Non trouvée'}`);
      console.log(`  - Note: ${getReviewResponse.Item.rating || 'Non trouvée'}`);
      console.log(`  - Titre: ${getReviewResponse.Item.albumTitle || 'Non trouvé'}`);
      console.log(`  - Artiste: ${getReviewResponse.Item.albumArtist || 'Non trouvé'}`);
      
      if (getReviewResponse.Item.estimatedValue === 25.50 && getReviewResponse.Item.review) {
        console.log('✅ SUCCÈS: La valeur et la critique sont toutes deux préservées !');
      } else {
        console.log('❌ ÉCHEC: Des données ont été perdues');
      }
    } else {
      console.log('❌ Aucune donnée trouvée après sauvegarde de la critique');
    }
    
    // Test 3: Mettre à jour la valeur (doit préserver la critique)
    console.log('\n3️⃣ Test de mise à jour de la valeur (doit préserver la critique)...');
    
    const updatedValueItem = {
      albumId: testAlbumId,
      userId: testUserId,
      estimatedValue: 30.75,
      valueUpdatedAt: new Date().toISOString()
    };
    
    // Simuler la logique de préservation des données
    const existingReviewItem = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (existingReviewItem.Item) {
      // Conserver toutes les données existantes sauf estimatedValue et valueUpdatedAt
      Object.keys(existingReviewItem.Item).forEach(key => {
        if (key !== 'estimatedValue' && key !== 'valueUpdatedAt') {
          updatedValueItem[key] = existingReviewItem.Item[key];
        }
      });
      
      updatedValueItem.updatedAt = new Date().toISOString();
    }
    
    await docClient.send(new PutCommand({
      TableName: "AlbumReviews",
      Item: updatedValueItem
    }));
    
    console.log('✅ Valeur mise à jour');
    
    // Vérifier que la critique est toujours présente
    const getUpdatedResponse = await docClient.send(new GetCommand({
      TableName: "AlbumReviews",
      Key: { albumId: testAlbumId, userId: testUserId }
    }));
    
    if (getUpdatedResponse.Item) {
      console.log('📊 Données après mise à jour:');
      console.log(`  - Valeur estimée: ${getUpdatedResponse.Item.estimatedValue || 'Non trouvée'}`);
      console.log(`  - Critique: ${getUpdatedResponse.Item.review ? 'Présente' : 'Non trouvée'}`);
      console.log(`  - Note: ${getUpdatedResponse.Item.rating || 'Non trouvée'}`);
      
      if (getUpdatedResponse.Item.estimatedValue === 30.75 && getUpdatedResponse.Item.review) {
        console.log('✅ SUCCÈS: La critique est préservée lors de la mise à jour de la valeur !');
      } else {
        console.log('❌ ÉCHEC: Des données ont été perdues lors de la mise à jour');
      }
    } else {
      console.log('❌ Aucune donnée trouvée après mise à jour de la valeur');
    }
    
    // Nettoyage final
    console.log('\n🧹 Nettoyage des données de test...');
    // Note: On ne supprime pas l'item car on n'a pas de méthode DELETE dans ce script
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('💡 La table AlbumReviews n\'existe pas encore');
      console.log('💡 Exécutez: node scripts/create-album-reviews-table.js');
    }
  }
  
  console.log('\n✨ Test terminé !');
}

testDataPreservation().catch(console.error);
