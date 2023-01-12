import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { getUserInfo } from '@/lib/slack';

export default async (req: NextRequest) => {
    const channel = req.nextUrl.searchParams.get('channel');
    const team = req.nextUrl.searchParams.get('team');
    const user = req.nextUrl.searchParams.get('user');
  
    if (!user || !team || !channel) {
        return new NextResponse('Bad request', {status: 400});
    }
  
    try {
        let allFlows = await redis.hgetall(`${channel}:ch:trigger`);

        if (allFlows) {
          let flowsArray = [];
          for (let flowId in allFlows) {
            let flow: any = allFlows[flowId];

            if (await isNotBot(flow.flows_user, team, user)) {
              flow['flow_id'] = flowId;
              flowsArray.push(flow);
            }
          }
          return NextResponse.json(flowsArray);
        } else {
          return new NextResponse('No flow binding with the channel', {status: 404});
        }
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

async function isNotBot(flowsUser: string, team: string, user: string) {
    let allAuthedTeam = await redis.hgetall(flowsUser);
    let accessToken;
    for (let userId in allAuthedTeam) {
        let at: any = allAuthedTeam[userId];
        if (team === at.team_id) {
            accessToken = await redis.get(`${userId}:token`);
            break;
        }
    }

    if (accessToken) {
        let userInfo = await getUserInfo(accessToken.toString(), user);
        return !userInfo.is_bot;
    }

    return false;
}

export const config = {
  runtime: 'experimental-edge',
};
