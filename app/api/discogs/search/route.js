import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../../lib/awsConfig';
import Discogs from 'disconnect';

export async function GET(req) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  if (q.length < 2) {
    return new Response(JSON.stringify({ results: [], pagination: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const creds = await docClient.send(
      new GetCommand({
        TableName: 'UserDiscogsCredentials',
        Key: { userId: session.user.sub },
      })
    );

    if (!creds.Item?.discogsToken) {
      return new Response(JSON.stringify({ error: 'Identifiants Discogs non trouvés' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dis = new Discogs.Client({ userToken: creds.Item.discogsToken });
    const data = await dis.database().search(q, {
      type: 'release',
      per_page: 20,
      page,
    });

    const results = (data.results || []).map((r) => {
      // Discogs renvoie souvent "Artiste - Titre"
      let artist = '';
      let title = r.title || '';
      const dash = title.indexOf(' - ');
      if (dash > 0) {
        artist = title.slice(0, dash).trim();
        title = title.slice(dash + 3).trim();
      }

      return {
        id: String(r.id),
        title,
        artist,
        year: r.year || null,
        thumb: r.thumb || r.cover_image || null,
        coverImage: r.cover_image || r.thumb || null,
        format: Array.isArray(r.format) ? r.format.join(', ') : r.format || null,
        country: r.country || null,
        label: Array.isArray(r.label) ? r.label[0] : r.label || null,
        discogsUrl: `https://www.discogs.com/release/${r.id}`,
      };
    });

    return new Response(
      JSON.stringify({
        results,
        pagination: data.pagination || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur recherche Discogs:', error);
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes Discogs. Réessayez plus tard.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Échec de la recherche Discogs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
