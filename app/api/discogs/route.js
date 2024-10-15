import { getSession } from '@auth0/nextjs-auth0';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/awsConfig';
import Discogs from 'disconnect';
import axios from 'axios';

export async function GET(req) {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const per_page = parseInt(searchParams.get('per_page')) || 100;

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

    const { discogsUsername, discogsToken } = response.Item;

    const dis = new Discogs.Client({ userToken: discogsToken });
    const collection = await dis.user().collection().getReleases(discogsUsername, 0, {
      page: page,
      per_page: per_page
    });

    // Récupérer la valeur de la collection via un appel API direct
    const collectionValueResponse = await axios.get(`https://api.discogs.com/users/${discogsUsername}/collection/value`, {
      headers: {
        'Authorization': `Discogs token=${discogsToken}`,
        'User-Agent': 'MyVinylsApp/1.0'
      }
    });

    const collectionValue = collectionValueResponse.data;

    return new Response(JSON.stringify({ collection, collectionValue }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des données Discogs:', error);
    return new Response(JSON.stringify({ error: 'Échec de la récupération des données Discogs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
