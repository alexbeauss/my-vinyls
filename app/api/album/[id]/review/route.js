import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../../lib/awsConfig';
import Discogs from 'disconnect';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req, { params }) {
  const requestId = Math.random().toString(36).substring(7);
  
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { id } = await params;

  try {
    // Vérifier si une critique existe déjà pour cet album et cet utilisateur
    const getReviewCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: id,
        userId: userId 
      },
    });

    const existingReviewResponse = await docClient.send(getReviewCommand);

    if (existingReviewResponse.Item && existingReviewResponse.Item.review) {
      return new Response(JSON.stringify({ 
        review: existingReviewResponse.Item.review,
        rating: existingReviewResponse.Item.rating,
        albumInfo: {
          title: existingReviewResponse.Item.albumTitle,
          artists: [existingReviewResponse.Item.albumArtist],
          year: existingReviewResponse.Item.albumYear,
          genres: existingReviewResponse.Item.genres || [],
          styles: existingReviewResponse.Item.styles || []
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      if (existingReviewResponse.Item) {
      } else {
      }
      return new Response(JSON.stringify({ 
        review: null,
        rating: null,
        albumInfo: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la récupération de la critique:`, error);
    return new Response(JSON.stringify({ error: 'Échec de la récupération de la critique' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req, { params }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { id } = await params;
  

  try {
    // Vérifier si une critique existe déjà pour cet album et cet utilisateur
    const getReviewCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: id,
        userId: userId 
      },
    });

    const existingReviewResponse = await docClient.send(getReviewCommand);

    if (existingReviewResponse.Item && existingReviewResponse.Item.review) {
      return new Response(JSON.stringify({ 
        review: existingReviewResponse.Item.review,
        rating: existingReviewResponse.Item.rating,
        albumInfo: {
          title: existingReviewResponse.Item.albumTitle,
          artists: [existingReviewResponse.Item.albumArtist],
          year: existingReviewResponse.Item.albumYear,
          genres: existingReviewResponse.Item.genres || [],
          styles: existingReviewResponse.Item.styles || []
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existingReviewResponse.Item) {
    } else {
    }

    // Récupérer les identifiants Discogs
    const getCommand = new GetCommand({
      TableName: "UserDiscogsCredentials",
      Key: { userId },
    });

    const response = await docClient.send(getCommand);
    
    if (!response.Item) {
      return new Response(JSON.stringify({ error: 'Identifiants Discogs non trouvés' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { discogsToken } = response.Item;

    // Récupérer les détails de l'album depuis Discogs
    const dis = new Discogs.Client({ userToken: discogsToken });
    let albumDetails;
    
    try {
      // Timeout de 30 secondes pour Discogs
      const discogsTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout Discogs')), 30000);
      });
      
      const discogsPromise = dis.database().getRelease(id);
      
      albumDetails = await Promise.race([discogsPromise, discogsTimeoutPromise]);
    } catch (discogsError) {
      
      if (discogsError.message.includes('Timeout')) {
        throw new Error('La récupération des détails de l\'album a pris trop de temps. Veuillez réessayer.');
      } else if (discogsError.status === 429) {
        throw new Error('Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.');
      } else if (discogsError.status === 404) {
        throw new Error('Album non trouvé dans Discogs');
      } else if (discogsError.status === 401) {
        throw new Error('Token Discogs invalide');
      } else {
        throw discogsError;
      }
    }

    // Validation des données essentielles
    if (!albumDetails.title) {
      throw new Error('Titre de l\'album manquant');
    }
    if (!albumDetails.artists || albumDetails.artists.length === 0) {
      throw new Error('Informations artiste manquantes');
    }

    // Initialiser Google Gemini
    
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('Clé API Google Gemini manquante');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3, // Plus déterministe pour des critiques cohérentes
        topK: 20, // Plus restrictif pour un vocabulaire précis
        topP: 0.8, // Plus focalisé sur les meilleures options
        maxOutputTokens: 1200, // Plus d'espace pour des analyses détaillées
      }
    });

    // Créer le prompt pour la critique avec gestion des données manquantes
    const safeGetValue = (value, fallback = 'Non spécifié') => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return fallback;
      }
      if (Array.isArray(value)) {
        return value.map(item => item.name || item.title || item).join(', ');
      }
      return value;
    };

    const prompt = `Tu es un critique musical légendaire, rédacteur en chef de Pitchfork avec 20 ans d'expérience. Tu as écrit pour Rolling Stone, NME, et The Quietus. Tu es connu pour ton exigence implacable et tes analyses sans concession. Écris une critique musicale de 250-350 mots en français :

ALBUM: ${albumDetails.title} - ${safeGetValue(albumDetails.artists)} (${albumDetails.year || 'Année inconnue'})
GENRE: ${safeGetValue(albumDetails.genres)} | STYLE: ${safeGetValue(albumDetails.styles)}
TRACKS: ${albumDetails.tracklist && albumDetails.tracklist.length > 0 ? 
  albumDetails.tracklist.slice(0, 5).map(track => track.title).join(', ') + 
  (albumDetails.tracklist.length > 5 ? ` + ${albumDetails.tracklist.length - 5} autres` : '') 
  : 'Non disponible'}

STRUCTURE OBLIGATOIRE (mais n'affiche pas cette structure dans la critique, reste littéraire et non structurée) :
1. ANALYSE DE L'INTENTION : Que cherche à accomplir cet album ? Quelle est sa vision artistique ?
2. ÉVALUATION TECHNIQUE : Composition, arrangements, production, performances instrumentales
3. COHÉRENCE ARTISTIQUE : L'album tient-il ses promesses ? Y a-t-il des failles conceptuelles ?
4. INNOVATION vs CONFORMISME : Apporte-t-il quelque chose de nouveau ou recycle-t-il des clichés ?
5. VERDICT FINAL : Impact, influence, place dans la discographie de l'artiste
6. RECOMMANDATION : Quel album majeur permettrait d'aller plus loin ?

IMPORTANT : À la fin de ta critique, ajoute une section structurée :
"ALBUM RECOMMANDÉ : [Titre de l'album] - [Artiste] ([Année])"

FORMAT STRICT pour l'album recommandé :
- Pas d'astérisques (*) dans le titre
- Pas de guillemets autour du titre
- Pas de caractères spéciaux de formatage
- Titre exact de l'album tel qu'il apparaît sur les plateformes
- Exemple correct : "ALBUM RECOMMANDÉ : Kind of Blue - Miles Davis (1959)"
- Exemple incorrect : "ALBUM RECOMMANDÉ : *Kind of Blue* - Miles Davis (1959)"

ÉCHELLE DE NOTATION STRICTE :
- 9.0-10.0 : RÉVOLUTIONNAIRE - Redéfinit le genre, influence durable, perfection technique et artistique
- 8.0-8.9 : EXCEPTIONNEL - Chef-d'œuvre avec quelques imperfections mineures, influence majeure
- 7.0-7.9 : TRÈS BON - Album solide avec des moments brillants, quelques défauts notables
- 6.0-6.9 : BON - Qualité correcte mais sans éclat particulier, quelques bonnes idées
- 5.0-5.9 : MOYEN - Compétent mais sans inspiration, remplissage convenable
- 4.0-4.9 : DÉCEVANT - Problèmes techniques ou artistiques majeurs, raté partiel
- 3.0-3.9 : MAUVAIS - Échec artistique notable, peu d'intérêt musical
- 2.0-2.9 : TRÈS MAUVAIS - Presque sans valeur, erreurs grossières
- 1.0-1.9 : CATASTROPHIQUE - Échec complet, sans aucun mérite
- 0.0-0.9 : INSUPPORTABLE - Offense à la musique, à éviter absolument

EXIGENCES CRITIQUES :
- Sois IMPLACABLE : Un 8/10 doit être justifié par une excellence réelle
- Évite la complaisance : La plupart des albums sont moyens (5-6/10)
- Analyse technique précise : Production, mixage, arrangements, performances
- Contextualise : Compare aux références du genre et à l'époque
- Sois constructif : Même dans la critique, explique pourquoi quelque chose ne fonctionne pas
- Termine par "Note : X.X/10" avec une décimale précise

TON : Professionnel, incisif, sans complaisance mais équitable. Utilise un vocabulaire riche et précis.`;


    // Générer la critique avec Gemini avec timeout
    let result, review, rating;
    
    try {
      // Timeout de 45 secondes pour la génération
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de génération Gemini')), 45000);
      });
      
      const generationPromise = model.generateContent(prompt);
      
      result = await Promise.race([generationPromise, timeoutPromise]);
      review = result.response.text();
      
      if (review.length < 50) {
        throw new Error('Critique générée trop courte, probablement incomplète');
      }
      
    } catch (geminiError) {
      console.error(`[${requestId}] ❌ Erreur Gemini:`, geminiError);
      
      if (geminiError.message.includes('Timeout')) {
        throw new Error('La génération de la critique a pris trop de temps. Veuillez réessayer.');
      } else if (geminiError.message.includes('quota')) {
        throw new Error('Quota Google Gemini dépassé. Veuillez réessayer plus tard.');
      } else if (geminiError.message.includes('API key')) {
        throw new Error('Problème de configuration Google Gemini.');
      } else {
        throw new Error(`Erreur lors de la génération avec Gemini: ${geminiError.message}`);
      }
    }

    // Extraire la note de la critique avec plusieurs patterns
    const ratingPatterns = [
      /note[:\s]*(\d+(?:\.\d+)?)\/10/i,
      /(\d+(?:\.\d+)?)\/10/i,
      /(\d+(?:\.\d+)?)\s*\/\s*10/i,
      /(\d+(?:\.\d+)?)\s*sur\s*10/i,
      /note[:\s]*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*10/i
    ];
    
    rating = null;
    for (const pattern of ratingPatterns) {
      const match = review.match(pattern);
      if (match) {
        rating = parseFloat(match[1]);
        if (rating >= 0 && rating <= 10) {
          break;
        }
      }
    }
    
    // Si aucune note n'est trouvée, essayer de la générer à partir du contexte
    if (rating === null) {
      console.warn(`Aucune note trouvée dans la critique pour ${id}, tentative de génération de note par défaut`);
      rating = 5.0; // Note par défaut si aucune n'est trouvée
    }
    

    // Vérifier s'il existe déjà des données pour cet album et cet utilisateur
    const getExistingCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: id,
        userId: userId 
      },
    });

    const existingItem = await docClient.send(getExistingCommand);
    
    // Préparer l'item à sauvegarder
    const itemToSave = {
      albumId: id,
      userId: userId,
      review: review,
      rating: rating || 0,
      albumTitle: albumDetails.title,
      albumArtist: albumDetails.artists.map(artist => artist.name).join(', '),
      albumYear: albumDetails.year,
      genres: albumDetails.genres || [],
      styles: albumDetails.styles || [],
      updatedAt: new Date().toISOString()
    };

    // Si un item existe déjà, conserver les autres données (comme la valeur estimée)
    if (existingItem.Item) {
      // Conserver toutes les données existantes sauf review, rating et updatedAt
      Object.keys(existingItem.Item).forEach(key => {
        if (key !== 'review' && key !== 'rating' && key !== 'updatedAt') {
          itemToSave[key] = existingItem.Item[key];
        }
      });
      
      // Conserver la date de création originale
      if (existingItem.Item.createdAt) {
        itemToSave.createdAt = existingItem.Item.createdAt;
      } else {
        itemToSave.createdAt = new Date().toISOString();
      }
    } else {
      // Si c'est un nouvel item, ajouter la date de création
      itemToSave.createdAt = new Date().toISOString();
    }

    // Sauvegarder la critique en base de données DynamoDB
    const putReviewCommand = new PutCommand({
      TableName: "AlbumReviews",
      Item: itemToSave
    });

    await docClient.send(putReviewCommand);

    return new Response(JSON.stringify({ 
      review: review,
      rating: rating || 0,
      albumInfo: {
        title: albumDetails.title,
        artists: albumDetails.artists.map(artist => artist.name),
        year: albumDetails.year,
        genres: albumDetails.genres || [],
        styles: albumDetails.styles || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] 💥 Erreur après ${totalDuration}ms:`, error);
    console.error(`[${requestId}] 📊 Détails:`, {
      message: error.message,
      stack: error.stack,
      albumId: id,
      userId: userId
    });
    
    // Gestion spécifique des erreurs
    let errorMessage = 'Échec de la génération de la critique';
    let statusCode = 500;
    
    if (error.message && error.message.includes('API key')) {
      errorMessage = 'Clé API Google Gemini manquante ou invalide';
      statusCode = 503;
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'Quota Google Gemini dépassé. Veuillez réessayer plus tard.';
      statusCode = 429;
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      statusCode = 503;
    } else if (error.message && error.message.includes('Timeout')) {
      errorMessage = 'La génération a pris trop de temps. Veuillez réessayer.';
      statusCode = 504;
    } else if (error.status === 404) {
      errorMessage = 'Album non trouvé dans Discogs';
      statusCode = 404;
    } else if (error.status === 429) {
      errorMessage = 'Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.';
      statusCode = 429;
    } else if (error.status === 401) {
      errorMessage = 'Token Discogs invalide';
      statusCode = 401;
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé à l\'API Discogs';
      statusCode = 403;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req, { params }) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { id } = await params;

  try {
    // Supprimer la critique existante
    const deleteCommand = new DeleteCommand({
      TableName: "AlbumReviews",
      Key: {
        albumId: id,
        userId: userId
      }
    });

    await docClient.send(deleteCommand);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la critique:', error);
    return new Response(JSON.stringify({ error: 'Échec de la suppression de la critique' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
