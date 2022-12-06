export const REDIRECT_URI='redirect_uri=https%3A%2F%2F874b-34-84-78-213.jp.ngrok.io%2Fapi%2Fauth'

export async function getAuthedUser(code: string) {
  let res = await fetch(`https://slack.com/api/oauth.v2.access?client_id=${process.env.SLACK_CLIENT_ID}&client_secret=${process.env.SLACK_CLIENT_SECRET}&code=${code}&${REDIRECT_URI}`);
  const access = await res.json();

  if (!access.ok) {
    throw 'Can not access user of slack';
  }

  res = await fetch('https://slack.com/api/users.profile.get', {
    headers: {
      Authorization: `Bearer ${access.authed_user.access_token}`
    }
  });
  const user = await res.json();

  res = await fetch('https://slack.com/api/auth.test', {
    headers: {
      Authorization: `Bearer ${access.authed_user.access_token}`
    }
  });
  const auth = await res.json();

  return {
    user_id: access.authed_user.id,
    user_name: user.profile.real_name,
    team: auth.team, 
    access_token: access.access_token
  };
}
