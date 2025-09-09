#!/usr/bin/env node

/**
 * Script pour tester le build localement
 * Usage: node scripts/test-build.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      cwd: process.cwd(), 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log(`✅ ${description} réussi`);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ ${description} échoué:`, error.message);
    if (error.stdout) {
      console.log('Sortie standard:', error.stdout);
    }
    if (error.stderr) {
      console.log('Erreur standard:', error.stderr);
    }
    return { success: false, error: error.message };
  }
}

function checkBuildOutput() {
  console.log('\n🔍 Vérification de la sortie du build...');
  
  const buildDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Dossier .next non trouvé');
    return false;
  }
  
  const staticDir = path.join(buildDir, 'static');
  if (!fs.existsSync(staticDir)) {
    console.log('❌ Dossier .next/static non trouvé');
    return false;
  }
  
  console.log('✅ Structure de build correcte');
  return true;
}

function analyzeBuildErrors() {
  console.log('\n📊 Analyse des erreurs de build...');
  
  const buildLogPath = path.join(process.cwd(), 'build.log');
  if (fs.existsSync(buildLogPath)) {
    const buildLog = fs.readFileSync(buildLogPath, 'utf8');
    
    const errorPatterns = [
      /ReferenceError: Cannot access '(\w+)' before initialization/g,
      /TypeError: Cannot read property '(\w+)' of undefined/g,
      /Module not found: Can't resolve '(\w+)'/g,
      /Error: (\w+) is not defined/g,
    ];
    
    const errors = [];
    errorPatterns.forEach(pattern => {
      const matches = buildLog.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    });
    
    if (errors.length > 0) {
      console.log('⚠️  Erreurs détectées dans le build:');
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ Aucune erreur de build détectée');
    }
    
    return errors.length === 0;
  } else {
    console.log('ℹ️  Aucun log de build trouvé');
    return true;
  }
}

async function testBuild() {
  console.log('🚀 Test de build local...\n');
  
  // Nettoyer le cache
  runCommand('rm -rf .next', 'Nettoyage du cache');
  
  // Installer les dépendances
  const installResult = runCommand('npm install', 'Installation des dépendances');
  if (!installResult.success) {
    console.log('❌ Impossible de continuer sans dépendances');
    return false;
  }
  
  // Linter
  const lintResult = runCommand('npm run lint', 'Vérification du linter');
  if (!lintResult.success) {
    console.log('⚠️  Problèmes de linting détectés, mais on continue...');
  }
  
  // Build
  const buildResult = runCommand('npm run build > build.log 2>&1', 'Build de production');
  if (!buildResult.success) {
    console.log('❌ Build échoué');
    analyzeBuildErrors();
    return false;
  }
  
  // Vérifier la sortie
  const buildOutputOk = checkBuildOutput();
  if (!buildOutputOk) {
    console.log('❌ Sortie de build incorrecte');
    return false;
  }
  
  console.log('\n🎉 Build réussi !');
  return true;
}

// Exécution
if (require.main === module) {
  testBuild()
    .then(success => {
      if (success) {
        console.log('\n✅ Test de build terminé avec succès');
        process.exit(0);
      } else {
        console.log('\n❌ Test de build échoué');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Erreur lors du test de build:', error);
      process.exit(1);
    });
}

module.exports = { testBuild, runCommand, checkBuildOutput, analyzeBuildErrors };
