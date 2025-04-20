# Cognito パスワード認証 サンプル (Node.js + JavaScript)

AWS SDK for JavaScript v3 を使用して、Node.js バックエンドとシンプルな JavaScript フロントエンドで Cognito のユーザー名・パスワード認証 (USER_PASSWORD_AUTH フロー) を行うサンプルです。

## 前提条件

*   Node.js と npm がインストールされていること。
*   AWS アカウントと設定済みの Cognito ユーザープールがあること。
    *   ユーザープールに **ユーザー名・パスワード認証** (`USER_PASSWORD_AUTH`) を許可するアプリクライアントが作成されていること。
    *   (オプション) アプリクライアントにクライアントシークレットが設定されている場合、後述の `.env` ファイルに `COGNITO_CLIENT_SECRET` を設定する必要があります。
*   AWS 認証情報が設定されていること (環境変数、IAM ロール、`~/.aws/credentials` など)。

## セットアップ

1.  **リポジトリのクローンまたはダウンロード:**
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **バックエンドの設定:**
    *   `backend` ディレクトリに移動します。
        ```bash
        cd backend
        ```
    *   `.env.example` をコピーして `.env` ファイルを作成します。
        ```bash
        cp .env.example .env # もし .env.example があれば。なければ手動で .env を作成
        ```
    *   `.env` ファイルを開き、以下のプレースホルダをご自身の Cognito 設定に置き換えます:
        *   `AWS_REGION`: Cognito ユーザープールが存在する AWS リージョン (例: `ap-northeast-1`)
        *   `COGNITO_USER_POOL_ID`: Cognito ユーザープール ID
        *   `COGNITO_CLIENT_ID`: Cognito アプリクライアント ID
        *   `COGNITO_CLIENT_SECRET` (任意): Cognito アプリクライアントにクライアントシークレットが設定されている場合、その値を設定します。
        *   必要に応じて AWS 認証情報 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) を設定します (推奨は IAM ロールや `aws configure` による設定)。
    *   依存関係をインストールします。
        ```bash
        npm install
        ```

3.  **フロントエンドの設定:**
    *   特別な設定は不要です。`frontend` ディレクトリ内の `index.html` と `app.js` が使用されます。

## 実行

1.  **バックエンドサーバーの起動:**
    *   `backend` ディレクトリで以下のコマンドを実行します。
        ```bash
        node server.js
        ```
    *   サーバーが `http://localhost:3000` で起動します。

2.  **フロントエンドの表示:**
    *   `frontend` ディレクトリにある `index.html` ファイルをウェブブラウザで開きます。
        *   ローカルファイルとして直接開くか、簡単な HTTP サーバー (例: `python -m http.server` や `npx serve`) を `frontend` ディレクトリで起動してアクセスします。

3.  **ログイン:**
    *   ブラウザに表示されたフォームに、Cognito に登録済みのユーザー名とパスワードを入力し、「ログイン」ボタンをクリックします。
    *   認証結果 (成功またはエラー) がフォームの下に表示されます。

## コードの概要

*   **`backend/server.js`**: Express を使用した Node.js サーバー。
    *   `/login` エンドポイント (POST): リクエストボディからユーザー名とパスワードを受け取り、`@aws-sdk/client-cognito-identity-provider` の `InitiateAuthCommand` を使用して Cognito で認証を行います。
    *   クライアントシークレットが設定されている場合、`SECRET_HASH` を計算して認証リクエストに含めます。
    *   認証結果 (ID トークン、アクセストークンなど) またはエラーメッセージを JSON 形式でフロントエンドに返します。
    *   `dotenv` を使用して `.env` ファイルから設定を読み込みます。
    *   `cors` を使用して、ブラウザからのクロスオリジンリクエストを許可します。
*   **`backend/.env`**: AWS リージョン、Cognito ユーザープール ID、クライアント ID、クライアントシークレット (任意) などの設定情報を格納します (Git 管理外)。
*   **`backend/package.json`**: バックエンドの依存関係 (`express`, `@aws-sdk/client-cognito-identity-provider`, `dotenv`, `cors`) を定義します。
*   **`frontend/index.html`**: ログインフォームの HTML 構造を定義します。
*   **`frontend/app.js`**: フロントエンドの JavaScript。
    *   フォームの送信イベントを捕捉します。
    *   `fetch` API を使用してバックエンドの `/login` エンドポイントに POST リクエストを送信します。
    *   バックエンドからのレスポンスを受け取り、結果を画面に表示します。
