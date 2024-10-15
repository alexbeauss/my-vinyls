import { getSession } from '@auth0/nextjs-auth0';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../lib/awsConfig';
import Discogs from 'disconnect';

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { id } = params;

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

    return new Response(JSON.stringify(albumDetails), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des détails de l\'album:', error);
    return new Response(JSON.stringify({ error: 'Échec de la récupération des détails de l\'album' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
