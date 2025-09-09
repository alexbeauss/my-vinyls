# Guide de résolution des problèmes de déploiement

## Problème principal : "Cannot access 'I' before initialization"

Cette erreur est causée par des problèmes de hoisting JavaScript lors du build de production.

### Solutions appliquées

#### 1. **Réorganisation du code dans ClientHome.js**
- Déplacé les déclarations de fonctions avant leur utilisation dans useEffect
- Ajouté des vérifications `typeof window !== 'undefined'` pour localStorage
- Utilisé `useCallback` pour mémoriser les fonctions

#### 2. **Correction des imports dynamiques**
- Ajouté des vérifications de sécurité pour les imports côté client
- Gestion d'erreur pour les imports qui échouent

#### 3. **Configuration Next.js améliorée**
- Ajouté `swcMinify: true` pour une meilleure optimisation
- Configuration `esmExternals: 'loose'` pour la compatibilité
- Suppression des console.log en production

### Actions à effectuer pour le déploiement

#### 1. **Configuration Vercel corrigée**
```bash
# Fichier vercel.json simplifié (sans runtime spécifique)
{
  "framework": "nextjs",
  "regions": ["cdg1"]
}

# Fichier .nvmrc pour spécifier la version Node.js
18.18.0

# Fichier package.json avec engines
{
  "engines": {
    "node": ">=18.18.0",
    "npm": ">=9.0.0"
  }
}
```

#### 2. **Variables d'environnement**
S'assurer que toutes les variables sont configurées :
- `GOOGLE_GEMINI_API_KEY`
- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

#### 3. **Build de test local**
```bash
# Tester le build localement
npm run build

# Si des erreurs persistent, vérifier :
node scripts/check-build-issues.js
```

#### 4. **Déploiement sur Vercel**
```bash
# Option 1: Déploiement manuel
vercel --prod

# Option 2: Utiliser le script de déploiement
node scripts/deploy-vercel.js

# Vérifier les logs de déploiement
vercel logs
```

#### 5. **Résolution de l'erreur "Function Runtimes must have a valid version"**
Cette erreur est causée par une configuration incorrecte du runtime dans vercel.json.

**Solution appliquée :**
- Supprimé la configuration `functions` avec runtime spécifique
- Utilisé une configuration simplifiée avec seulement `framework` et `regions`
- Ajouté `.nvmrc` et `engines` dans package.json pour spécifier la version Node.js

### Problèmes résolus

✅ **Hoisting des fonctions** - Fonctions déclarées avant utilisation  
✅ **localStorage côté serveur** - Vérifications window ajoutées  
✅ **Imports dynamiques** - Gestion d'erreur ajoutée  
✅ **Configuration Next.js** - Optimisations de build ajoutées  

### Scripts de diagnostic

- `scripts/check-build-issues.js` - Vérifie les problèmes de code
- `scripts/test-build.js` - Teste le build localement
- `scripts/test-review-generation.js` - Teste la génération de critique

### Monitoring post-déploiement

1. Vérifier les logs Vercel pour les erreurs JavaScript
2. Tester la génération de critique sur différents albums
3. Vérifier que les valeurs se sauvegardent correctement
4. Contrôler que les mises à jour de collection fonctionnent

### En cas de problème persistant

1. Vérifier la version Node.js sur Vercel (>= 18.18.0)
2. Redéployer avec un cache vide
3. Vérifier les variables d'environnement
4. Consulter les logs détaillés de Vercel
