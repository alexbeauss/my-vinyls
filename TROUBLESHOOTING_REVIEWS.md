# Guide de dépannage - Génération de critiques d'album

## Problèmes courants et solutions

### 1. Erreur 504 (Gateway Timeout)

**Symptômes :**
- Erreur "Failed to load resource: the server responded with a status of 504"
- Génération qui s'arrête sans message d'erreur

**Causes possibles :**
- Timeout Vercel (limite de 10s sur plan gratuit, 60s sur plan payant)
- API Gemini lente (>45s)
- API Discogs lente (>30s)
- Problème de réseau

**Solutions appliquées :**
- ✅ Timeout Vercel configuré à 60s dans `vercel.json`
- ✅ Timeout client à 45s avec retry automatique
- ✅ Timeout Discogs à 30s
- ✅ Prompt optimisé pour génération plus rapide
- ✅ Retry automatique avec délai progressif

### 2. Erreurs d'API Gemini

**Symptômes :**
- "Quota Google Gemini dépassé"
- "Clé API Google Gemini manquante"
- "Problème de configuration Google Gemini"

**Solutions :**
- Vérifiez `GOOGLE_GEMINI_API_KEY` dans Vercel
- Vérifiez votre quota sur [Google AI Studio](https://aistudio.google.com/)
- Le modèle `gemini-2.0-flash` est le modèle actuel recommandé pour les critiques

### 3. Erreurs d'API Discogs

**Symptômes :**
- "Trop de requêtes vers l'API Discogs"
- "Token Discogs invalide"
- "Album non trouvé dans Discogs"

**Solutions :**
- Vérifiez `DISCOGS_USER_TOKEN` dans Vercel
- Respectez les limites de rate (60 requêtes/minute)
- Vérifiez que l'ID d'album existe

### 4. Logs de diagnostic

**Nouveaux logs ajoutés :**
```
[abc123] 🚀 Début génération critique - 2025-01-11T15:30:00.000Z
[abc123] 👤 Utilisateur: auth0|123, Album: 456
[abc123] 🔍 Vérification critique existante...
[abc123] 📝 Aucune critique existante, génération nécessaire
[abc123] 🎵 Récupération détails album depuis Discogs...
[abc123] ✅ Détails Discogs récupérés en 1500ms
[abc123] 📊 Album: Abbey Road - 4 artistes
[abc123] 🤖 Initialisation Google Gemini...
[abc123] ✍️ Génération critique avec Gemini...
[abc123] ✅ Critique générée en 8000ms, longueur: 245 caractères
[abc123] 💾 Sauvegarde critique en base...
[abc123] 🎉 Critique générée et sauvegardée avec succès en 12000ms
```

**En cas d'erreur :**
```
[abc123] 💥 Erreur après 25000ms: Error message
[abc123] 📊 Détails: { message, stack, albumId, userId }
```

### 5. Scripts de diagnostic

**Test des améliorations :**
```bash
node scripts/test-timeout-fix.js
```

**Diagnostic complet :**
```bash
node scripts/diagnose-review-issues.js
```

### 6. Monitoring des performances

**Temps attendus :**
- Discogs : < 3 secondes
- Gemini : < 10 secondes
- Total : < 15 secondes

**Alertes :**
- Si total > 30s : Risque de timeout
- Si total > 45s : Timeout probable
- Si Gemini > 20s : Problème de quota ou réseau

### 7. Solutions d'urgence

**Si les timeouts persistent :**
1. Vérifiez les logs Vercel pour les erreurs spécifiques
2. Testez avec un album simple (ex: Abbey Road)
3. Vérifiez les quotas Google Gemini
4. Redéployez l'application

**Si les critiques sont incomplètes :**
1. Vérifiez la longueur dans les logs
2. Ajustez le prompt si nécessaire
3. Vérifiez les patterns d'extraction de note

### 8. Configuration optimale

**Variables d'environnement requises :**
```env
GOOGLE_GEMINI_API_KEY=your_gemini_key
DISCOGS_USER_TOKEN=your_discogs_token
```

**Configuration Vercel :**
```json
{
  "framework": "nextjs",
  "regions": ["cdg1"],
  "functions": {
    "app/api/album/[id]/review/route.js": {
      "maxDuration": 60
    }
  }
}
```

### 9. Prochaines améliorations

- Cache des critiques populaires
- Génération asynchrone en arrière-plan
- Monitoring des quotas en temps réel
- Fallback vers un modèle plus rapide
