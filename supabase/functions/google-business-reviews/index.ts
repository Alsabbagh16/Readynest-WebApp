import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=900',
  },
});

type GoogleReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
  googleMapsUri?: string;
};

type LegacyGoogleReview = {
  author_name?: string;
  author_url?: string;
  profile_photo_url?: string;
  rating?: number;
  relative_time_description?: string;
  text?: string;
  time?: number;
};

const normalizeReview = (review: GoogleReview, index: number) => {
  const author = review.authorAttribution || {};
  const text = review.text?.text || review.originalText?.text || '';

  return {
    id: review.name || `google-review-${index}`,
    name: author.displayName || 'Google reviewer',
    avatar: author.photoUri || null,
    role: 'Google Review',
    content: text,
    rating: Math.max(0, Math.min(5, Math.round(Number(review.rating || 0)))),
    service: review.relativePublishTimeDescription || null,
    author_url: author.uri || null,
    review_url: review.googleMapsUri || author.uri || null,
    published_at: review.publishTime || null,
    source: 'google',
  };
};

const normalizeLegacyReview = (review: LegacyGoogleReview, index: number) => ({
  id: review.author_url || `legacy-google-review-${index}`,
  name: review.author_name || 'Google reviewer',
  avatar: review.profile_photo_url || null,
  role: 'Google Review',
  content: review.text || '',
  rating: Math.max(0, Math.min(5, Math.round(Number(review.rating || 0)))),
  service: review.relative_time_description || null,
  author_url: review.author_url || null,
  review_url: review.author_url || null,
  published_at: review.time ? new Date(review.time * 1000).toISOString() : null,
  source: 'google',
});

const extractGoogleError = (status: number, body: Record<string, unknown>) => {
  const nestedError = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : null;
  const code = nestedError?.status || nestedError?.code || body.status || status;
  const message = nestedError?.message || body.error_message || body.message || 'Google request failed.';
  return `Google Places refresh failed (${code}): ${message}`;
};

const fallbackPayload = (reason: string, cached: Record<string, unknown> | null = null, details: string | null = null) => ({
  reviews: cached?.reviews || [],
  rating: cached?.rating || null,
  user_rating_count: cached?.user_rating_count || null,
  google_maps_uri: cached?.google_maps_uri || null,
  source: cached ? 'cache' : 'fallback',
  stale: Boolean(cached),
  warning: reason,
  diagnostic: details,
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const googlePlacesKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  const placeId = Deno.env.get('READY_NEST_GOOGLE_PLACE_ID');

  if (!supabaseUrl || !serviceRoleKey) {
    return json(fallbackPayload('Supabase environment is not configured.'));
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const getCached = async () => {
    if (!placeId) return null;
    const { data, error } = await supabase
      .from('google_reviews_cache')
      .select('place_id, reviews, rating, user_rating_count, google_maps_uri, fetched_at')
      .eq('place_id', placeId)
      .maybeSingle();
    if (error) {
      console.error('Google reviews cache read failed:', error);
      return null;
    }
    return data;
  };

  const cached = await getCached();
  if (cached?.fetched_at && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return json({
      reviews: cached.reviews || [],
      rating: cached.rating || null,
      user_rating_count: cached.user_rating_count || null,
      google_maps_uri: cached.google_maps_uri || null,
      source: 'cache',
      stale: false,
    });
  }

  if (!googlePlacesKey || !placeId) {
    return json(fallbackPayload('Google reviews are not configured.', cached));
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesKey,
        'X-Goog-FieldMask': 'id,rating,userRatingCount,googleMapsUri,reviews',
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const newApiError = extractGoogleError(response.status, body);
      console.error('Google Places reviews request failed:', response.status, body);

      const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      legacyUrl.searchParams.set('place_id', placeId);
      legacyUrl.searchParams.set('fields', 'rating,user_ratings_total,url,reviews');
      legacyUrl.searchParams.set('key', googlePlacesKey);

      const legacyResponse = await fetch(legacyUrl.toString());
      const legacyBody = await legacyResponse.json().catch(() => ({}));
      const legacyStatus = String(legacyBody.status || '').toUpperCase();

      if (!legacyResponse.ok || legacyStatus !== 'OK') {
        const legacyError = extractGoogleError(legacyResponse.status, legacyBody);
        console.error('Legacy Google Places reviews request failed:', legacyResponse.status, legacyBody);
        return json(fallbackPayload('Google reviews could not be refreshed.', cached, `${newApiError} | ${legacyError}`));
      }

      const legacyResult = legacyBody.result || {};
      const legacyReviews = Array.isArray(legacyResult.reviews)
        ? legacyResult.reviews.map(normalizeLegacyReview).filter((review) => review.content)
        : [];

      const legacyPayload = {
        place_id: placeId,
        reviews: legacyReviews,
        rating: typeof legacyResult.rating === 'number' ? legacyResult.rating : null,
        user_rating_count: Number.isInteger(legacyResult.user_ratings_total) ? legacyResult.user_ratings_total : null,
        google_maps_uri: legacyResult.url || null,
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: legacyUpsertError } = await supabase
        .from('google_reviews_cache')
        .upsert(legacyPayload, { onConflict: 'place_id' });

      if (legacyUpsertError) {
        console.error('Legacy Google reviews cache write failed:', legacyUpsertError);
      }

      return json({
        reviews: legacyReviews,
        rating: legacyPayload.rating,
        user_rating_count: legacyPayload.user_rating_count,
        google_maps_uri: legacyPayload.google_maps_uri,
        source: 'google_legacy',
        stale: false,
      });
    }

    const reviews = Array.isArray(body.reviews)
      ? body.reviews.map(normalizeReview).filter((review) => review.content)
      : [];

    const payload = {
      place_id: placeId,
      reviews,
      rating: typeof body.rating === 'number' ? body.rating : null,
      user_rating_count: Number.isInteger(body.userRatingCount) ? body.userRatingCount : null,
      google_maps_uri: body.googleMapsUri || null,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('google_reviews_cache')
      .upsert(payload, { onConflict: 'place_id' });

    if (upsertError) {
      console.error('Google reviews cache write failed:', upsertError);
    }

    return json({
      reviews,
      rating: payload.rating,
      user_rating_count: payload.user_rating_count,
      google_maps_uri: payload.google_maps_uri,
      source: 'google',
      stale: false,
    });
  } catch (error) {
    console.error('Google Business reviews function failed:', error);
    return json(fallbackPayload('Google reviews could not be loaded.', cached, error instanceof Error ? error.message : null));
  }
});
