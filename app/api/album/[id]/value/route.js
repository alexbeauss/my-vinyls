import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../../../lib/awsConfig';
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
    // Vérifier si une valeur existe déjà pour cet album et cet utilisateur
    const getValueCommand = new GetCommand({
      TableName: "AlbumReviews",
      Key: { 
        albumId: id,
        userId: userId 
      },
    });

    const existingValueResponse = await docClient.send(getValueCommand);

    if (existingValueResponse.Item && existingValueResponse.Item.estimatedValue) {
      return new Response(JSON.stringify({ 
        estimatedValue: existingValueResponse.Item.estimatedValue,
        lastUpdated: existingValueResponse.Item.valueUpdatedAt
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ 
        estimatedValue: null,
        lastUpdated: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Erreur lors de la récupération de la valeur:', error);
    return new Response(JSON.stringify({ error: 'Échec de la récupération de la valeur' }), {
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
    } catch (discogsError) {
      console.error('Erreur Discogs API:', discogsError);
      
      // Gestion spécifique des erreurs Discogs
      if (discogsError.status === 404) {
        return new Response(JSON.stringify({ error: 'Album non trouvé' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (discogsError.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes vers l\'API Discogs. Veuillez réessayer plus tard.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (discogsError.status === 401) {
        return new Response(JSON.stringify({ error: 'Token Discogs invalide' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (discogsError.message && discogsError.message.includes('Unexpected token')) {
        return new Response(JSON.stringify({ error: 'Réponse invalide de l\'API Discogs. Veuillez réessayer plus tard.' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      throw discogsError;
    }

    // Extraire la valeur estimée
    let estimatedValue = null;
    if (albumDetails.estimated_value) {
      estimatedValue = albumDetails.estimated_value;
    } else if (albumDetails.lowest_price) {
      estimatedValue = albumDetails.lowest_price;
    }

    if (estimatedValue) {
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

      // Si un item existe déjà, conserver TOUTES les données existantes
      if (existingItem.Item) {
        // Conserver toutes les données existantes
        Object.keys(existingItem.Item).forEach(key => {
          if (key !== 'estimatedValue' && key !== 'valueUpdatedAt') {
            itemToSave[key] = existingItem.Item[key];
          }
        });
        
        // Mettre à jour seulement la valeur et la date de mise à jour
        itemToSave.updatedAt = new Date().toISOString();
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
    }

    return new Response(JSON.stringify({ 
      estimatedValue: estimatedValue,
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la valeur:', error);
    
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
    
    return new Response(JSON.stringify({ error: 'Échec de la sauvegarde de la valeur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
