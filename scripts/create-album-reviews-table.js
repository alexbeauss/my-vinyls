import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const createTableCommand = new CreateTableCommand({
  TableName: "AlbumReviews",
  KeySchema: [
    {
      AttributeName: "albumId",
      KeyType: "HASH" // Partition key
    },
    {
      AttributeName: "userId", 
      KeyType: "RANGE" // Sort key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: "albumId",
      AttributeType: "S" // String
    },
    {
      AttributeName: "userId",
      AttributeType: "S" // String
    },
    {
      AttributeName: "createdAt",
      AttributeType: "S" // String (ISO date)
    }
  ],
  BillingMode: "PAY_PER_REQUEST", // On-demand billing
  GlobalSecondaryIndexes: [
    {
      IndexName: "UserIdIndex",
      KeySchema: [
        {
          AttributeName: "userId",
          KeyType: "HASH"
        },
        {
          AttributeName: "createdAt",
          KeyType: "RANGE"
        }
      ],
      Projection: {
        ProjectionType: "ALL"
      }
    }
  ]
});

async function createTable() {
  try {
    const result = await client.send(createTableCommand);
    console.log("Table AlbumReviews créée avec succès:", result);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log("La table AlbumReviews existe déjà");
    } else {
      console.error("Erreur lors de la création de la table:", error);
    }
  }
}

createTable();
