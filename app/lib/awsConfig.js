import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { defaultProvider } from './credential-provider-polyfill';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: defaultProvider,
});

export const docClient = DynamoDBDocumentClient.from(client);
