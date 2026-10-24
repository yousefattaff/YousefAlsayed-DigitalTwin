import { getTwinHealth, twinErrorResponse } from '@/lib/twin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;

export async function GET() {
  try {
    return Response.json({
      ...getTwinHealth(),
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return twinErrorResponse(error);
  }
}
