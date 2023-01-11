import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getChannelByName } from '@/lib/slack';

export default async (req: NextRequest) => {
    const flowsUser = req.nextUrl.searchParams.get('flows_user');
    const flowId = req.nextUrl.searchParams.get('flow_id');
    const team = req.nextUrl.searchParams.get('team');
    const channel = req.nextUrl.searchParams.get('channel');
  
    if (!flowsUser || !flowId || !team || !channel) {
        return new NextResponse('Bad request', {status: 400});
    }

    // First, revoke old listeners for the flow
    try {
        let allListeners = await redis.hgetall(`${flowId}:ch:listener`);
        const pipeline = redis.pipeline();
        for (let channelId in allListeners) {
            pipeline.hdel(`${channelId}:ch:trigger`, flowId);
        }
    
        pipeline.del(`${flowId}:ch:listener`);

        await pipeline.exec();
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
  
    // Register the listner
    try {
        let allAuthedTeam = await redis.hgetall(flowsUser);
        let teamId;
        let accessToken;
        for (let userId in allAuthedTeam) {
            let at: any = allAuthedTeam[userId];
            if (team === at.team) {
                teamId = at.team_id;
                accessToken = await redis.get(`${userId}:token`);
                break;
            }
        }
    
        if (!teamId) {
            return new NextResponse(`Workspace \`${team}\` has not been authorized, you need to [install the App](https://slack-flows.vercel.app/api/%FLOWS_USER%/access) first`, {status: 400});
        }
        if (!accessToken) {
            return new NextResponse(`User has not been authorized, you need to [install the App](https://slack-flows.vercel.app/api/%FLOWS_USER%/access) to workspace \`${team}\` first`, {status: 400});
        }
        let ch = await getChannelByName(accessToken.toString(), teamId, channel);
        if (!ch) {
            return new NextResponse('Channel not found', {status: 400});
        }

        await redis.hset(`${ch.id}:ch:trigger`, {[flowId]: {
          flows_user: flowsUser
        }});

        await redis.hset(`${flowId}:ch:listener`, {[ch.id]: {
          flows_user: flowsUser
        }});

        return NextResponse.json({
          "type": "message",
          "channel": "C030Y645W3E",
          "user": "U0318FQNNGZ",
          "text": "can you hear me?",
          "channel_type": "im"
        });
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

export const config = {
  runtime: 'experimental-edge',
};


