# Configuration DynamoDB pour les critiques d'album

## Table AlbumReviews

Pour que le système de sauvegarde des critiques d'album fonctionne, vous devez créer une table DynamoDB nommée `AlbumReviews`.

### Structure de la table

- **Nom de la table** : `AlbumReviews`
- **Clé de partition** : `albumId` (String)
- **Clé de tri** : `userId` (String)
- **Mode de facturation** : Paiement à la demande (On-demand)

### Index global secondaire (optionnel)

- **Nom de l'index** : `UserIdIndex`
- **Clé de partition** : `userId` (String)
- **Clé de tri** : `createdAt` (String)
- **Type de projection** : ALL

### Attributs de la table

- `albumId` (String) - ID de l'album Discogs
- `userId` (String) - ID de l'utilisateur Auth0
- `review` (String) - Texte de la critique
- `rating` (Number) - Note sur 10
- `albumTitle` (String) - Titre de l'album
- `albumArtist` (String) - Artiste de l'album
- `albumYear` (Number) - Année de l'album
- `genres` (List) - Genres de l'album
- `styles` (List) - Styles de l'album
- `createdAt` (String) - Date de création (ISO string)
- `updatedAt` (String) - Date de mise à jour (ISO string)

### Création via la console AWS

1. Connectez-vous à la console AWS
2. Allez dans DynamoDB
3. Cliquez sur "Créer une table"
4. Nom de la table : `AlbumReviews`
5. Clé de partition : `albumId` (String)
6. Clé de tri : `userId` (String)
7. Mode de facturation : Paiement à la demande
8. Cliquez sur "Créer une table"

### Création via AWS CLI

```bash
aws dynamodb create-table \
    --table-name AlbumReviews \
    --attribute-definitions \
        AttributeName=albumId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=albumId,KeyType=HASH \
        AttributeName=userId,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=UserIdIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST
```

Une fois la table créée, le système de sauvegarde des critiques d'album fonctionnera automatiquement.

---

## Table Wishlist

Pour la liste de vinyles à acheter.

### Structure

- **Nom** : `Wishlist`
- **Clé de partition** : `userId` (String) — ID Auth0
- **Clé de tri** : `itemId` (String) — ID Discogs ou `manual_<timestamp>`
- **Mode de facturation** : On-demand

### Attributs

- `title`, `artist`, `year`, `coverImage`
- `discogsId`, `discogsUrl`
- `estimatedValue`, `currency` — prix Discogs VG+
- `targetPrice` — prix cible utilisateur
- `notes`, `genres`, `styles`
- `createdAt`, `updatedAt`

### Création via AWS CLI

```bash
aws dynamodb create-table \
    --table-name Wishlist \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=itemId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=itemId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

Ou via le script :

```bash
node scripts/create-wishlist-table.js
```

