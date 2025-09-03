This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# my-vinyls

## Configuration requise

### Prérequis système

- **Node.js** : Version >= 18.18.0 (requis pour Next.js 15.0.1)
  - Vérifiez votre version avec : `node --version`
  - Si vous avez une version antérieure, mettez à jour Node.js

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# Google Gemini API Key (requis pour les critiques d'albums)
# Obtenez votre clé API sur https://makersuite.google.com/app/apikey
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Auth0 Configuration
AUTH0_SECRET=your_auth0_secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

### Fonctionnalités

- **Collection de vinyles** : Gestion de votre collection personnelle
- **Scanner de codes-barres** : Ajout rapide d'albums via scan
- **Critiques IA** : Génération automatique de critiques d'albums avec Google Gemini
- **Authentification** : Connexion sécurisée avec Auth0
- **Intégration Discogs** : Synchronisation avec la base de données Discogs
