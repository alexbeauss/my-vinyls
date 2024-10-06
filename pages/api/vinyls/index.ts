import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next'; // Import types for API request and response

// Create the DynamoDB client
const client = new DynamoDBClient({ region: 'eu-west-3' }); // Change region if needed
const dynamoDb = DynamoDBDocumentClient.from(client); // High-level Document client

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  console.log('Session in API:', session);

  if (!session) {
    return res.status(401).json({ error: 'Non autorisé. Vous devez être connecté pour voir vos vinyles.' });
  }

  try {
    const userId = session.userId; // Get user ID from session

    // Use ScanCommand to filter by userId while the partition key is 'id'
    const params = {
      TableName: 'VinylCollection', // Replace with your DynamoDB table name
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    // Execute the scan command to fetch the user's vinyls
    const result = await dynamoDb.send(new ScanCommand(params));

    // Return the vinyls as a response
    res.status(200).json(result.Items);
  } catch (error) {
    console.error('Erreur lors de la récupération des vinyles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des vinyles.' });
  }
}