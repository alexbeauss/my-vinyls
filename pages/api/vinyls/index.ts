import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextApiRequest, NextApiResponse } from 'next'; // Import types for API request and response

// Create the DynamoDB client
const client = new DynamoDBClient({ region: 'eu-west-3' }); // Change region if needed
const dynamoDb = DynamoDBDocumentClient.from(client); // High-level Document client

export default withApiAuthRequired(async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Retrieve session data using Auth0's session management
    const { user } = await getSession(req, res);
    console.log('User session from Auth0:', user);

    if (!user) {
      return res.status(401).json({ error: 'Non autorisé. Vous devez être connecté pour voir vos vinyles.' });
    }

    const userId = user.sub; // Auth0 user ID (usually stored in the 'sub' field)

    // Use ScanCommand to filter by userId (partition key is assumed to be 'userId')
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
});