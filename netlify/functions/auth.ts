import { Handler } from '@netlify/functions';
import { Octokit } from 'octokit';
import bcrypt from 'bcryptjs';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';
const path = process.env.GITHUB_FILE_PATH || 'data.json';
const branch = process.env.GITHUB_BRANCH || 'main';

const ADMIN_EMAILS = ["mackenziekittycat33@gmail.com", "gary@example.com"];
const ADMIN_EDITOR_EMAILS = ["sean@example.com"];

const getGitHubData = async () => {
  try {
    const { data }: any = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    const content = Buffer.from(data.content, 'base64').toString();
    return JSON.parse(content);
  } catch (error: any) {
    if (error.status === 404) return { players: [] };
    throw error;
  }
};

const saveGitHubData = async (data: any) => {
  let sha: string | undefined;
  try {
    const existingFile: any = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    sha = existingFile.data.sha;
  } catch (e) {}

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message: 'Update players via Netlify Auth',
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    sha,
  });
};

export const handler: Handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const action = event.path.split('/').pop();

  try {
    if (action === 'login') {
      const { email, password } = body;
      const data = await getGitHubData();
      const user = data.players?.find((p: any) => p.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }

      const isBcryptHash = (str: string) => /^\$2[ayb]\$.{56}$/.test(str);
      let isMatch = false;
      if (isBcryptHash(user.password)) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = password === user.password;
        if (isMatch) {
          user.password = await bcrypt.hash(password, 10);
          await saveGitHubData(data);
        }
      }

      if (!isMatch) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }),
      };
    }

    if (action === 'signup') {
      const { name, email, password } = body;
      const data = await getGitHubData();
      const players = data.players || [];

      if (players.find((p: any) => p.email.toLowerCase() === email.toLowerCase())) {
        return { statusCode: 400, body: JSON.stringify({ error: "User already exists" }) };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      let role = "Active Member";
      if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        role = "Admin";
      } else if (ADMIN_EDITOR_EMAILS.includes(email.toLowerCase())) {
        role = "Admin Editor";
      }

      const newPlayer = {
        id: `player-${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        role,
        isApproved: true,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        status: "Active"
      };

      data.players = [...players, newPlayer];
      await saveGitHubData(data);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, user: { id: newPlayer.id, name: newPlayer.name, email: newPlayer.email, role: newPlayer.role } }),
      };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) };
  } catch (error: any) {
    console.error('Auth Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
