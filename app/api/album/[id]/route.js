import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
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

    // Extraire la valeur estimée si disponible
    let estimatedValue = null;
    if (albumDetails.estimated_value) {
      estimatedValue = albumDetails.estimated_value;
    } else if (albumDetails.lowest_price) {
      estimatedValue = albumDetails.lowest_price;
    }

    // Si une valeur est trouvée, la sauvegarder en base de données
    if (estimatedValue) {
      try {
        // Récupérer l'item existant pour le mettre à jour
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
          estimatedValue: estimatedValue,
          valueUpdatedAt: new Date().toISOString()
        };

        // Si un item existe déjà, conserver les autres données
        if (existingItem.Item) {
          itemToSave.review = existingItem.Item.review;
          itemToSave.rating = existingItem.Item.rating;
          itemToSave.albumTitle = existingItem.Item.albumTitle;
          itemToSave.albumArtist = existingItem.Item.albumArtist;
          itemToSave.albumYear = existingItem.Item.albumYear;
          itemToSave.genres = existingItem.Item.genres;
          itemToSave.styles = existingItem.Item.styles;
          itemToSave.createdAt = existingItem.Item.createdAt;
          itemToSave.updatedAt = existingItem.Item.updatedAt;
        } else {
          // Si c'est un nouvel item, ajouter les infos de base de l'album
          itemToSave.albumTitle = albumDetails.title;
          itemToSave.albumArtist = albumDetails.artists.map(artist => artist.name).join(', ');
          itemToSave.albumYear = albumDetails.year;
          itemToSave.genres = albumDetails.genres || [];
          itemToSave.styles = albumDetails.styles || [];
          itemToSave.createdAt = new Date().toISOString();
          itemToSave.updatedAt = new Date().toISOString();
        }

        // Sauvegarder en base de données
        const putValueCommand = new PutCommand({
          TableName: "AlbumReviews",
          Item: itemToSave
        });

        await docClient.send(putValueCommand);
        console.log(`Valeur sauvegardée: ${estimatedValue} € pour l'album ${id}`);
      } catch (saveError) {
        console.error('Erreur lors de la sauvegarde de la valeur:', saveError);
        // Ne pas faire échouer la requête si la sauvegarde échoue
      }
    }

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
