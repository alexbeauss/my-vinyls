import AlbumDetails from '../../components/AlbumDetails';

export async function generateMetadata({ params }) {
  const { id } = await params;
  
  try {
    // Récupérer les informations de l'album pour le titre
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/album/${id}`, {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const album = await response.json();
      return {
        title: `${album.title} - ${album.artists[0].name} | MyVinyls`,
        description: `Découvrez ${album.title} de ${album.artists[0].name} (${album.year}) dans votre collection MyVinyls`,
      };
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
  }
  
  return {
    title: 'Album | MyVinyls',
    description: 'Découvrez cet album dans votre collection MyVinyls',
  };
}

export default function AlbumPage({ params }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <AlbumDetails albumId={params.id} />
    </div>
  );
}
