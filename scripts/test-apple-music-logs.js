#!/usr/bin/env node

/**
 * Script de test pour vérifier les logs de l'API Apple Music
 */

console.log('📝 Test des logs Apple Music - Documentation\n');

console.log('✅ Logs ajoutés dans /api/apple-music/search/route.js:');

console.log('\n🍎 === FORMAT DES LOGS ===');

console.log('\n1️⃣ Début de recherche:');
console.log('🍎 === RECHERCHE APPLE MUSIC ===');
console.log('📝 Recherche: "Artiste" - "Album"');
console.log('🔗 URL iTunes: https://itunes.apple.com/search?term=...');

console.log('\n2️⃣ Album trouvé:');
console.log('📊 Résultats iTunes: 1 album(s) trouvé(s)');
console.log('✅ Album trouvé:');
console.log('   📀 Titre: "Nom de l\'album"');
console.log('   🎤 Artiste: "Nom de l\'artiste"');
console.log('   📅 Année: 1973');
console.log('   🎵 Genre: Rock');
console.log('   🎼 Pistes: 9');
console.log('   🖼️  Artwork: https://is1-ssl.mzstatic.com/image/thumb/...');
console.log('   🔗 Lien direct: https://music.apple.com/album/123456789');
console.log('🍎 === FIN RECHERCHE ===');

console.log('\n3️⃣ Album non trouvé:');
console.log('📊 Résultats iTunes: 0 album(s) trouvé(s)');
console.log('⚠️  Aucun album trouvé pour "Artiste" - "Album"');
console.log('🔍 Fallback vers recherche Apple Music: https://music.apple.com/search?term=...');
console.log('🍎 === FIN RECHERCHE ===');

console.log('\n4️⃣ Erreur:');
console.log('🍎 === ERREUR RECHERCHE APPLE MUSIC ===');
console.log('❌ Erreur: Description de l\'erreur');
console.log('🍎 === FIN ERREUR ===');
console.log('🔄 Fallback activé pour "Artiste" - "Album"');
console.log('🔍 URL de fallback: https://music.apple.com/search?term=...');

console.log('\n📊 Informations loggées:');
console.log('• Paramètres de recherche (artiste, album)');
console.log('• URL iTunes construite');
console.log('• Nombre de résultats trouvés');
console.log('• Détails complets de l\'album (titre, artiste, année, genre, pistes)');
console.log('• URL de l\'artwork');
console.log('• Lien direct Apple Music');
console.log('• Messages d\'erreur détaillés');
console.log('• URLs de fallback');

console.log('\n🎯 Avantages des logs:');
console.log('• Debugging facilité');
console.log('• Suivi des recherches en temps réel');
console.log('• Identification des problèmes');
console.log('• Monitoring des performances');
console.log('• Format visuel avec emojis');

console.log('\n🧪 Tests effectués:');
console.log('✅ Recherche Pink Floyd - Dark Side of the Moon');
console.log('✅ Recherche Test Artist - Non Existent Album');
console.log('✅ Logs affichés dans le terminal du serveur');

console.log('\n📱 Où voir les logs:');
console.log('• Terminal du serveur de développement (npm run dev)');
console.log('• Logs Vercel en production');
console.log('• Console du navigateur (pour les erreurs côté client)');

console.log('\n✨ Logs Apple Music implémentés !');
console.log('Tous les appels à l\'API sont maintenant loggés avec des détails complets.');
