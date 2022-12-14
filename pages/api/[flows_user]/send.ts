import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getChannelByName, sendMessageToChannel } from '@/lib/slack';

export default async (req: NextRequest) => {
    const flowsUser = req.nextUrl.searchParams.get('flows_user');
    const team = req.nextUrl.searchParams.get('team');
    const channel = req.nextUrl.searchParams.get('channel');
  
    if (!flowsUser || !team || !channel) {
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

        const text = await req.text();
        await sendMessageToChannel(accessToken.toString(), ch.id, text);
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

export const config = {
  runtime: 'experimental-edge',
};



