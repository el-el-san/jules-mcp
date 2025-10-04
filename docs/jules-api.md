# Jules API Overview

This condensed summary is based on the public documentation at https://developers.google.com/jules/api.

## Core Resources
- **Source**: A connected codebase (for example a GitHub repository). Add sources in the Jules web app by installing the Jules GitHub app before using the API.
- **Session**: A focused unit of work that combines a prompt and a source context. Sessions behave like asynchronous conversations with the agent.
- **Activity**: An individual event inside a session (plan creation, user message, agent response, etc.). Listing activities lets you poll for progress.

## Authentication
1. Generate an API key from the Jules web application at `https://jules.google.com/settings#api`.
2. Send the key in the `X-Goog-Api-Key` header on every request.

## Base URL
All examples use the alpha endpoint: `https://jules.googleapis.com/v1alpha/`.

## REST Endpoints

### List Sources
```
GET /sources
Optional query params: pageSize, pageToken
```
Returns the sources available to the authenticated user, including GitHub metadata.

### Create Session
```
POST /sessions
Body: {
  "prompt": "...",
  "sourceContext": {
    "source": "sources/github/{owner}/{repo}",
    "githubRepoContext": { "startingBranch": "main" }
  },
  "title": "Optional title",
  "requirePlanApproval": false
}
```
Creates a session tied to the specified source. Plans are automatically approved unless `requirePlanApproval` is `true`.

### List Sessions
```
GET /sessions
Optional query params: pageSize, pageToken
```
Retrieves recent sessions created by the caller.

### Approve Plan
```
POST /sessions/{sessionId}:approvePlan
```
Approves the most recent plan for a session that was created with `requirePlanApproval = true`.

### List Activities
```
GET /sessions/{sessionId}/activities
Optional query params: pageSize, pageToken
```
Lists chronological activities (user prompts, agent responses, plan updates, etc.) within a session.

### Send Message
```
POST /sessions/{sessionId}:sendMessage
Body: { "prompt": "Can you make the app corgi themed?" }
```
Adds a user message to the session. The agent replies in a subsequent activity, so poll activities to see the result.

## Notes
- The API is in **alpha** and subject to breaking changes.
- Keep API keys secret. Exposed keys may be automatically disabled.
- Additional clients (Slack, Linear, GitHub) can be integrated by configuring them inside the Jules app.
