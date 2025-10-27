import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../lib/awsConfig';
import Discogs from 'disconnect';

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await getSession(request, { cookies: cookieStore });
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
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

    // Récupérer les folders de la collection
    const dis = new Discogs.Client({ userToken: discogsToken });
    const foldersData = await dis.user().collection().getFolders(discogsUsername);

    console.log('Folders data:', JSON.stringify(foldersData, null, 2));
    
    // La méthode getFolders retourne un objet avec une propriété 'folders'
    // Si ce n'est pas le cas, on essaie d'utiliser les données directement
    const folders = foldersData.folders || foldersData || [];

    return new Response(JSON.stringify(folders), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des folders Discogs:', error);
    
    return new Response(JSON.stringify({ error: 'Échec de la récupération des folders Discogs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

