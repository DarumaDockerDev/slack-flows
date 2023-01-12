import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { REDIRECT_URI } from '@/lib/slack';

export default async (req: NextRequest) => {
  const flowsUser = req.nextUrl.searchParams.get('flows_user');

  if (!flowsUser) {
    return new NextResponse('Bad request', {status: 400});
  }

  try {
    await redis.set(flowsUser, true, {'ex': 10 * 60});
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }

  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?client_id=3029929096563.3015312061287&scope=channels:history,channels:join,channels:read,chat:write,commands,files:read,files:write,groups:read,im:history,im:read,users:read&user_scope=users.profile:read,users:read&state=${flowsUser}&${REDIRECT_URI}`);
};

export const config = {
  runtime: 'experimental-edge',
};

