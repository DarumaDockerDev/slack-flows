import { redis } from '@/lib/upstash';
import { getChannelByName, uploadFileToChannel } from '@/lib/slack';
import formidable from 'formidable';

export default async (req: any, res: any, next: any) => {
    const {flows_user: flowsUser, team, channel} = req.query;
  
    if (!flowsUser || !team || !channel) {
        return res.status(400).end('Bad request');
    }

    if (!req.method || req.method.toLowerCase() !== 'post') {
        return res.status(405).end('Method not allowed');
    }

    const form = formidable({
        maxFileSize: 10 * 1024 * 1024,
        keepExtensions: true
    });

    const promise = new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
          if (err) {
              reject(err);
          } else {
              resolve({fields, files});
          }
      });
    });

    await promise.then(async (x) => {
        let {files} = x as any;
        if (!files.file) {
            return res.status(400).end(`no 'file' found`);
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
                return res.status(400).end(`Workspace \`${team}\` has not been authorized, you need to [install the App](https://slack-flows.vercel.app/api/%FLOWS_USER%/access) first`);
            }
            if (!accessToken) {
                return res.status(400).end(`User has not been authorized, you need to [install the App](https://slack-flows.vercel.app/api/%FLOWS_USER%/access) to workspace \`${team}\` first`);
            }
            let ch = await getChannelByName(accessToken.toString(), teamId, channel);
            if (!ch) {
                return res.status(400).end('Channel not found');
            }

            await uploadFileToChannel(accessToken.toString(), ch.id, files.file);
            res.end();
        } catch(e: any) {
            return res.status(500).end(e.toString());
        }
    });
};

export const config = {
    api: {
       bodyParser: false
    }
};



