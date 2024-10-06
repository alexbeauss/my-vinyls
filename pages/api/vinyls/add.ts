import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize the DynamoDB client and DocumentClient
const client = new DynamoDBClient({
  region: 'eu-west-3',  // Replace with your AWS region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const dynamoDb = DynamoDBDocumentClient.from(client);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { id, artist, title, year, genres, thumbnail, url } = req.body;

    // Get server-side session using getServerSession
    const session = await getServerSession(req, res, authOptions);
    console.log('Session in API:', session);

    if (!session) {
      return res.status(401).json({ error: 'Non autorisé. Vous devez être connecté pour ajouter un vinyle.' });
    }

    try {
      const userId = session.userId; // Get the user ID from the session

      // Check if the vinyl already exists in the user's collection
      const paramsCheck = {
        TableName: 'VinylCollection',  // DynamoDB table name
        KeyConditionExpression: 'id = :id', // Assuming id is the partition key
        FilterExpression: 'userId = :userId', // Use a filter if userId is not part of the key schema
        ExpressionAttributeValues: {
            ':id': id,
            ':userId': userId,
        },
      };

      const existingVinyl = await dynamoDb.send(new QueryCommand(paramsCheck));

      if (existingVinyl.Items && existingVinyl.Items.length > 0) {
        return res.status(409).json({ error: 'Ce vinyle existe déjà dans votre collection.' });
      }

      // Add the new vinyl to the user's collection
      const paramsInsert = {
        TableName: 'VinylCollection',
        Item: {
          userId: userId,
          id: id,
          artist: artist,
          title: title,
          genres: genres,
          year: parseInt(year),  // Ensure year is parsed as an integer
          thumbnail: thumbnail,
          url: url,
        },
      };

      await dynamoDb.send(new PutCommand(paramsInsert));

      res.status(200).json({ message: 'Vinyle ajouté avec succès' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du vinyle:', error);
      res.status(500).json({ error: "Erreur lors de l'ajout du vinyle." });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}