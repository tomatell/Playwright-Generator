const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log('=== Salesforce 自動化スクリプト生成ツール ===');
  
  const env = await rl.question('環境を選択 (prod/sandbox): ');
  const username = await rl.question('Salesforce ユーザー名: ');
  const password = await rl.question('Salesforce パスワード: ');
  const masterKey = await rl.question('【重要】復号用のマスターパスワード: ');
  
  // 入力ステップの追加
  const hasInput = await rl.question('クリック前にテキスト入力が必要ですか？ (y/n): ');
  let inputSelector = '';
  let inputValue = '';
  if (hasInput.toLowerCase() === 'y') {
    inputSelector = await rl.question('入力対象のCSSセレクタ: ');
    inputValue = await rl.question('入力する値: ');
  }

  const clickSelector = await rl.question('クリックする要素のCSSセレクタ: ');

  // 暗号化処理
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(masterKey, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const scriptContent = `
const { chromium } = require('playwright');
const crypto = require('crypto');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');

const DATA = {
  enc: '${encrypted}',
  salt: '${salt.toString('hex')}',
  iv: '${iv.toString('hex')}',
  url: '${env === 'sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com'}',
  user: '${username}',
  inputSelector: '${inputSelector}',
  inputValue: '${inputValue}',
  clickSelector: '${clickSelector}'
};

(async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const masterKey = await rl.question('実行用マスターパスワードを入力: ');
  rl.close();

  try {
    const key = crypto.scryptSync(masterKey, Buffer.from(DATA.salt, 'hex'), 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(DATA.iv, 'hex'));
    const password = decipher.update(DATA.enc, 'hex', 'utf8') + decipher.final('utf8');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto(DATA.url);
    await page.fill('#username', DATA.user);
    await page.fill('#password', password);
    await page.click('#Login');
    
    await page.waitForLoadState('networkidle');

    // 追加した入力処理
    if (DATA.inputSelector) {
      console.log('入力処理を実行中...');
      await page.fill(DATA.inputSelector, DATA.inputValue);
    }

    console.log('クリック処理を実行中...');
    await page.click(DATA.clickSelector);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'sf_result.png' });
    console.log('成功: sf_result.png を保存しました。');
    await browser.close();
  } catch (e) {
    console.error('エラー: 認証失敗または要素が見つかりません。', e.message);
  }
})();
`;

  fs.writeFileSync('salesforce_bot.js', scriptContent);
  console.log('\n[完了] salesforce_bot.js を生成しました。');
  rl.close();
}

main();
