const crypto = require("crypto"); // crypto モジュールをインポート
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const app = express();
const port = 3000;

// 環境変数から設定を読み込む
const cognitoRegion = process.env.AWS_REGION;
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID;
const cognitoClientId = process.env.COGNITO_CLIENT_ID;
const cognitoClientSecret = process.env.COGNITO_CLIENT_SECRET; // クライアントシークレットを読み込む

if (!cognitoRegion || !cognitoUserPoolId || !cognitoClientId) {
  console.error(
    "必要な環境変数 (AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID) が設定されていません。"
  );
  process.exit(1); // 環境変数がなければサーバーを起動しない
}

// AWS SDK Cognito Client の初期化
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoRegion,
  // AWS認証情報は環境変数、IAMロール、または ~/.aws/credentials から自動的に読み込まれます。
  // 必要に応じて credentials プロパティを明示的に設定することも可能です。
});

// SecretHash を計算する関数
const calculateSecretHash = (username) => {
  if (!cognitoClientSecret) {
    return undefined; // クライアントシークレットがなければ undefined を返す
  }
  const message = username + cognitoClientId;
  return crypto
    .createHmac("sha256", cognitoClientSecret)
    .update(message)
    .digest("base64");
};

// ミドルウェアの設定
app.use(cors()); // CORS を有効にする
app.use(express.json()); // JSON リクエストボディをパースする

// ログインエンドポイント
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "ユーザー名とパスワードが必要です。" });
  }

  // SecretHash を計算
  const secretHash = calculateSecretHash(username);

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: cognitoClientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    // UserPoolId は InitiateAuthCommand では不要 (ClientId から推測されるため)
    // ただし、他のコマンドでは必要になる場合があります。
  };

  // クライアントシークレットが存在する場合のみ SecretHash を追加
  if (secretHash) {
    params.AuthParameters.SECRET_HASH = secretHash;
  }

  try {
    const command = new InitiateAuthCommand(params);
    const data = await cognitoClient.send(command);
    // console.log("認証成功:", data.AuthenticationResult); // この行をコメントアウト
    console.log("Cognito 認証レスポンス:", data); // data オブジェクト全体をログに出力

    // レスポンスに AuthenticationResult があるかチェック
    if (data && data.AuthenticationResult) {
      console.log("認証成功 (トークン取得):", data.AuthenticationResult);
      // フロントエンドには必要なトークンのみを返す
      res.json({
        message: "ログイン成功",
        idToken: data.AuthenticationResult.IdToken,
        accessToken: data.AuthenticationResult.AccessToken,
        refreshToken: data.AuthenticationResult.RefreshToken, // 必要に応じて
      });
    } else {
      // AuthenticationResult がない場合 (チャレンジなど)
      console.warn(
        "認証フローが完了していません (チャレンジの可能性あり):",
        data
      );
      // フロントエンドには、チャレンジが必要である旨などを返す
      res.status(401).json({
        message:
          "認証に失敗しました。追加のアクションが必要な可能性があります。",
        challengeName: data.ChallengeName, // チャレンジ名を返す
        session: data.Session, // セッション情報を返す
      });
    }
  } catch (error) {
    console.error("認証エラー:", error);
    // エラー内容に応じて、より具体的なメッセージを返すことも検討
    if (error.name === "NotAuthorizedException") {
      res
        .status(401)
        .json({ message: "ユーザー名またはパスワードが正しくありません。" });
    } else if (error.name === "UserNotFoundException") {
      res.status(404).json({ message: "ユーザーが見つかりません。" });
    } else {
      res.status(500).json({ message: "認証中にエラーが発生しました。" });
    }
  }
});

// 新しいパスワード設定チャレンジ応答エンドポイント
app.post("/complete-new-password", async (req, res) => {
  const { username, newPassword, email, session } = req.body;

  if (!username || !newPassword || !email || !session) {
    return res.status(400).json({
      message:
        "必要な情報 (ユーザー名, 新パスワード, Eメール, セッション) が不足しています。",
    });
  }

  // SecretHash を計算 (チャレンジ応答にも必要)
  const secretHash = calculateSecretHash(username);

  const params = {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: cognitoClientId,
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
      // 必須属性として要求された属性を送信 (今回は email)
      // 'userAttributes.' プレフィックスは不要な場合が多いですが、Cognitoの仕様に依存します。
      // 通常は属性名のみでOKです。
      "userAttributes.email": email,
    },
  };

  // クライアントシークレットが存在する場合のみ SecretHash を追加
  if (secretHash) {
    params.ChallengeResponses.SECRET_HASH = secretHash;
  }

  try {
    const command = new RespondToAuthChallengeCommand(params);
    const data = await cognitoClient.send(command);
    console.log("チャレンジ応答成功:", data);

    // チャレンジ応答が成功すると、通常 AuthenticationResult が返る
    if (data && data.AuthenticationResult) {
      console.log("認証成功 (トークン取得):", data.AuthenticationResult);
      res.json({
        message: "パスワード設定完了、ログイン成功",
        idToken: data.AuthenticationResult.IdToken,
        accessToken: data.AuthenticationResult.AccessToken,
        refreshToken: data.AuthenticationResult.RefreshToken,
      });
    } else {
      // 予期しない応答 (別のチャレンジなど)
      console.warn("予期しないチャレンジ応答:", data);
      res
        .status(500)
        .json({ message: "パスワード設定中に予期しない応答がありました。" });
    }
  } catch (error) {
    console.error("チャレンジ応答エラー:", error);
    // エラーの種類に応じて、より具体的なメッセージを返す
    if (
      error.name === "InvalidParameterException" ||
      error.name === "InvalidPasswordException"
    ) {
      res
        .status(400)
        .json({ message: `パスワード設定エラー: ${error.message}` });
    } else if (error.name === "CodeMismatchException") {
      // MFAコード不一致など (今回は関係ないはず)
      res.status(400).json({ message: "コードが一致しません。" });
    } else if (error.name === "ExpiredCodeException") {
      // コード有効期限切れ (今回は関係ないはず)
      res.status(400).json({ message: "コードの有効期限が切れています。" });
    } else if (error.name === "NotAuthorizedException") {
      // セッションが無効など
      res.status(401).json({ message: `認証エラー: ${error.message}` });
    } else {
      res
        .status(500)
        .json({ message: "パスワード設定中にエラーが発生しました。" });
    }
  }
});

app.listen(port, () => {
  console.log(`バックエンドサーバーが http://localhost:${port} で起動しました`);
});
