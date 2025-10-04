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

The process listens on stdio as required by the MCP specification. Claude Code や他の MCP クライアントでは、以下のような `.mcp.json` エントリを追加すると便利です（`/absolute/path/to/jules-mcp` は自身のパスに置き換えてください）。

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

`--prefix` を指定することで、MCP クライアントがどのディレクトリから起動されても npm が正しい `package.json` を解決できます。同様に `cwd` を合わせておくと、相対パスを扱う追加ツールを実装した際にも安全です。

## Claude Code での使い方
1. Claude Code の設定メニューから **Model Context Protocol** セクションを開き、このリポジトリを指すように `.mcp.json` を読み込ませます（本リポジトリ直下にあるサンプル設定ファイルをそのまま利用可能）。
2. Claude Code が接続に成功すると、チャット入力欄で `/tools` または「ツール」パネルから `jules` サーバーが表示されます。初回は `/tools refresh` を実行すると一覧が更新されます。
3. ツールは以下の順に利用するとわかりやすいです。
   - `list-sources` で接続されている GitHub リポジトリなどのソース一覧を取得。
   - `create-session` で対象ソースとプロンプトを指定してセッションを作成。
   - `list-sessions` で既存セッションの確認や ID の取得。
   - `approve-session-plan` で承認待ちプランの承認。
   - `list-activities` で進捗のアクティビティを確認。
   - `send-session-message` でセッションに追加メッセージを送信。
4. ツール呼び出し時は Claude が JSON 入力フォームを提示するので、必要な項目（例: `sessionId`, `prompt` など）を入力して実行してください。

各ツールの結果は JSON テキストとして返されます。Jules API からのエラーもそのまま返すので、失敗した場合はエラーメッセージを参考にしてください。

## Documentation resource
The server also exposes a static resource `jules-doc://spec` that returns a condensed Markdown reference of the Jules API (see `docs/jules-api.md`). You can request this resource from your MCP client to prime the model with API context.

## Notes
- The Jules API is currently in alpha and subject to change. Update `docs/jules-api.md` and the tool implementations as Google publishes changes.
- Keep your `JULES_API_KEY` secret. Rotate the key from the Jules settings page if it is ever exposed.
