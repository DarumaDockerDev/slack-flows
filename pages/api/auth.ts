// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';

const auth = async (req: NextRequest) => {

  await redis.set('a', '0');
  return NextResponse.json({
    name: `Hello, from ${req.url} I'm now an Edge Function!`,
  });
};

export default auth;

export const config = {
  runtime: 'experimental-edge',
};
