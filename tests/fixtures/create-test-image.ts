/**
 * E2Eテスト用のGPS座標付き画像生成ユーティリティ
 * TASK-402: 潮汐システムE2Eテスト対応
 */

import sharp from 'sharp';
import piexif from 'piexifjs';
import fs from 'fs/promises';
import path from 'path';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  description?: string;
}

// 事前定義済みテスト座標
export const TEST_LOCATIONS = {
  TOKYO_BAY: { latitude: 35.6762, longitude: 139.6503, description: '東京湾' },
  OSAKA_BAY: { latitude: 34.6197, longitude: 135.4286, description: '大阪湾' },
  INVALID: { latitude: 0, longitude: 0, description: '無効な座標' }
} as const;

/**
 * 度数法の度をDMS（度分秒）形式に変換
 * EXIF GPS形式: [[度, 1], [分, 1], [秒, 100]] （秒は1/100単位）
 */
function decimalToDMS(decimal: number): [[number, number], [number, number], [number, number]] {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60 * 100);

  return [
    [degrees, 1],
    [minutes, 1],
    [seconds, 100]
  ];
}

/**
 * GPS座標付きJPEG画像を生成
 *
 * @param coords GPS座標
 * @param outputPath 出力ファイルパス
 * @returns 生成されたファイルパス
 */
export async function createGPSPhoto(
  coords: GPSCoordinates,
  outputPath: string
): Promise<string> {
  try {
    // 1. 最小サイズのJPEG画像生成（1x1px、白背景）
    const imageBuffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .jpeg({ quality: 10 }) // 最低品質で最小ファイルサイズ
      .toBuffer();

    // 2. 一時的にBase64エンコード（piexifjs要件）
    const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    // 3. EXIF GPS情報を作成
    const zeroth: { [key: string]: any } = {};
    const exif: { [key: string]: any } = {};
    const gps: { [key: string]: any } = {};

    // GPS座標設定
    gps[piexif.GPSIFD.GPSLatitude] = decimalToDMS(coords.latitude);
    gps[piexif.GPSIFD.GPSLatitudeRef] = coords.latitude >= 0 ? 'N' : 'S';
    gps[piexif.GPSIFD.GPSLongitude] = decimalToDMS(coords.longitude);
    gps[piexif.GPSIFD.GPSLongitudeRef] = coords.longitude >= 0 ? 'E' : 'W';

    // 撮影日時設定（現在時刻）
    const now = new Date();
    const dateTimeString = now.toISOString()
      .replace(/T/, ' ')
      .replace(/\.\d+Z$/, '');
    exif[piexif.ExifIFD.DateTimeOriginal] = dateTimeString;
    exif[piexif.ExifIFD.DateTimeDigitized] = dateTimeString;

    // EXIF辞書を構築
    const exifObj = {
      '0th': zeroth,
      'Exif': exif,
      'GPS': gps
    };

    // 4. EXIFバイナリ生成
    const exifBytes = piexif.dump(exifObj);

    // 5. 画像にEXIF情報を挿入
    const imageWithExif = piexif.insert(exifBytes, imageDataUrl);

    // 6. Base64デコードしてファイルに書き込み
    const base64Data = imageWithExif.split(',')[1];
    const finalBuffer = Buffer.from(base64Data, 'base64');

    // 出力ディレクトリ確保
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // ファイル書き込み
    await fs.writeFile(outputPath, finalBuffer);

    console.log(`✅ GPS画像生成完了: ${outputPath} (${finalBuffer.length} bytes)`);
    console.log(`   📍 座標: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
    if (coords.description) {
      console.log(`   📝 説明: ${coords.description}`);
    }

    return outputPath;
  } catch (error) {
    console.error('❌ GPS画像生成失敗:', error);
    throw error;
  }
}

/**
 * GPS情報なしのJPEG画像を生成（エッジケーステスト用）
 */
export async function createPhotoWithoutGPS(outputPath: string): Promise<string> {
  try {
    const imageBuffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 200, g: 200, b: 200 }
      }
    })
      .jpeg({ quality: 10 })
      .toBuffer();

    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(outputPath, imageBuffer);

    console.log(`✅ GPS情報なし画像生成完了: ${outputPath} (${imageBuffer.length} bytes)`);
    return outputPath;
  } catch (error) {
    console.error('❌ 画像生成失敗:', error);
    throw error;
  }
}

/**
 * テスト画像のクリーンアップ
 */
export async function cleanupTestPhotos(photoPaths: string[]): Promise<void> {
  for (const photoPath of photoPaths) {
    try {
      await fs.unlink(photoPath);
      console.log(`🗑️  削除: ${photoPath}`);
    } catch (error) {
      // ファイルが存在しない場合は無視
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`⚠️  削除失敗: ${photoPath}`, error);
      }
    }
  }
}
