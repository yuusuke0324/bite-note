/**
 * GPS画像生成スクリプトの動作確認
 * 手動実行用: npx tsx tests/fixtures/verify-image-generation.ts
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  createGPSPhoto,
  createPhotoWithoutGPS,
  cleanupTestPhotos,
  TEST_LOCATIONS
} from './create-test-image';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 GPS画像生成テスト開始...\n');

  const testDir = path.join(__dirname, 'test-output');
  const generatedPhotos: string[] = [];

  try {
    // 1. 東京湾GPS画像生成
    console.log('📍 テスト1: 東京湾GPS画像生成');
    const tokyoBayPath = path.join(testDir, 'tokyo-bay.jpg');
    await createGPSPhoto(TEST_LOCATIONS.TOKYO_BAY, tokyoBayPath);
    generatedPhotos.push(tokyoBayPath);
    console.log('');

    // 2. 大阪湾GPS画像生成
    console.log('📍 テスト2: 大阪湾GPS画像生成');
    const osakaBayPath = path.join(testDir, 'osaka-bay.jpg');
    await createGPSPhoto(TEST_LOCATIONS.OSAKA_BAY, osakaBayPath);
    generatedPhotos.push(osakaBayPath);
    console.log('');

    // 3. GPS情報なし画像生成
    console.log('📍 テスト3: GPS情報なし画像生成');
    const noGpsPath = path.join(testDir, 'no-gps.jpg');
    await createPhotoWithoutGPS(noGpsPath);
    generatedPhotos.push(noGpsPath);
    console.log('');

    console.log('✅ 全テスト完了!\n');
    console.log('📦 生成されたファイル:');
    generatedPhotos.forEach(p => console.log(`   - ${p}`));
    console.log('\n💡 これらのファイルはE2Eテストで使用されます。');
    console.log('💡 削除する場合は手動で削除してください。');

  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

main();
