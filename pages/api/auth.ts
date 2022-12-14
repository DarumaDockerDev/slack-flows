import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getAuthedTeam } from '@/lib/slack';

export default async (req: NextRequest) => {
  const flowsUser = req.nextUrl.searchParams.get('state');
  const code = req.nextUrl.searchParams.get('code');

  if (!flowsUser || !code) {
    return new NextResponse('Bad request', {status: 400});
  }

  try {
    const d = await redis.del(flowsUser);
    // Return if flow user not found in Redis
    if (d !== 1) {
      return new NextResponse('Expired authorization', {status: 400});
    }
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }

  try {
    const authedTeam = await getAuthedTeam(code);

    const pipeline = redis.pipeline();
    pipeline.set(`${authedTeam.user_id}:token`, authedTeam.access_token);
    pipeline.hset(flowsUser, {
      [`${authedTeam.user_id}`]: {
        team_id: authedTeam.team_id,
        team: authedTeam.team
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
