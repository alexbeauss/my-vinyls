import { getSession } from '@auth0/nextjs-auth0';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/awsConfig';
import Discogs from 'disconnect';
import axios from 'axios';

export async function GET() {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;

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

    // Récupérer toutes les pages de la collection
    const dis = new Discogs.Client({ userToken: discogsToken });
    let allReleases = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const pageData = await dis.user().collection().getReleases(discogsUsername, 0, {
        page: page,
        per_page: 100
      });

      allReleases = [...allReleases, ...pageData.releases];
      
      // Vérifier s'il y a plus de pages
      hasMorePages = pageData.pagination.page < pageData.pagination.pages;
      page++;
    }

    // Récupérer la valeur de la collection
    const collectionValueResponse = await axios.get(`https://api.discogs.com/users/${discogsUsername}/collection/value`, {
      headers: {
        'Authorization': `Discogs token=${discogsToken}`,
        'User-Agent': 'MyVinylsApp/1.0'
      }
    });

    return new Response(JSON.stringify({
      releases: allReleases,
      collectionValue: collectionValueResponse.data
    }), {
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
