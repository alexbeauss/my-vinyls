import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');

    if (!artist || !album) {
      return NextResponse.json(
        { error: 'Paramètres artist et album requis' },
        { status: 400 }
      );
    }

    // Utilisation de l'API iTunes Search qui est publique et gratuite
    // Elle retourne des informations sur les albums avec des liens Apple Music
    const searchQuery = encodeURIComponent(`${artist} ${album}`);
    const itunesApiUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=album&limit=1`;
    
    console.log(`\n🍎 === RECHERCHE APPLE MUSIC ===`);
    console.log(`📝 Recherche: "${artist}" - "${album}"`);
    console.log(`🔗 URL iTunes: ${itunesApiUrl}`);
    
    const response = await fetch(itunesApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`❌ Erreur iTunes API: ${response.status}`);
      throw new Error(`Erreur iTunes API: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Résultats iTunes: ${data.resultCount} album(s) trouvé(s)`);
    
    if (data.resultCount === 0) {
      // Si aucun résultat trouvé, retourner l'URL de recherche Apple Music
      const appleMusicSearchUrl = `https://music.apple.com/search?term=${searchQuery}`;
      console.log(`⚠️  Aucun album trouvé pour "${artist}" - "${album}"`);
      console.log(`🔍 Fallback vers recherche Apple Music: ${appleMusicSearchUrl}`);
      console.log(`🍎 === FIN RECHERCHE ===\n`);
      
      return NextResponse.json({
        found: false,
        searchUrl: appleMusicSearchUrl,
        directUrl: null,
        artist,
        album,
        message: 'Aucun album trouvé, redirection vers la recherche Apple Music'
      });
    }

    const albumData = data.results[0];
    
    // Construire l'URL Apple Music directe
    const appleMusicDirectUrl = `https://music.apple.com/album/${albumData.collectionId}`;
    
    console.log(`✅ Album trouvé:`);
    console.log(`   📀 Titre: "${albumData.collectionName}"`);
    console.log(`   🎤 Artiste: "${albumData.artistName}"`);
    console.log(`   📅 Année: ${albumData.releaseDate ? new Date(albumData.releaseDate).getFullYear() : 'N/A'}`);
    console.log(`   🎵 Genre: ${albumData.primaryGenreName}`);
    console.log(`   🎼 Pistes: ${albumData.trackCount}`);
    console.log(`   🖼️  Artwork: ${albumData.artworkUrl100}`);
    console.log(`   🔗 Lien direct: ${appleMusicDirectUrl}`);
    console.log(`🍎 === FIN RECHERCHE ===\n`);
    
    return NextResponse.json({
      found: true,
      directUrl: appleMusicDirectUrl,
      searchUrl: `https://music.apple.com/search?term=${searchQuery}`,
      artist: albumData.artistName,
      album: albumData.collectionName,
      year: albumData.releaseDate ? new Date(albumData.releaseDate).getFullYear() : null,
      artwork: albumData.artworkUrl100,
      genre: albumData.primaryGenreName,
      trackCount: albumData.trackCount,
      message: 'Album trouvé avec lien direct Apple Music'
    });

  } catch (error) {
    console.log(`\n🍎 === ERREUR RECHERCHE APPLE MUSIC ===`);
    console.error(`❌ Erreur: ${error.message}`);
    console.log(`🍎 === FIN ERREUR ===\n`);
    
    // En cas d'erreur, retourner l'URL de recherche comme fallback
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');
    
    if (artist && album) {
      const searchQuery = encodeURIComponent(`${artist} ${album}`);
      const fallbackUrl = `https://music.apple.com/search?term=${searchQuery}`;
      
      console.log(`🔄 Fallback activé pour "${artist}" - "${album}"`);
      console.log(`🔍 URL de fallback: ${fallbackUrl}`);
      
      return NextResponse.json({
        found: false,
        searchUrl: fallbackUrl,
        directUrl: null,
        artist,
        album,
        error: 'Erreur lors de la recherche, utilisation du lien de recherche',
        fallback: true
      });
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la recherche Apple Music' },
      { status: 500 }
    );
  }
}
