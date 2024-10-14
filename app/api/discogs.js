import Discogs from 'disconnect';

export async function GET(req) {
  const db = new Discogs().database();
  const userCollection = new Discogs().user().collection();

  try {
    // Remplacez 'YOUR_USERNAME' par votre nom d'utilisateur Discogs
    const collection = await userCollection.getReleases('YOUR_USERNAME', 0, {
      page: 1,
      per_page: 100 // Vous pouvez ajuster ce nombre selon vos besoins
    });

    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching Discogs collection:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Discogs collection' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}