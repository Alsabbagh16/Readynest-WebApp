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
    'Cache-Control': 'no-store',
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

const fetchLegacyPlaceDetails = async (googlePlacesKey: string, placeId: string) => {
  const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  legacyUrl.searchParams.set('place_id', placeId);
  legacyUrl.searchParams.set('fields', 'rating,user_ratings_total,url,reviews');
  legacyUrl.searchParams.set('key', googlePlacesKey);

  const legacyResponse = await fetch(legacyUrl.toString());
  const legacyBody = await legacyResponse.json().catch(() => ({}));
  const legacyStatus = String(legacyBody.status || '').toUpperCase();

  if (!legacyResponse.ok || legacyStatus !== 'OK') {
    throw new Error(extractGoogleError(legacyResponse.status, legacyBody));
  }

  const legacyResult = legacyBody.result || {};
  const legacyReviews = Array.isArray(legacyResult.reviews)
    ? legacyResult.reviews.map(normalizeLegacyReview).filter((review) => review.content)
    : [];

  return {
    reviews: legacyReviews,
    rating: typeof legacyResult.rating === 'number' ? legacyResult.rating : null,
    user_rating_count: Number.isInteger(legacyResult.user_ratings_total) ? legacyResult.user_ratings_total : null,
    google_maps_uri: legacyResult.url || null,
  };
};

const upsertReviewsCache = async (
  supabase: ReturnType<typeof createClient>,
  placeId: string,
  payload: {
    reviews: unknown[];
    rating: number | null;
    user_rating_count: number | null;
    google_maps_uri: string | null;
  },
) => {
  const { error } = await supabase
    .from('google_reviews_cache')
    .upsert({
      place_id: placeId,
      reviews: payload.reviews,
      rating: payload.rating,
      user_rating_count: payload.user_rating_count,
      google_maps_uri: payload.google_maps_uri,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'place_id' });

  if (error) console.error('Google reviews cache write failed:', error);
};

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
  const cachedReviews = Array.isArray(cached?.reviews) ? cached.reviews : [];
  if (
    cached?.fetched_at
    && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS
    && cachedReviews.length > 0
  ) {
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

      try {
        const legacyPayload = await fetchLegacyPlaceDetails(googlePlacesKey, placeId);
        await upsertReviewsCache(supabase, placeId, legacyPayload);
        return json({ ...legacyPayload, source: 'google_legacy', stale: false });
      } catch (legacyError) {
        console.error('Legacy Google Places reviews request failed:', legacyError);
        return json(fallbackPayload('Google reviews could not be refreshed.', cached, `${newApiError} | ${legacyError}`));
      }
    }

    const reviews = Array.isArray(body.reviews)
      ? body.reviews.map(normalizeReview).filter((review) => review.content)
      : [];

    let payload = {
      reviews,
      rating: typeof body.rating === 'number' ? body.rating : null,
      user_rating_count: Number.isInteger(body.userRatingCount) ? body.userRatingCount : null,
      google_maps_uri: body.googleMapsUri || null,
    };
    let source = 'google';

    if (payload.reviews.length === 0 && Number(payload.user_rating_count || 0) > 0) {
      try {
        const legacyPayload = await fetchLegacyPlaceDetails(googlePlacesKey, placeId);
        if (legacyPayload.reviews.length > 0) {
          payload = legacyPayload;
          source = 'google_legacy';
        }
      } catch (legacyError) {
        console.error('Legacy Google Places empty-review fallback failed:', legacyError);
      }
    }

    await upsertReviewsCache(supabase, placeId, payload);

    return json({ ...payload, source, stale: false });
  } catch (error) {
    console.error('Google Business reviews function failed:', error);
    return json(fallbackPayload('Google reviews could not be loaded.', cached, error instanceof Error ? error.message : null));
  }
});
