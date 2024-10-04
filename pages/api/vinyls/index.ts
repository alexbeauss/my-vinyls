import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export default async function handler(req, res) {
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
    res.status(500).json({ error: 'Erreur lors de la récupération des vinyles.' });
  }
}