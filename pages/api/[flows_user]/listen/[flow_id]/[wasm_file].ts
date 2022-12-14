import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getChannelByName } from '@/lib/slack';

export default async (req: NextRequest) => {
    const flowsUser = req.nextUrl.searchParams.get('flows_user');
    const flowId = req.nextUrl.searchParams.get('flow_id');
    const wasmFile = req.nextUrl.searchParams.get('wasm_file');
    const team = req.nextUrl.searchParams.get('team');
    const channel = req.nextUrl.searchParams.get('channel');
  
    if (!flowsUser || !flowId || !wasmFile || !team || !channel) {
        return new NextResponse('Bad request', {status: 400});
    }
  
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
            return new NextResponse('Team has not been authorized', {status: 400});
        }
        if (!accessToken) {
            return new NextResponse('User has not been authorized', {status: 400});
        }
        let ch = await getChannelByName(accessToken.toString(), teamId, channel);
        if (!ch) {
            return new NextResponse('Channel not found', {status: 400});
        }

        await redis.hset(`${ch.id}:trigger`, {[flowId]: {
          flows_user: flowsUser,
          wasm_file: wasmFile
        }});

        return NextResponse.json({
          "type": "message",
          "channel": "C030Y645W3E",
          "user": "U0318FQNNGZ",
          "text": "Hello hello can you hear me?",
          "channel_type": "im"
        });
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

export const config = {
  runtime: 'experimental-edge',
};


