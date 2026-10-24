import { chatWithTwin, readChatInput, twinErrorResponse } from '@/lib/twin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    const input = await readChatInput(request);
    const reply = await chatWithTwin(input, request.signal);
    return Response.json(reply, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return twinErrorResponse(error);
  }
}
