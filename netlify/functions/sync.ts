import { Handler } from '@netlify/functions';
import { Octokit } from 'octokit';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';
const path = process.env.GITHUB_FILE_PATH || 'data.json';
const branch = process.env.GITHUB_BRANCH || 'main';

export const handler: Handler = async (event) => {
  // Basic security check (optional: add a custom header or token check if needed)
  
  try {
    if (event.httpMethod === 'GET') {
      try {
        const { data }: any = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        const content = Buffer.from(data.content, 'base64').toString();
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: JSON.parse(content),
            sha: data.sha
          }),
        };
      } catch (error: any) {
        if (error.status === 404) {
          // File doesn't exist yet, return empty array
          return {
            statusCode: 200,
            body: JSON.stringify({ data: [], sha: null }),
          };
        }
        throw error;
      }
    }

    if (event.httpMethod === 'POST') {
      const { content, sha, message } = JSON.parse(event.body || '{}');
      
      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        branch,
        message: message || 'Update data via app',
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha: sha || undefined,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          sha: response.data.content?.sha
        }),
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  } catch (error: any) {
    console.error('GitHub Sync Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
