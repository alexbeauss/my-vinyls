import { getSession } from '@auth0/nextjs-auth0';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../../lib/dynamoDbClient';

//export const runtime = 'edge'; // Ajoutez cette ligne

export async function GET() {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;

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
        mood: response.Item.mood, // Ajout de l'humeur dans la réponse
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

export async function POST(request) {
  const session = await getSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub;
  const { username, token, mood } = await request.json(); // Ajout de mood dans la déstructuration

  try {
    const command = new PutCommand({
      TableName: "UserDiscogsCredentials",
      Item: {
        userId,
        discogsUsername: username,
        discogsToken: token,
        mood, // Ajout de l'humeur dans l'objet Item
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
