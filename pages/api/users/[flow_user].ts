import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';

export default async (req: NextRequest) => {
  const flowUser = req.nextUrl.searchParams.get('flow_user');

  if (!flowUser) {
    return new NextResponse('Bad request', {status: 400});
  }

  try {
    let users = await redis.hgetall(flowUser);
    return NextResponse.json(users);
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }
};

export const config = {
  runtime: 'experimental-edge',
};

