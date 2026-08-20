import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../../lib/awsConfig';
import Discogs from 'disconnect';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from '../../../../lib/geminiConfig';

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
        recommendedAlbum: existingReviewResponse.Item.recommendedAlbum || null,
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
      return new Response(JSON.stringify({ 
        review: null,
        rating: null,
        recommendedAlbum: null,
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
      model: GEMINI_MODELS.REVIEW,
      generationConfig: {
        responseMimeType: 'application/json',
        // gemini-3.5-flash a le "thinking" activé par défaut (medium) :
        // une partie du budget tokens part dans le raisonnement.
        maxOutputTokens: 8192,
      }
    });

    const safeGetValue = (value, fallback = 'Non spécifié') => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return fallback;
      }
      if (Array.isArray(value)) {
        return value.map(item => item.name || item.title || item).join(', ');
      }
      return value;
    };

    const trackPreview = albumDetails.tracklist && albumDetails.tracklist.length > 0
      ? albumDetails.tracklist.slice(0, 5).map((track) => track.title).join(', ') +
        (albumDetails.tracklist.length > 5 ? ` + ${albumDetails.tracklist.length - 5} autres` : '')
      : 'Non disponible';

    const prompt = `Tu es un critique musical français exigeant (ton Les Inrocks / Magic) : précis, incarné, sans jargon creux.

Écris une critique de 200-280 mots en français sur cet album :
- Titre : ${albumDetails.title}
- Artiste(s) : ${safeGetValue(albumDetails.artists)}
- Année : ${albumDetails.year || 'inconnue'}
- Genre : ${safeGetValue(albumDetails.genres)}
- Style : ${safeGetValue(albumDetails.styles)}
- Pistes (aperçu) : ${trackPreview}

Règles :
- Prose continue uniquement (pas de listes, pas de titres de sections)
- Base-toi uniquement sur les infos fournies ; n'invente pas d'anecdotes biographiques ni de faits non fournis
- Évoque l'intention, la forme (composition / production / jeu) et un verdict clair
- Note : sois avare des 9+ (9+ = chef-d'œuvre rare ; 7-8 = très bon ; 5-6 = moyen ; <5 = faible)
- recommendedAlbum : un album réel, différent de celui critiqué, qui prolonge l'écoute (titre exact, artiste, année)

Réponds uniquement en JSON avec exactement cette forme :
{
  "review": "texte de la critique sans note ni album recommandé à la fin",
  "rating": 7.4,
  "recommendedAlbum": {
    "title": "Titre exact",
    "artist": "Artiste",
    "year": 1971
  }
}`;

    let review;
    let rating;
    let recommendedAlbum = null;
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de génération Gemini')), 45000);
      });
      
      const generationPromise = model.generateContent(prompt);
      const result = await Promise.race([generationPromise, timeoutPromise]);

      let rawText = '';
      try {
        rawText = result.response.text();
      } catch (textError) {
        const candidate = result.response?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        rawText = parts.map((p) => p.text || '').join('').trim();
        console.warn(`[${requestId}] response.text() a échoué:`, textError.message, {
          finishReason: candidate?.finishReason,
          partsCount: parts.length,
        });
      }

      if (!rawText) {
        const finishReason = result.response?.candidates?.[0]?.finishReason;
        throw new Error(
          finishReason === 'MAX_TOKENS'
            ? 'Critique tronquée (limite de tokens). Réessayez.'
            : `Réponse Gemini vide${finishReason ? ` (${finishReason})` : ''}`
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Réponse Gemini non JSON');
        }
        parsed = JSON.parse(jsonMatch[0]);
      }

      const prose = typeof parsed.review === 'string' ? parsed.review.trim() : '';
      if (!prose || prose.length < 50) {
        throw new Error('Critique générée trop courte ou vide');
      }

      const parsedRating = typeof parsed.rating === 'number'
        ? parsed.rating
        : parseFloat(parsed.rating);
      rating = Number.isFinite(parsedRating)
        ? Math.min(10, Math.max(0, Math.round(parsedRating * 10) / 10))
        : 5.0;

      const reco = parsed.recommendedAlbum;
      if (reco && reco.title && reco.artist) {
        const yearNum = parseInt(reco.year, 10);
        recommendedAlbum = {
          title: String(reco.title).replace(/\*+/g, '').replace(/^["']|["']$/g, '').trim(),
          artist: String(reco.artist).replace(/\*+/g, '').replace(/^["']|["']$/g, '').trim(),
          year: Number.isFinite(yearNum) ? yearNum : null,
        };
      }

      // Texte stocké / affiché : prose + lignes structurées (compat parsing legacy)
      const recoLine = recommendedAlbum
        ? `ALBUM RECOMMANDÉ : ${recommendedAlbum.title} - ${recommendedAlbum.artist}${recommendedAlbum.year ? ` (${recommendedAlbum.year})` : ''}`
        : null;
      review = [prose, recoLine, `Note : ${rating.toFixed(1)}/10`].filter(Boolean).join('\n\n');
      
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

    const getExistingCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: id,
        userId: userId 
      },
    });

    const existingItem = await docClient.send(getExistingCommand);
    
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

    if (recommendedAlbum) {
      itemToSave.recommendedAlbum = recommendedAlbum;
    }

    if (existingItem.Item) {
      const preserveKeys = new Set(['review', 'rating', 'recommendedAlbum', 'updatedAt']);
      Object.keys(existingItem.Item).forEach((key) => {
        if (!preserveKeys.has(key)) {
          itemToSave[key] = existingItem.Item[key];
        }
      });
      
      if (existingItem.Item.createdAt) {
        itemToSave.createdAt = existingItem.Item.createdAt;
      } else {
        itemToSave.createdAt = new Date().toISOString();
      }
    } else {
      itemToSave.createdAt = new Date().toISOString();
    }

    const putReviewCommand = new PutCommand({
      TableName: "AlbumReviews",
      Item: itemToSave
    });

    await docClient.send(putReviewCommand);

    return new Response(JSON.stringify({ 
      review: review,
      rating: rating || 0,
      recommendedAlbum,
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
