import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { QueryCommand, PutCommand, DeleteCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../lib/awsConfig';
import Discogs from 'disconnect';

function stripNulls(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

async function getDiscogsAuth(userId) {
  const response = await docClient.send(
    new GetCommand({
      TableName: 'UserDiscogsCredentials',
      Key: { userId },
    })
  );
  const { discogsToken, discogsUsername } = response.Item || {};
  if (!discogsToken || !discogsUsername) {
    return null;
  }
  return {
    username: discogsUsername,
    client: new Discogs.Client({ userToken: discogsToken }),
  };
}

async function fetchDiscogsWantlist(client, username) {
  const wants = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const pageData = await client.user().wantlist().getReleases(username, {
      page,
      per_page: 100,
    });
    const batch = pageData?.wants || [];
    wants.push(...batch);
    const pagination = pageData?.pagination;
    hasMore = Boolean(pagination && pagination.page < pagination.pages);
    page += 1;
    if (page > 50) break; // garde-fou
  }

  return wants;
}

function mapWantToItem(want, userId, local = {}) {
  const info = want.basic_information || {};
  const id = String(want.id || info.id);
  return {
    userId,
    itemId: id,
    discogsId: id,
    title: info.title || 'Sans titre',
    artist: info.artists?.map((a) => a.name).join(', ') || 'Inconnu',
    year: info.year || null,
    coverImage: info.cover_image || info.thumb || null,
    genres: info.genres || [],
    styles: info.styles || [],
    notes: local.notes ?? want.notes ?? '',
    targetPrice: local.targetPrice ?? null,
    estimatedValue: local.estimatedValue ?? null,
    valueUpdatedAt: local.valueUpdatedAt || null,
    currency: local.currency || 'EUR',
    discogsUrl: `https://www.discogs.com/release/${id}`,
    source: 'discogs',
    createdAt: want.date_added || local.createdAt || new Date().toISOString(),
    updatedAt: local.updatedAt || new Date().toISOString(),
  };
}

const PRICE_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function isPriceFresh(item) {
  if (item.estimatedValue == null) return false;
  if (!item.valueUpdatedAt) return true; // valeur locale existante, on la garde
  return Date.now() - new Date(item.valueUpdatedAt).getTime() < PRICE_CACHE_MS;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchReleasePrice(client, releaseId) {
  try {
    const details = await client.database().getRelease(releaseId);
    if (details.lowest_price != null) return Number(details.lowest_price);
    if (details.estimated_value != null) return Number(details.estimated_value);
  } catch (error) {
    if (error.status === 429) throw error;
    console.warn(`Prix indisponible pour ${releaseId}:`, error.message || error);
  }
  return null;
}

async function enrichDiscogsPrices(client, userId, items, localById) {
  const toFetch = items.filter((item) => !isPriceFresh(item));
  if (toFetch.length === 0) return items;

  await mapPool(toFetch, 4, async (item) => {
    const price = await fetchReleasePrice(client, item.itemId);
    if (price == null) return;

    item.estimatedValue = price;
    item.valueUpdatedAt = new Date().toISOString();

    const local = localById.get(item.itemId) || {};
    const toSave = stripNulls({
      ...local,
      userId,
      itemId: item.itemId,
      discogsId: item.discogsId,
      title: item.title,
      artist: item.artist,
      year: item.year,
      coverImage: item.coverImage,
      genres: item.genres,
      styles: item.styles,
      notes: item.notes || '',
      targetPrice: item.targetPrice,
      estimatedValue: price,
      valueUpdatedAt: item.valueUpdatedAt,
      currency: item.currency || 'EUR',
      discogsUrl: item.discogsUrl,
      source: 'discogs',
      createdAt: local.createdAt || item.createdAt,
      updatedAt: new Date().toISOString(),
    });

    try {
      await docClient.send(
        new PutCommand({
          TableName: 'Wishlist',
          Item: toSave,
        })
      );
    } catch (error) {
      console.warn(`Cache prix wishlist échoué pour ${item.itemId}:`, error.message || error);
    }
  });

  return items;
}

async function fetchAlbumRatings(userId, albumIds) {
  const ratings = {};
  const ids = [...new Set(albumIds.filter(Boolean).map(String))];
  if (ids.length === 0) return ratings;

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    try {
      const result = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            AlbumReviews: {
              Keys: chunk.map((albumId) => ({ albumId, userId })),
              ProjectionExpression: 'albumId, rating',
            },
          },
        })
      );
      for (const item of result.Responses?.AlbumReviews || []) {
        if (item.rating != null && Number(item.rating) > 0) {
          ratings[String(item.albumId)] = Number(item.rating);
        }
      }
    } catch (error) {
      console.warn('Erreur BatchGet notes wishlist:', error.message || error);
    }
  }

  return ratings;
}

export async function GET(req) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;

  try {
    const auth = await getDiscogsAuth(userId);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Identifiants Discogs non trouvés' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [wants, localResult] = await Promise.all([
      fetchDiscogsWantlist(auth.client, auth.username),
      docClient.send(
        new QueryCommand({
          TableName: 'Wishlist',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
        })
      ),
    ]);

    const localItems = localResult.Items || [];
    const localById = new Map(localItems.map((item) => [String(item.itemId), item]));

    const discogsItems = wants.map((want) => {
      const id = String(want.id || want.basic_information?.id);
      return mapWantToItem(want, userId, localById.get(id) || {});
    });

    // Récupère / rafraîchit les prix Discogs (lowest_price) et les met en cache
    await enrichDiscogsPrices(auth.client, userId, discogsItems, localById);

    const manualItems = localItems
      .filter((item) => String(item.itemId).startsWith('manual_'))
      .map((item) => ({
        ...item,
        source: 'manual',
      }));

    const items = [...discogsItems, ...manualItems].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const ratings = await fetchAlbumRatings(
      userId,
      items.map((item) => item.discogsId || item.itemId)
    );

    const itemsWithRatings = items.map((item) => {
      const albumId = String(item.discogsId || item.itemId);
      const rating = ratings[albumId];
      return rating != null ? { ...item, rating } : item;
    });

    return new Response(JSON.stringify({ items: itemsWithRatings, source: 'discogs' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur GET wishlist:', error);
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes Discogs. Réessayez plus tard.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error.status === 401) {
      return new Response(JSON.stringify({ error: 'Token Discogs invalide' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Échec de la récupération de la wishlist' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { discogsId, title, artist, year, notes, targetPrice } = body;

  try {
    const now = new Date().toISOString();
    let item = {
      userId,
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    if (targetPrice != null && targetPrice !== '') {
      item.targetPrice = Number(targetPrice);
    }

    if (discogsId) {
      const itemId = String(discogsId).replace(/^.*\/release\//, '').split('-')[0].trim();
      if (!itemId) {
        return new Response(JSON.stringify({ error: 'discogsId invalide' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const auth = await getDiscogsAuth(userId);
      if (!auth) {
        return new Response(JSON.stringify({ error: 'Identifiants Discogs non trouvés' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Ajouter à la wantlist Discogs (source de vérité)
      await auth.client.user().wantlist().addRelease(auth.username, itemId, {
        notes: notes || '',
      });

      const albumDetails = await auth.client.database().getRelease(itemId);
      const estimatedValue =
        albumDetails.lowest_price != null ? Number(albumDetails.lowest_price) : null;

      item = {
        ...item,
        itemId,
        discogsId: itemId,
        title: albumDetails.title,
        artist: albumDetails.artists?.map((a) => a.name).join(', ') || 'Inconnu',
        year: albumDetails.year || null,
        coverImage: albumDetails.images?.[0]?.uri || albumDetails.thumb || null,
        genres: albumDetails.genres || [],
        styles: albumDetails.styles || [],
        estimatedValue,
        valueUpdatedAt: estimatedValue != null ? now : null,
        currency: 'EUR',
        discogsUrl: `https://www.discogs.com/release/${itemId}`,
        source: 'discogs',
      };
    } else if (title && artist) {
      const itemId = `manual_${Date.now()}`;
      item = {
        ...item,
        itemId,
        title,
        artist,
        year: year || null,
        coverImage: null,
        genres: [],
        styles: [],
        estimatedValue: item.targetPrice ?? null,
        currency: 'EUR',
        discogsUrl: null,
        source: 'manual',
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Fournissez un discogsId ou title + artist' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await docClient.send(
      new PutCommand({
        TableName: 'Wishlist',
        Item: stripNulls(item),
      })
    );

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur POST wishlist:', error);
    if (error.status === 404) {
      return new Response(JSON.stringify({ error: 'Release Discogs introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: "Échec de l'ajout à la wishlist" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return new Response(JSON.stringify({ error: 'itemId requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Retirer de Discogs si ce n'est pas un item manuel
    if (!String(itemId).startsWith('manual_')) {
      const auth = await getDiscogsAuth(userId);
      if (auth) {
        try {
          await auth.client.user().wantlist().removeRelease(auth.username, itemId);
        } catch (discogsError) {
          // 404 = déjà absent côté Discogs, on continue le nettoyage local
          if (discogsError.status !== 404) {
            throw discogsError;
          }
        }
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: 'Wishlist',
        Key: { userId, itemId },
      })
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur DELETE wishlist:', error);
    return new Response(JSON.stringify({ error: 'Échec de la suppression' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
