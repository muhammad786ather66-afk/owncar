/**
 * Cloudflare Workers Entry Point for Apni Car Backend
 * Uses Cloudflare D1 (apnicar-db) and Cloudflare R2 (apnicar-documents)
 */

export interface Env {
  DB: any; // Cloudflare D1 binding
  BUCKET: any; // Cloudflare R2 binding
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/api/health') {
        return Response.json({ status: 'ok', service: 'Apni Car Cloudflare Worker' }, { headers: corsHeaders });
      }

      // API Routes delegated to D1 / R2
      // Note: This worker handler will be compiled for Cloudflare Pages / Workers deployment
      return Response.json({ error: 'Endpoint handled by Worker handler' }, { headers: corsHeaders });
    } catch (err: any) {
      return Response.json({ error: err.message || 'Server error' }, { status: 500, headers: corsHeaders });
    }
  },
};
