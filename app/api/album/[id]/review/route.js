import { getSession } from '@auth0/nextjs-auth0';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../../lib/awsConfig';
import Discogs from 'disconnect';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req, { params }) {
  const session = await getSession(req);
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { id } = await params;

  try {
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
    const albumDetails = await dis.database().getRelease(id);

    // Initialiser Google Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Créer le prompt pour la critique
    const prompt = `Tu es un critique musical expert. Tu as travaillé pour pitchfork, rolling stone, new yorker et d'autres magazines pointus. Écris une critique détaillée et exigeante de l'album suivant en français :

Titre: ${albumDetails.title}
Artiste(s): ${albumDetails.artists.map(artist => artist.name).join(', ')}
Année: ${albumDetails.year}
Genre(s): ${albumDetails.genres ? albumDetails.genres.join(', ') : 'Non spécifié'}
Style(s): ${albumDetails.styles ? albumDetails.styles.join(', ') : 'Non spécifié'}
Label: ${albumDetails.labels ? albumDetails.labels.map(label => label.name).join(', ') : 'Non spécifié'}
Tracklist: ${albumDetails.tracklist ? albumDetails.tracklist.map(track => `${track.title} (${track.duration || 'Durée inconnue'})`).join(', ') : 'Non disponible'}

Écris une critique de 150-200 mots qui couvre :
1. L'intention et la vision de l'album
2. L'analyse musicale et stylistique
3. L'influence et l'impact de l'album
4. Une conclusion avec une note sur 10 avec une décimale.

Sois particulièrement exigeant et ne mets pas trop d'emphase, utilise un ton professionnel mais accessible, évite toutes les formulations génériques et n'utilise aucune formule type "ce n'est pas simplement un album", "ce n'est pas une simple collection de chansons" ou toutes les formulations qui s'en rapprochent.`;

    // Générer la critique avec Gemini
    const result = await model.generateContent(prompt);
    const review = result.response.text();

    // Extraire la note de la critique
    const ratingMatch = review.match(/(\d+(?:\.\d+)?)\/10|(\d+(?:\.\d+)?)\s*\/\s*10|note[:\s]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*\/\s*10|(\d+(?:\.\d+)?)\s*sur\s*10/i);
    let rating = null;
    
    if (ratingMatch) {
      // Prendre le premier groupe qui contient un nombre
      rating = parseFloat(ratingMatch[1] || ratingMatch[2] || ratingMatch[3] || ratingMatch[4] || ratingMatch[5]);
      // S'assurer que la note est entre 0 et 10
      if (rating < 0) rating = 0;
      if (rating > 10) rating = 10;
    }

    return new Response(JSON.stringify({ 
      review,
      rating,
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
    return new Response(JSON.stringify({ error: 'Échec de la génération de la critique' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
