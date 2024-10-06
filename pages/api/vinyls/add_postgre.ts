import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]'; // Adjust path if necessary
import { NextApiRequest, NextApiResponse } from 'next'; // Import types for API request and response

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) { // Explicitly type req and res
  if (req.method === 'POST') {
    const { barcode, title, year, thumbnail } = req.body;

    // Get server-side session using getServerSession
    const session = await getServerSession(req, res, authOptions);
    console.log('Session in API:', session);

    if (!session) {
      return res.status(401).json({ error: 'Non autorisé. Vous devez être connecté pour ajouter un vinyle.' });
    }

    try {
      // Check if the vinyl already exists in the user's collection
      const existingVinyl = await prisma.vinyl.findFirst({
        where: {
          barcode: barcode,
          userId: session.userId, // Check for the logged-in user's collection
        },
      });

      if (existingVinyl) {
        return res.status(409).json({ error: 'Ce vinyle existe déjà dans votre collection.' });
      }

      // Add the vinyl for the logged-in user
      const newVinyl = await prisma.vinyl.create({
        data: {
          barcode,
          title,
          year: parseInt(year),
          thumbnail,
          userId: session.userId, // Attach the vinyl to the user
        },
      });
      
      res.status(200).json(newVinyl);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de l'ajout du vinyle." });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}