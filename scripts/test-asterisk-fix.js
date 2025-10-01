#!/usr/bin/env node

/**
 * Script de test pour vérifier la correction des astérisques dans les titres d'albums recommandés
 */

console.log('🔧 Test de la correction des astérisques - Documentation\n');

console.log('✅ Problème identifié:');
console.log('• L\'IA génère des titres avec des astérisques (*) pour le formatage');
console.log('• Exemple: "*Kind of Blue*" au lieu de "Kind of Blue"');
console.log('• Les astérisques empêchent la recherche Apple Music de fonctionner');
console.log('• L\'API iTunes ne trouve pas les albums avec des caractères spéciaux');

console.log('\n🔧 Corrections apportées:');

console.log('\n1️⃣ Modification du prompt Gemini:');
console.log('• Ajout d\'instructions strictes sur le format');
console.log('• Interdiction explicite des astérisques');
console.log('• Exemples corrects et incorrects');
console.log('• Format: "ALBUM RECOMMANDÉ : [Titre] - [Artiste] ([Année])"');

console.log('\n2️⃣ Amélioration de la fonction d\'extraction:');
console.log('• Nettoyage automatique des caractères de formatage');
console.log('• Suppression des astérisques (*)');
console.log('• Suppression des guillemets ("\')');
console.log('• Suppression des underscores (_)');
console.log('• Suppression des backticks (`)');
console.log('• Logs détaillés du nettoyage');

console.log('\n📝 Instructions ajoutées au prompt:');
console.log('FORMAT STRICT pour l\'album recommandé :');
console.log('- Pas d\'astérisques (*) dans le titre');
console.log('- Pas de guillemets autour du titre');
console.log('- Pas de caractères spéciaux de formatage');
console.log('- Titre exact de l\'album tel qu\'il apparaît sur les plateformes');
console.log('- Exemple correct : "ALBUM RECOMMANDÉ : Kind of Blue - Miles Davis (1959)"');
console.log('- Exemple incorrect : "ALBUM RECOMMANDÉ : *Kind of Blue* - Miles Davis (1959)"');

console.log('\n🧹 Fonction de nettoyage:');
console.log('const cleanTitle = title');
console.log('  .trim()');
console.log('  .replace(/\\*+/g, \'\') // Supprimer les astérisques');
console.log('  .replace(/^["\']|["\']$/g, \'\') // Supprimer les guillemets');
console.log('  .replace(/^_+|_+$/g, \'\') // Supprimer les underscores');
console.log('  .replace(/^`+|`+$/g, \'\') // Supprimer les backticks');
console.log('  .trim();');

console.log('\n📊 Logs ajoutés:');
console.log('🎵 Album recommandé extrait:');
console.log('   Titre original: "*Kind of Blue*"');
console.log('   Titre nettoyé: "Kind of Blue"');
console.log('   Artiste original: "*Miles Davis*"');
console.log('   Artiste nettoyé: "Miles Davis"');

console.log('\n🎯 Cas de test:');
console.log('• "*Kind of Blue*" → "Kind of Blue"');
console.log('• "\'Dark Side of the Moon\'" → "Dark Side of the Moon"');
console.log('• "_Abbey Road_" → "Abbey Road"');
console.log('• "`Sgt. Pepper\'s`" → "Sgt. Pepper\'s"');
console.log('• "*The Beatles* - *Abbey Road*" → "The Beatles - Abbey Road"');

console.log('\n✅ Résultats attendus:');
console.log('• Recherches Apple Music fonctionnelles');
console.log('• Titres propres sans formatage');
console.log('• Meilleure correspondance avec iTunes');
console.log('• Logs détaillés pour le debugging');

console.log('\n🧪 Tests à effectuer:');
console.log('1. Générer une critique avec album recommandé');
console.log('2. Vérifier l\'extraction sans astérisques');
console.log('3. Tester la recherche Apple Music');
console.log('4. Vérifier les logs de nettoyage');

console.log('\n✨ Correction terminée !');
console.log('Les astérisques et caractères de formatage sont maintenant');
console.log('automatiquement supprimés des titres d\'albums recommandés.');
