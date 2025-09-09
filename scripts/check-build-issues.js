#!/usr/bin/env node

/**
 * Script pour vérifier les problèmes de build et de déploiement
 * Usage: node scripts/check-build-issues.js
 */

const fs = require('fs');
const path = require('path');

function checkFileForIssues(filePath, fileName) {
  console.log(`\n🔍 Vérification de ${fileName}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Vérifier les problèmes de hoisting
    const hoistingPatterns = [
      /useEffect\(\(\) => \{[\s\S]*?fetchAlbumRatings\(\)[\s\S]*?\}, \[discogsCollection, fetchAlbumRatings, fetchStoredValues\]\);/,
      /useEffect\(\(\) => \{[\s\S]*?fetchStoredValues\(\)[\s\S]*?\}, \[discogsCollection, fetchAlbumRatings, fetchStoredValues\]\);/,
    ];
    
    hoistingPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        issues.push(`Problème de hoisting potentiel détecté (pattern ${index + 1})`);
      }
    });
    
    // Vérifier l'utilisation de localStorage sans vérification window
    const localStoragePatterns = [
      /localStorage\.getItem\(/g,
      /localStorage\.setItem\(/g,
    ];
    
    localStoragePatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        const hasWindowCheck = content.includes('typeof window !== \'undefined\'');
        if (!hasWindowCheck) {
          issues.push(`localStorage utilisé sans vérification window (${matches.length} occurrences)`);
        }
      }
    });
    
    // Vérifier les imports dynamiques problématiques
    if (content.includes('import(') && !content.includes('dynamic')) {
      issues.push('Import dynamique détecté sans dynamic()');
    }
    
    // Vérifier les variables non initialisées
    const uninitializedPatterns = [
      /let\s+(\w+);[\s\S]*?const\s+\1\s*=/,
      /const\s+(\w+);[\s\S]*?const\s+\1\s*=/,
    ];
    
    uninitializedPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        issues.push(`Variable potentiellement non initialisée (pattern ${index + 1})`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ Aucun problème détecté');
    } else {
      console.log('⚠️  Problèmes détectés:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return issues;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture de ${fileName}:`, error.message);
    return [`Erreur de lecture: ${error.message}`];
  }
}

function checkAllFiles() {
  console.log('🚀 Vérification des problèmes de build...\n');
  
  const filesToCheck = [
    'app/home/ClientHome.js',
    'app/home/DynamicHomePage.js',
    'app/components/AlbumDetails.js',
    'app/components/Scanner.js',
    'app/components/MoodSlider.js',
    'app/components/Navbar.js',
    'app/components/DynamicProfilePage.js'
  ];
  
  let totalIssues = 0;
  
  filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const issues = checkFileForIssues(filePath, file);
      totalIssues += issues.length;
    } else {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
    }
  });
  
  console.log(`\n📊 Résumé: ${totalIssues} problème(s) détecté(s) au total`);
  
  if (totalIssues === 0) {
    console.log('🎉 Tous les fichiers semblent corrects !');
  } else {
    console.log('\n💡 Suggestions pour résoudre les problèmes:');
    console.log('   1. Vérifiez que toutes les fonctions sont déclarées avant d\'être utilisées');
    console.log('   2. Ajoutez des vérifications "typeof window !== \'undefined\'" pour localStorage');
    console.log('   3. Utilisez dynamic() pour les imports dynamiques');
    console.log('   4. Initialisez toutes les variables avant utilisation');
  }
}

// Vérification des variables d'environnement
function checkEnvironmentVariables() {
  console.log('\n🔧 Vérification des variables d\'environnement...');
  
  const requiredVars = [
    'GOOGLE_GEMINI_API_KEY',
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length === 0) {
    console.log('✅ Toutes les variables d\'environnement requises sont présentes');
  } else {
    console.log('⚠️  Variables d\'environnement manquantes:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
  }
  
  return missingVars.length === 0;
}

// Exécution des vérifications
async function runChecks() {
  checkAllFiles();
  checkEnvironmentVariables();
  
  console.log('\n🏁 Vérifications terminées');
}

if (require.main === module) {
  runChecks().catch(console.error);
}

module.exports = { checkFileForIssues, checkAllFiles, checkEnvironmentVariables };
