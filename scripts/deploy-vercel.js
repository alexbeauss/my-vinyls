#!/usr/bin/env node

/**
 * Script de déploiement optimisé pour Vercel
 * Usage: node scripts/deploy-vercel.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      cwd: process.cwd(), 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`✅ ${description} réussi`);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ ${description} échoué:`, error.message);
    return { success: false, error: error.message };
  }
}

function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...');
  
  // Vérifier Node.js
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  
  // Vérifier les fichiers de configuration
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'vercel.json',
    '.nvmrc'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  if (missingFiles.length > 0) {
    console.error(`❌ Fichiers manquants: ${missingFiles.join(', ')}`);
    return false;
  }
  
  console.log('✅ Tous les prérequis sont satisfaits');
  return true;
}

function prepareForDeployment() {
  console.log('\n📦 Préparation du déploiement...');
  
  // Nettoyer le cache
  runCommand('rm -rf .next', 'Nettoyage du cache Next.js');
  runCommand('rm -rf node_modules/.cache', 'Nettoyage du cache des modules');
  
  // Installer les dépendances
  const installResult = runCommand('npm install', 'Installation des dépendances');
  if (!installResult.success) {
    console.log('❌ Impossible de continuer sans dépendances');
    return false;
  }
  
  // Linter (optionnel)
  console.log('🔍 Vérification du code...');
  runCommand('npm run lint', 'Vérification du linter');
  
  return true;
}

function deployToVercel() {
  console.log('\n🚀 Déploiement sur Vercel...');
  
  // Vérifier si Vercel CLI est installé
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installation de Vercel CLI...');
    runCommand('npm install -g vercel', 'Installation de Vercel CLI');
  }
  
  // Déployer
  const deployResult = runCommand('vercel --prod', 'Déploiement sur Vercel');
  return deployResult.success;
}

function main() {
  console.log('🚀 Déploiement MyVinyls sur Vercel\n');
  
  // Vérifier les prérequis
  if (!checkPrerequisites()) {
    console.log('❌ Prérequis non satisfaits, arrêt du déploiement');
    process.exit(1);
  }
  
  // Préparer le déploiement
  if (!prepareForDeployment()) {
    console.log('❌ Préparation échouée, arrêt du déploiement');
    process.exit(1);
  }
  
  // Déployer
  if (deployToVercel()) {
    console.log('\n🎉 Déploiement réussi !');
    console.log('📋 Vérifiez votre application sur Vercel');
    console.log('🔍 Consultez les logs si des problèmes persistent');
  } else {
    console.log('\n❌ Déploiement échoué');
    console.log('💡 Vérifiez les logs ci-dessus pour plus de détails');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, prepareForDeployment, deployToVercel };
