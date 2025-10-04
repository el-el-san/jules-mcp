import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';

const DEFAULT_BASE_URL = 'https://jules.googleapis.com/v1alpha/';
const server = new McpServer({
  name: 'jules-mcp',
  version: '0.1.0'
});

const baseUrl = ensureTrailingSlash(process.env.JULES_API_URL ?? DEFAULT_BASE_URL);

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function getApiKey() {
  const key = process.env.JULES_API_KEY;
  if (!key) {
    throw new Error('Set the JULES_API_KEY environment variable before calling this tool.');
  }
  return key;
}

function normalizeSourceName(source) {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error('source is required');
  }

  if (trimmed.startsWith('sources/')) {
    return trimmed;
  }

  // Allow passing repo identifiers such as "github/owner/repo" or "owner/repo"
  if (trimmed.startsWith('github/')) {
    return `sources/${trimmed}`;
  }

  if (/^[^/]+\/[^/]+$/.test(trimmed)) {
    return `sources/github/${trimmed}`;
  }

  if (trimmed.startsWith('https://github.com/')) {
    const repo = trimmed.replace('https://github.com/', '').replace(/\.git$/, '');
    if (/^[^/]+\/[^/]+$/.test(repo)) {
      return `sources/github/${repo}`;
    }
  }

  return `sources/${trimmed}`;
}

async function julesFetch(path, { method = 'GET', query, body } = {}) {
  const url = new URL(path.replace(/^\//, ''), baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = new Headers({ 'X-Goog-Api-Key': getApiKey() });
  const init = { method, headers };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    let details = text;
    try {
      const parsed = JSON.parse(text);
      details = JSON.stringify(parsed, null, 2);
    } catch {
      // ignore parse failure
    }
    throw new Error(`Jules API ${response.status} ${response.statusText}: ${details}`);
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toJsonContent(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: 'text', text }] };
}

server.registerTool(
  'list-sources',
  {
    title: 'List Sources',
    description: 'List Jules sources available to the authenticated user.',
    inputSchema: {
      pageSize: z
        .number({ invalid_type_error: 'pageSize must be a number' })
        .int()
        .positive()
        .max(1000)
        .optional(),
      pageToken: z.string().min(1).optional()
    }
  },
  async ({ pageSize, pageToken }) => {
    const result = await julesFetch('sources', {
      query: {
        pageSize,
        pageToken
      }
    });
    return toJsonContent(result);
  }
);

server.registerTool(
  'create-session',
  {
    title: 'Create Session',
    description: 'Create a Jules session for a given source and prompt.',
    inputSchema: {
      prompt: z.string().min(1, 'prompt is required'),
      source: z.string().min(1, 'source is required'),
      title: z.string().min(1).optional(),
      requirePlanApproval: z.boolean().optional(),
      githubRepoContext: z
        .object({
          startingBranch: z.string().min(1).optional(),
          featureBranch: z.string().min(1).optional()
        })
        .strict()
        .optional()
    }
  },
  async ({ prompt, source, title, requirePlanApproval, githubRepoContext }) => {
    const sourceContext = { source: normalizeSourceName(source) };
    if (githubRepoContext) {
      const compactRepoContext = Object.fromEntries(
        Object.entries(githubRepoContext).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );
      if (Object.keys(compactRepoContext).length) {
        sourceContext.githubRepoContext = compactRepoContext;
      }
    }

    const body = {
      prompt,
      sourceContext
    };

    if (title) {
      body.title = title;
    }

    if (requirePlanApproval !== undefined) {
      body.requirePlanApproval = requirePlanApproval;
    }

    const result = await julesFetch('sessions', {
      method: 'POST',
      body
    });

    return toJsonContent(result);
  }
);

server.registerTool(
  'list-sessions',
  {
    title: 'List Sessions',
    description: 'List Jules sessions.',
    inputSchema: {
      pageSize: z
        .number({ invalid_type_error: 'pageSize must be a number' })
        .int()
        .positive()
        .max(1000)
        .optional(),
      pageToken: z.string().min(1).optional()
    }
  },
  async ({ pageSize, pageToken }) => {
    const result = await julesFetch('sessions', {
      query: {
        pageSize,
        pageToken
      }
    });
    return toJsonContent(result);
  }
);

server.registerTool(
  'approve-session-plan',
  {
    title: 'Approve Session Plan',
    description: 'Approve the latest plan for a Jules session that requires approval.',
    inputSchema: {
      sessionId: z.string().min(1, 'sessionId is required')
    }
  },
  async ({ sessionId }) => {
    const path = `sessions/${encodeURIComponent(sessionId)}:approvePlan`;
    const result = await julesFetch(path, { method: 'POST', body: {} });
    return toJsonContent(result ?? { status: 'Plan approved' });
  }
);

server.registerTool(
  'list-activities',
  {
    title: 'List Session Activities',
    description: 'List activities that have occurred in a Jules session.',
    inputSchema: {
      sessionId: z.string().min(1, 'sessionId is required'),
      pageSize: z
        .number({ invalid_type_error: 'pageSize must be a number' })
        .int()
        .positive()
        .max(100)
        .optional(),
      pageToken: z.string().min(1).optional()
    }
  },
  async ({ sessionId, pageSize, pageToken }) => {
    const path = `sessions/${encodeURIComponent(sessionId)}/activities`;
    const result = await julesFetch(path, {
      query: {
        pageSize,
        pageToken
      }
    });
    return toJsonContent(result);
  }
);

server.registerTool(
  'send-session-message',
  {
    title: 'Send Session Message',
    description: 'Send a user message to a Jules session.',
    inputSchema: {
      sessionId: z.string().min(1, 'sessionId is required'),
      prompt: z.string().min(1, 'prompt is required')
    }
  },
  async ({ sessionId, prompt }) => {
    const path = `sessions/${encodeURIComponent(sessionId)}:sendMessage`;
    const result = await julesFetch(path, {
      method: 'POST',
      body: {
        prompt
      }
    });
    return toJsonContent(result ?? { status: 'Message sent' });
  }
);

server.registerResource(
  'jules-api-docs',
  'jules-doc://spec',
  {
    title: 'Jules API Overview',
    description: 'Summary of key concepts and endpoints from the Jules API documentation.',
    mimeType: 'text/markdown'
  },
  async uri => {
    const docPath = new URL('../docs/jules-api.md', import.meta.url);
    const text = await readFile(docPath, 'utf8');
    return {
      contents: [
        {
          uri: uri.href,
          text
        }
      ]
    };
  }
);

async function start() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Jules MCP server ready (base URL: ${baseUrl})`);
  } catch (error) {
    console.error('Failed to start Jules MCP server:', error);
    process.exit(1);
  }
}

start();
