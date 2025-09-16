import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../lib/awsConfig';
import Discogs from 'disconnect';

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

    const dis = new Discogs.Client({ userToken: discogsToken });
    const albumDetails = await dis.database().getRelease(id);

    // Ne pas sauvegarder automatiquement la valeur ici
    // La sauvegarde des valeurs est gérée par la route dédiée /api/album/[id]/value

    return new Response(JSON.stringify(albumDetails), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des détails de l\'album:', error);
    
    // Gestion spécifique des erreurs Discogs
    if (error.status === 404) {
      return new Response(JSON.stringify({ error: 'Album non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (error.status === 401) {
      return new Response(JSON.stringify({ error: 'Token Discogs invalide' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Échec de la récupération des détails de l\'album' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
