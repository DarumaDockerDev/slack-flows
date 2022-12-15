import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';

export default async (req: NextRequest) => {
    const flowsUser = req.nextUrl.searchParams.get('flows_user');
    const flowId = req.nextUrl.searchParams.get('flow_id');
  
    if (!flowsUser || !flowId) {
        return new NextResponse('Bad request', {status: 400});
    }
  
    try {
        let allListeners = await redis.hgetall(`${flowId}:ch:listener`);
        const pipeline = redis.pipeline();
        for (let channelId in allListeners) {
            pipeline.hdel(`${channelId}:ch:trigger`, flowId);
        }
    
        pipeline.del(`${flowId}:ch:listener`);

        await pipeline.exec();

        return NextResponse.next();
    } catch(e: any) {
        return new NextResponse(e.toString(), {status: 500});
    }
};

export const config = {
  runtime: 'experimental-edge',
};


