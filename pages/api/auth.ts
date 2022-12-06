import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getAuthedUser } from '@/lib/slack';

export default async (req: NextRequest) => {
  const flowUser = req.nextUrl.searchParams.get('state');
  const code = req.nextUrl.searchParams.get('code');

  if (!flowUser || !code) {
    return new NextResponse('Bad request', {status: 400});
  }

  try {
    const d = await redis.del(flowUser);
    // Return if flow user not found in Redis
    if (d !== 1) {
      return new NextResponse('Expired authorization', {status: 400});
    }
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }

  try {
    const authedUser = await getAuthedUser(code);

    const pipeline = redis.pipeline();
    pipeline.set(`${authedUser.user_id}:token`, authedUser.access_token);
    pipeline.hset(flowUser, {
      [`${authedUser.user_id}`]: {
        user_name: authedUser.user_name,
        team: authedUser.team
      }
    });
    await pipeline.exec();

    return NextResponse.redirect(process.env.FLOWS_NETWORK_APP_URL || '');
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }
};

export const config = {
  runtime: 'experimental-edge',
};
