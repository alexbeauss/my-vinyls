import { getSession } from '@auth0/nextjs-auth0';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/awsConfig';

export async function GET() {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub; // Identifiant unique de l'utilisateur Auth0

  try {
    const command = new GetCommand({
      TableName: "UserDiscogsCredentials",
      Key: { userId },
    });

    const response = await docClient.send(command);
    
    if (response.Item) {
      return new Response(JSON.stringify({
        username: response.Item.discogsUsername,
        token: response.Item.discogsToken,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ message: 'No credentials found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error fetching Discogs credentials:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Discogs credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub; // Identifiant unique de l'utilisateur Auth0
  const { username, token } = await req.json();

  try {
    const command = new PutCommand({
      TableName: "UserDiscogsCredentials",
      Item: {
        userId,
        discogsUsername: username,
        discogsToken: token,
      },
    });

    await docClient.send(command);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving Discogs credentials:', error);
    return new Response(JSON.stringify({ error: 'Failed to save Discogs credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}