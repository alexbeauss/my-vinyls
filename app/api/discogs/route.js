import { getSession } from '@auth0/nextjs-auth0';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/awsConfig';
import Discogs from 'disconnect';

export async function GET(req) {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
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
      return new Response(JSON.stringify({ error: 'Discogs credentials not found' }), {
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

    return new Response(JSON.stringify({ collection }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching Discogs data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Discogs data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
