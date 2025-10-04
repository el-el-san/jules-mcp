# jules-mcp

Model Context Protocol (MCP) server that exposes the Jules API to MCP-compatible clients.

## Prerequisites
- Node.js 18 or newer
- A Jules API key generated from `https://jules.google.com/settings#api`

## Setup
```bash
npm install
```

## Running the server
Export your Jules API key (and optionally override the base URL) before starting the MCP server:

```bash
export JULES_API_KEY=your_api_key
# export JULES_API_URL=https://jules.googleapis.com/v1alpha/  # optional override
npm start
```

You can also run the published package (`@el-el-san/jules-mcp`) via `npx`. This is convenient when you have not cloned the repository locally.

```bash
JULES_API_KEY=your_api_key npx @el-el-san/jules-mcp
```

The process listens on stdio as required by the MCP specification. In Claude Code or any other MCP-compatible client, add an entry like the following to `.mcp.json` (replace `/absolute/path/to/jules-mcp` with your own path):

```json
{
  "mcpServers": {
    "jules": {
      "command": "npm",
      "args": [
        "--prefix",
        "/absolute/path/to/jules-mcp",
        "run",
        "start"
      ],
      "env": {
        "JULES_API_KEY": "${JULES_API_KEY}",
        "JULES_API_URL": "${JULES_API_URL:-https://jules.googleapis.com/v1alpha/}"
      },
      "cwd": "/absolute/path/to/jules-mcp"
    }
  }
}
```

The `--prefix` flag ensures npm resolves the correct `package.json` no matter where the MCP client starts the process. Matching the `cwd` keeps any additional tools that rely on relative paths aligned with the repository root.

To always run the latest published version without cloning the repository, configure your MCP client to invoke `npx` instead:

```json
{
  "mcpServers": {
    "jules": {
      "command": "npx",
      "args": ["@el-el-san/jules-mcp"],
      "env": {
        "JULES_API_KEY": "${JULES_API_KEY}",
        "JULES_API_URL": "${JULES_API_URL:-https://jules.googleapis.com/v1alpha/}"
      }
    }
  }
}
```

## Using with Claude Code
1. In Claude Code, open **Settings → Model Context Protocol** and load the `.mcp.json` that points to this repository (a sample is included at the repository root).
2. Once the connection succeeds, the `jules` server appears under `/tools` or in the **Tools** panel. Run `/tools refresh` if you do not see it immediately.
3. The typical tool flow is:
   - `list-sources` to list GitHub repositories or other sources linked to your Jules account.
   - `create-session` to start a session with a source and a prompt.
   - `list-sessions` to enumerate existing sessions and retrieve their IDs.
   - `approve-session-plan` to approve pending plans for sessions that require it.
   - `list-activities` to monitor progress within a session.
   - `send-session-message` to send additional user messages.
4. When you invoke a tool, Claude presents a JSON form. Fill in the required fields such as `sessionId` or `prompt` before submitting.

Each tool returns JSON text. Errors from the Jules API are forwarded verbatim, so check the error message for troubleshooting details.

## Documentation resource
The server also exposes a static resource `jules-doc://spec` that returns a condensed Markdown reference of the Jules API (see `docs/jules-api.md`). You can request this resource from your MCP client to prime the model with API context.

## Notes
- The Jules API is currently in alpha and subject to change. Update `docs/jules-api.md` and the tool implementations as Google publishes changes.
- Keep your `JULES_API_KEY` secret. Rotate the key from the Jules settings page if it is ever exposed.
