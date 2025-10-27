import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/awsConfig';
import Discogs from 'disconnect';
import axios from 'axios';

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await getSession(request, { cookies: cookieStore });
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

    // Récupérer TOUS les folders
    const dis = new Discogs.Client({ userToken: discogsToken });
    const foldersData = await dis.user().collection().getFolders(discogsUsername);
    
    // Normaliser la structure des folders
    let folders = [];
    if (Array.isArray(foldersData)) {
      folders = foldersData;
    } else if (foldersData && foldersData.folders && Array.isArray(foldersData.folders)) {
      folders = foldersData.folders;
    }
    
    console.log('Chargement de tous les dossiers:', folders.length);

    // Récupérer tous les albums avec leur folder_id
    let allReleases = [];
    
    for (const folder of folders) {
      if (!folder || !folder.id) {
        console.error('Folder invalide:', folder);
        continue;
      }
      
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        try {
          const pageData = await dis.user().collection().getReleases(discogsUsername, folder.id, {
            page: page,
            per_page: 100
          });

          // Ajouter le folder_id à chaque release
          const releasesWithFolder = pageData.releases.map(release => ({
            ...release,
            folder_id: folder.id
          }));

          allReleases = [...allReleases, ...releasesWithFolder];
          
          // Vérifier s'il y a plus de pages
          hasMorePages = pageData.pagination.page < pageData.pagination.pages;
          page++;
        } catch (pageError) {
          console.error(`Erreur pour le dossier ${folder.id}:`, pageError);
          break;
        }
      }
      
      console.log(`Dossier ${folder.name}: ${allReleases.filter(r => r.folder_id === folder.id).length} albums`);
    }
    
    console.log(`Total: ${allReleases.length} albums de tous les dossiers`);

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
    
    // Gestion spécifique des erreurs Discogs
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (error.status === 401) {
      return new Response(JSON.stringify({ error: 'Token Discogs invalide' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (error.status === 403) {
      return new Response(JSON.stringify({ error: 'Accès refusé à l\'API Discogs' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Échec de la récupération des données Discogs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
