import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';
import { NextApiRequest, NextApiResponse } from 'next'; // Import types for API request and response

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) { // Explicitly type req and res
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Non autorisé. Vous devez être connecté pour voir vos vinyles.' });
  }

  try {
    // Récupérer les vinyles de l'utilisateur connecté
    const vinyls = await prisma.vinyl.findMany({
      where: {
        userId: session.userId,
      },
    });
    res.status(200).json(vinyls);
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ error: 'Erreur lors de la récupération des vinyles.' });
  }
}