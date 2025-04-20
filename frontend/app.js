const loginForm = document.getElementById("loginForm");
const newPasswordForm = document.getElementById("newPasswordForm"); // 新しいフォームへの参照
const messageDiv = document.getElementById("message");

// バックエンドAPIのエンドポイント
const loginUrl = "http://localhost:3000/login"; // 通常のログイン
const completePasswordUrl = "http://localhost:3000/complete-new-password"; // 新パスワード設定 (後で作成)

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルトのフォーム送信をキャンセル

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const username = usernameInput.value;
  const password = passwordInput.value;

  // メッセージ表示領域をクリア
  messageDiv.textContent = "";
  messageDiv.className = "";

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // 通常のログイン成功
      handleSuccessfulLogin(data);
    } else {
      // ログイン失敗、チャレンジの可能性をチェック
      if (data.challengeName === "NEW_PASSWORD_REQUIRED") {
        console.log("NEW_PASSWORD_REQUIRED challenge received.");
        messageDiv.textContent =
          "初回ログインのため、新しいパスワードとEメールアドレスを設定してください。";
        messageDiv.className = "error"; // 注意を促すスタイル
        // 新パスワードフォームを表示し、必要な情報を設定
        document.getElementById("challengeSession").value = data.session;
        document.getElementById("challengeUsername").value = username; // username を保持
        loginForm.style.display = "none";
        newPasswordForm.style.display = "block";
      } else {
        // その他のログインエラー
        messageDiv.textContent = `エラー: ${data.message}`;
        messageDiv.className = "error";
        console.error("Login failed:", data);
      }
    }
  } catch (error) {
    handleFetchError(error);
  }
});

// --- 新パスワード設定フォームの処理 ---
newPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageDiv.textContent = "";
  messageDiv.className = "";

  const newPasswordInput = document.getElementById("newPassword");
  const emailInput = document.getElementById("email");
  const sessionInput = document.getElementById("challengeSession");
  const usernameInput = document.getElementById("challengeUsername"); // username を取得

  const newPassword = newPasswordInput.value;
  const email = emailInput.value;
  const session = sessionInput.value;
  const username = usernameInput.value;

  try {
    const response = await fetch(completePasswordUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, newPassword, email, session }), // username も送信
    });

    const data = await response.json();

    if (response.ok) {
      // パスワード設定成功＆ログイン成功
      handleSuccessfulLogin(data);
      newPasswordForm.style.display = "none"; // フォームを隠す
      // loginForm.style.display = 'block'; // 必要ならログインフォームを再表示
    } else {
      // パスワード設定失敗
      messageDiv.textContent = `エラー: ${data.message}`;
      messageDiv.className = "error";
      console.error("New password challenge failed:", data);
    }
  } catch (error) {
    handleFetchError(error);
  }
});

// --- ヘルパー関数 ---
function handleSuccessfulLogin(data) {
  messageDiv.textContent = `${data.message} (ID Token: ${data.idToken.substring(
    0,
    30
  )}...)`;
  messageDiv.className = "success";
  console.log("Login successful:", data);
  // 例: localStorage.setItem("idToken", data.idToken);
}

function handleFetchError(error) {
  messageDiv.textContent = "エラー: サーバーとの通信に失敗しました。";
  messageDiv.className = "error";
  console.error("Network or other error:", error);
}
