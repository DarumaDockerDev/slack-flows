import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';

export default async (req: NextRequest) => {
    const channel = req.nextUrl.searchParams.get('channel');
  
    if (!channel) {
        return new NextResponse('Bad request', {status: 400});
    }
  
    try {
        let allFlows = await redis.hgetall(`${channel}:trigger`);

        if (allFlows) {
          let flowsArray = [];
          for (let flowId in allFlows) {
            let flow: any = allFlows[flowId];
            flow['flow_id'] = flowId;
            flowsArray.push(flow);
          }
          return NextResponse.json(flowsArray);
        } else {
          return new NextResponse('No flow binding with the channel', {status: 404});
        }
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

export const config = {
  runtime: 'experimental-edge',
};
