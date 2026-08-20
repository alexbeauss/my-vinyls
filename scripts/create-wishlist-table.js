const fs = require('fs');
const path = require('path');
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error('Variables AWS manquantes. Vérifie AWS_REGION, AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY dans .env ou .env.local');
  process.exit(1);
}

const client = new DynamoDBClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

const createTableCommand = new CreateTableCommand({
  TableName: 'Wishlist',
  KeySchema: [
    { AttributeName: 'userId', KeyType: 'HASH' },
    { AttributeName: 'itemId', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'userId', AttributeType: 'S' },
    { AttributeName: 'itemId', AttributeType: 'S' },
  ],
  BillingMode: 'PAY_PER_REQUEST',
});

async function createTable() {
  try {
    const result = await client.send(createTableCommand);
    console.log('Table Wishlist créée avec succès:', result.TableDescription?.TableStatus);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('La table Wishlist existe déjà');
    } else {
      console.error('Erreur lors de la création de la table:', error.message || error);
      process.exit(1);
    }
  }
}

createTable();
