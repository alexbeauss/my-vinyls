import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../../lib/awsConfig';
import Discogs from 'disconnect';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req, { params }) {
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

    if (existingReviewResponse.Item) {
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
    console.error('Erreur lors de la récupération de la critique:', error);
    return new Response(JSON.stringify({ error: 'Échec de la récupération de la critique' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req, { params }) {
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

    if (existingReviewResponse.Item) {
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
      albumDetails = await dis.database().getRelease(id);
      console.log(`Détails de l'album récupérés pour ${id}:`, {
        title: albumDetails.title,
        artists: albumDetails.artists?.length || 0,
        year: albumDetails.year,
        genres: albumDetails.genres?.length || 0,
        styles: albumDetails.styles?.length || 0,
        tracklist: albumDetails.tracklist?.length || 0
      });
    } catch (discogsError) {
      console.error('Erreur Discogs lors de la récupération de l\'album:', discogsError);
      throw discogsError;
    }

    // Validation des données essentielles
    if (!albumDetails.title) {
      throw new Error('Titre de l\'album manquant');
    }
    if (!albumDetails.artists || albumDetails.artists.length === 0) {
      throw new Error('Informations artiste manquantes');
    }

    // Initialiser Google Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const prompt = `Critique musicale de 120-150 mots en français :

ALBUM: ${albumDetails.title} - ${safeGetValue(albumDetails.artists)} (${albumDetails.year || 'Année inconnue'})
GENRE: ${safeGetValue(albumDetails.genres)} | STYLE: ${safeGetValue(albumDetails.styles)}
TRACKS: ${albumDetails.tracklist && albumDetails.tracklist.length > 0 ? 
  albumDetails.tracklist.slice(0, 5).map(track => track.title).join(', ') + 
  (albumDetails.tracklist.length > 5 ? ` + ${albumDetails.tracklist.length - 5} autres` : '') 
  : 'Non disponible'}

Écris une critique qui couvre :
1. L'essence de l'album (vision, intention)
2. Analyse musicale (points forts/faiblesses)
3. Impact et influence
4. Note finale sur 10 avec décimale

CRITÈRES :
- 9-10/10 : Chef-d'œuvre exceptionnel
- 7-8/10 : Très bon avec imperfections mineures  
- 5-6/10 : Correct mais sans éclat
- 3-4/10 : Décevant avec problèmes notables
- 1-2/10 : Raté, peu d'intérêt
- 0/10 : Échec complet

RÈGLES :
- Sois honnête et équilibré
- Commence par ce que l'album EST
- Pointe les défauts constructivement
- Compare aux standards du genre
- Termine par "Note : X.X/10"`;

    // Générer la critique avec Gemini avec timeout
    let result, review, rating;
    
    try {
      const startTime = Date.now();
      
      // Timeout de 45 secondes pour la génération
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de génération Gemini')), 45000);
      });
      
      const generationPromise = model.generateContent(prompt);
      
      result = await Promise.race([generationPromise, timeoutPromise]);
      review = result.response.text();
      
      const duration = Date.now() - startTime;
      console.log(`Critique générée pour ${id} en ${duration}ms, longueur: ${review.length} caractères`);
      
      if (review.length < 50) {
        throw new Error('Critique générée trop courte, probablement incomplète');
      }
      
    } catch (geminiError) {
      console.error('Erreur Gemini:', geminiError);
      
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
    
    console.log(`Note extraite pour ${id}: ${rating}`);

    // Sauvegarder la critique en base de données DynamoDB
    const putReviewCommand = new PutCommand({
      TableName: "AlbumReviews",
      Item: {
        albumId: id,
        userId: userId,
        review: review,
        rating: rating || 0,
        albumTitle: albumDetails.title,
        albumArtist: albumDetails.artists.map(artist => artist.name).join(', '),
        albumYear: albumDetails.year,
        genres: albumDetails.genres || [],
        styles: albumDetails.styles || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
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
    console.error('Erreur lors de la génération de la critique:', error);
    console.error('Détails de l\'erreur:', {
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
    } else if (error.status === 404) {
      errorMessage = 'Album non trouvé dans Discogs';
      statusCode = 404;
    } else if (error.status === 429) {
      errorMessage = 'Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.';
      statusCode = 429;
    } else if (error.status === 401) {
      errorMessage = 'Token Discogs invalide';
      statusCode = 401;
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
