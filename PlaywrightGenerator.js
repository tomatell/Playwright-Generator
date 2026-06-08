const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log('--- Salesforce 自動化スクリプト生成 (暗号化対応) ---');
  
  const env = await rl.question('環境を選択してください (prod / sandbox): ');
  const username = await rl.question('Salesforce ユーザー名: ');
  const sfPassword = await rl.question('Salesforce パスワード: ');
  const masterPass = await rl.question('【重要】復号用のマスターパスワードを設定してください: ');
  const selector = await rl.question('クリックする要素のCSSセレクタ: ');

  // AES-256-CBC 暗号化設定
  const algorithm = 'aes-256-cbc';
  const salt = crypto.randomBytes(16); // 鍵生成用のソルト
  const iv = crypto.randomBytes(16);   // 初期化ベクトル
  const key = crypto.scryptSync(masterPass, salt, 32); // マスターパスから鍵を生成

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(sfPassword, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 生成されるスクリプトの内容
  const scriptContent = `
const { chromium } = require('playwright');
const crypto = require('crypto');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

const CONFIG = {
  encryptedData: '${encrypted}',
  salt: '${salt.toString('hex')}',
  iv: '${iv.toString('hex')}',
  baseUrl: '${env === 'sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com'}',
  username: '${username}',
  selector: '${selector}'
};

(async () => {
  const rl = readline.createInterface({ input, output });
  const masterPass = await rl.question('実行用のマスターパスワードを入力してください: ');
  rl.close();

  // 鍵の復元
  const key = crypto.scryptSync(masterPass, Buffer.from(CONFIG.salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(CONFIG.iv, 'hex'));
  
  let decryptedPassword;
  try {
    decryptedPassword = decipher.update(CONFIG.encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  } catch (e) {
    console.error('復号に失敗しました。マスターパスワードが間違っています。');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('ログイン処理を開始...');
  await page.goto(CONFIG.baseUrl);
  await page.fill('#username', CONFIG.username);
  await page.fill('#password', decryptedPassword);
  await page.click('#Login');

  await page.waitForLoadState('networkidle');

  console.log('要素を操作中: ' + CONFIG.selector);
  try {
    await page.click(CONFIG.selector);
    await page.waitForLoadState('networkidle');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: 'screenshot-' + timestamp + '.png' });
    console.log('キャプチャ保存完了: screenshot-' + timestamp + '.png');
  } catch (e) {
    console.error('操作エラー:', e.message);
  }

  await browser.close();
})();
`;

  fs.writeFileSync('salesforce_bot.js', scriptContent);
  console.log('\n--- 生成完了 ---');
  console.log('salesforce_bot.js が作成されました。');
  rl.close();
}

main();
