import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { REDIRECT_URI } from '@/lib/slack';

export default async (req: NextRequest) => {
  const flowUser = req.nextUrl.searchParams.get('flow_user') as string;

  try {
    await redis.set(flowUser, true, {'ex': 10 * 60});
  } catch(e: any) {
    return new NextResponse(e.toString(), {status: 500});
  }

  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?client_id=3029929096563.3015312061287&scope=channels:history,channels:join,channels:read,chat:write,commands,files:read,files:write,groups:read,im:history,im:read&user_scope=users.profile:read,users:read&state=${flowUser}&${REDIRECT_URI}`);
};

export const config = {
  runtime: 'experimental-edge',
};

