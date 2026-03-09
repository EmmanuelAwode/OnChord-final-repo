// Supabase Edge Function to proxy Ticketmaster API requests
// This avoids CORS issues by making server-side requests

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ticketmaster API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the endpoint path from query param
    const endpoint = url.searchParams.get('endpoint') || '/events.json';
    
    // Build the Ticketmaster URL with all query params
    const ticketmasterUrl = new URL(`${TICKETMASTER_BASE_URL}${endpoint}`);
    
    // Copy all query params except 'endpoint'
    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        ticketmasterUrl.searchParams.set(key, value);
      }
    });
    
    // Add the API key
    ticketmasterUrl.searchParams.set('apikey', apiKey);

    console.log(`Proxying request to: ${ticketmasterUrl.pathname}${ticketmasterUrl.search}`);

    // Make the request to Ticketmaster
    const response = await fetch(ticketmasterUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        } 
      }
    );
  } catch (error) {
    console.error('Ticketmaster proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch from Ticketmaster', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
