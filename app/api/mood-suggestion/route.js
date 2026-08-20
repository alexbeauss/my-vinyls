import { getSession } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from '../../lib/geminiConfig';

const MOOD_LABELS = {
  apaise: 'état d\'esprit apaisé, calme et détendu',
  enjoue: 'état d\'esprit enjoué, léger et solaire',
  reveur: 'état d\'esprit rêveur, aérien et immersif',
  survolte: 'état d\'esprit survolté, intense et énergique',
  nostalgique: 'état d\'esprit nostalgique et rétro',
  meditatif: 'état d\'esprit méditatif, hypnotique et concentré',
  romantique: 'état d\'esprit romantique, sensuel et intime',
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildAlbumList(collection) {
  // Mélanger pour éviter de toujours exposer les mêmes albums en tête de liste
  const sample = shuffle(collection).slice(0, Math.min(300, collection.length));
  return sample
    .map((a) => {
      const genres = Array.isArray(a.genres) ? a.genres.join(', ') : '';
      const styles = Array.isArray(a.styles) ? a.styles.join(', ') : '';
      const tags = [genres, styles].filter(Boolean).join(' / ');
      return `${a.id} | ${a.title} - ${a.artist}${tags ? ` | ${tags}` : ''}`;
    })
    .join('\n');
}

function varietyRules(count) {
  return `Règles de sélection (obligatoires) :
- Choisis exactement ${count} albums DISTINCTS
- 3 artistes DIFFÉRENTS (jamais le même artiste deux fois)
- Privilégie la VARIÉTÉ et la PROFONDEUR : albums moins évidents, faces B de la collection, pépites oubliées
- Évite les choix trop attendus / "classiques universels" si d'autres options cohérentes existent
- Varie les décennies et les styles quand c'est possible
- Ne te limite pas aux premiers albums de la liste : explore toute la liste`;
}

function buildPrompt(mood, collection, context) {
  const albumList = buildAlbumList(collection);
  const count = Math.min(3, collection.length);
  const rules = varietyRules(count);
  const jsonFormat = `Réponds uniquement en JSON :
{"suggestions":[{"albumId":"...","explanation":"..."},{"albumId":"...","explanation":"..."},{"albumId":"...","explanation":"..."}]}
Chaque explanation : 1 phrase max, en français.`;

  if (mood === 'moment' && context) {
    return `Tu es un DJ expert qui connaît parfaitement une collection de vinyles et aime surprendre.
Contexte actuel :
- Heure : ${context.hour}h
- Jour : ${context.dayOfWeek}
- Saison : ${context.season}

Choisis ${count} albums parfaitement adaptés à CE moment précis, en allant chercher dans la variété de la collection.
${rules}
${jsonFormat}
Chaque explanation doit lier l'album au moment (heure, jour, saison).

Albums :
${albumList}`;
  }

  const moodDescription = MOOD_LABELS[mood] || mood;
  return `Tu es un DJ expert qui connaît parfaitement une collection de vinyles et aime surprendre.
L'utilisateur veut écouter quelque chose de : ${moodDescription}.

Choisis ${count} albums cohérents avec cette ambiance, en allant chercher dans la variété et la profondeur de la collection (pas seulement les titres les plus connus).
${rules}
${jsonFormat}

Albums :
${albumList}`;
}

function normalizeSuggestions(parsed, collection) {
  let raw = [];
  if (Array.isArray(parsed?.suggestions)) {
    raw = parsed.suggestions;
  } else if (parsed?.albumId) {
    raw = [parsed];
  }

  const seen = new Set();
  const suggestions = [];

  for (const item of raw) {
    if (!item?.albumId) continue;
    const id = String(item.albumId);
    if (seen.has(id)) continue;
    const album = collection.find((a) => String(a.id) === id);
    if (!album) continue;
    seen.add(id);
    suggestions.push({
      albumId: id,
      albumTitle: album.title ?? null,
      artist: album.artist ?? null,
      explanation: item.explanation ?? '',
    });
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

export async function POST(req) {
  const cookieStore = await cookies();
  const session = await getSession(req, { cookies: cookieStore });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Clé API Google Gemini manquante' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { mood, collection, context } = body;

  if (!mood || !Array.isArray(collection) || collection.length === 0) {
    return new Response(JSON.stringify({ error: 'mood et collection requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODELS.MOOD,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 512,
      },
    });

    const prompt = buildPrompt(mood, collection, context);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    const suggestions = normalizeSuggestions(parsed, collection);

    if (suggestions.length === 0) {
      throw new Error('Réponse Gemini invalide : aucune suggestion valide');
    }

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur mood-suggestion:', error);
    return new Response(
      JSON.stringify({
        error: error.message?.includes('quota')
          ? 'Quota Google Gemini dépassé. Réessayez plus tard.'
          : 'Échec de la suggestion mood',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
