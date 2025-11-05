// データエクスポート・インポートサービス

import { fishingRecordService } from './fishing-record-service';
import { photoService } from './photo-service';
import { settingsService } from './settings-service';
import { imageProcessingService } from './image-processing';
import type {
  ExportData,
  ExportPhotoData,
  ImportResult,
  DatabaseResult
} from '../types';
import * as XLSX from 'xlsx';

export class ExportImportService {

  // 全データのエクスポート
  async exportAllData(): Promise<DatabaseResult<string>> {
    try {
      // 釣果記録の取得
      const recordsResult = await fishingRecordService.getRecords();
      if (!recordsResult.success) {
        return {
          success: false,
          error: {
            code: 'EXPORT_RECORDS_FAILED',
            message: 'Failed to get fishing records for export',
            details: recordsResult.error
          }
        };
      }

      // 写真データの取得とBase64変換
      const photos: ExportPhotoData[] = [];
      const photosResult = await photoService.getPhotosMetadata();

      if (photosResult.success && photosResult.data) {
        for (const photoMeta of photosResult.data) {
          const photoResult = await photoService.getPhotoById(photoMeta.id);
          if (photoResult.success && photoResult.data) {
            const base64Data = await imageProcessingService.blobToBase64(photoResult.data.blob);

            photos.push({
              id: photoResult.data.id,
              data: base64Data,
              mimeType: photoResult.data.mimeType,
              filename: photoResult.data.filename
            });
          }
        }
      }

      // 設定の取得
      const settingsResult = await settingsService.getSettings();
      if (!settingsResult.success) {
        return {
          success: false,
          error: {
            code: 'EXPORT_SETTINGS_FAILED',
            message: 'Failed to get settings for export',
            details: settingsResult.error
          }
        };
      }

      // エクスポートデータの作成
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: new Date(),
        records: recordsResult.data || [],
        photos,
        settings: settingsResult.data!
      };

      // JSON文字列に変換
      const jsonString = JSON.stringify(exportData, null, 2);

      return {
        success: true,
        data: jsonString
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export data',
          details: error
        }
      };
    }
  }

  // データのインポート
  async importData(jsonString: string): Promise<DatabaseResult<ImportResult>> {
    try {
      // JSONの解析
      const exportData: ExportData = JSON.parse(jsonString);

      // データ構造の検証
      const validationResult = this.validateImportData(exportData);
      if (!validationResult.success) {
        return validationResult as DatabaseResult<ImportResult>;
      }

      let importedRecords = 0;
      let importedPhotos = 0;
      let skippedItems = 0;
      const errors: string[] = [];

      // 写真データのインポート
      const photoIdMapping = new Map<string, string>(); // 旧ID -> 新ID のマッピング

      for (const photoData of exportData.photos) {
        try {
          // Base64からBlobに変換
          const blob = imageProcessingService.base64ToBlob(photoData.data, photoData.mimeType);

          // Fileオブジェクトを作成
          const file = new File([blob], photoData.filename, { type: photoData.mimeType });

          // 写真を保存
          const saveResult = await photoService.savePhoto(file);
          if (saveResult.success && saveResult.data) {
            photoIdMapping.set(photoData.id, saveResult.data.id);
            importedPhotos++;
          } else {
            errors.push(`Failed to import photo ${photoData.filename}: ${saveResult.error?.message}`);
            skippedItems++;
          }
        } catch (error) {
          errors.push(`Failed to process photo ${photoData.filename}: ${error}`);
          skippedItems++;
        }
      }

      // 釣果記録のインポート
      for (const record of exportData.records) {
        try {
          // 写真IDの更新（必要な場合）
          let newPhotoId = record.photoId;
          if (record.photoId && photoIdMapping.has(record.photoId)) {
            newPhotoId = photoIdMapping.get(record.photoId);
          }

          // 記録の作成
          const createData = {
            date: typeof record.date === 'string' ? record.date : record.date.toISOString().split('T')[0],
            location: record.location,
            fishSpecies: record.fishSpecies,
            size: record.size,
            photoId: newPhotoId,
            coordinates: record.coordinates,
            notes: record.notes,
            useGPS: false // インポート時はGPSフラグは無効
          };

          const createResult = await fishingRecordService.createRecord(createData);
          if (createResult.success) {
            importedRecords++;
          } else {
            errors.push(`Failed to import record: ${createResult.error?.message}`);
            skippedItems++;
          }
        } catch (error) {
          errors.push(`Failed to process record: ${error}`);
          skippedItems++;
        }
      }

      // 設定のインポート（オプション）
      try {
        await settingsService.updateSettings(exportData.settings);
      } catch (error) {
        errors.push(`Failed to import settings: ${error}`);
      }

      const result: ImportResult = {
        success: errors.length === 0 || (importedRecords > 0 || importedPhotos > 0),
        importedRecords,
        importedPhotos,
        skippedItems,
        errors
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: 'Failed to import data',
          details: error
        }
      };
    }
  }

  // CSVフォーマットでのエクスポート（記録のみ）
  async exportRecordsAsCSV(): Promise<DatabaseResult<string>> {
    try {
      const recordsResult = await fishingRecordService.getRecords();
      if (!recordsResult.success || !recordsResult.data) {
        return {
          success: false,
          error: {
            code: 'EXPORT_CSV_FAILED',
            message: 'Failed to get records for CSV export',
            details: recordsResult.error
          }
        };
      }

      // CSVヘッダー
      const headers = [
        'ID',
        'Date',
        'Location',
        'Fish Species',
        'Size (cm)',
        'Latitude',
        'Longitude',
        'GPS Accuracy',
        'Notes',
        'Created At',
        'Updated At'
      ];

      // CSVデータの作成
      const csvRows = [headers.join(',')];

      for (const record of recordsResult.data) {
        const row = [
          `"${record.id}"`,
          `"${record.date.toISOString().split('T')[0]}"`,
          `"${record.location}"`,
          `"${record.fishSpecies}"`,
          record.size?.toString() || '',
          record.coordinates?.latitude?.toString() || '',
          record.coordinates?.longitude?.toString() || '',
          record.coordinates?.accuracy?.toString() || '',
          `"${record.notes || ''}"`,
          `"${record.createdAt.toISOString()}"`,
          `"${record.updatedAt.toISOString()}"`
        ];
        csvRows.push(row.join(','));
      }

      const csvString = csvRows.join('\n');

      return {
        success: true,
        data: csvString
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_CSV_FAILED',
          message: 'Failed to export records as CSV',
          details: error
        }
      };
    }
  }

  // CSVフォーマットからのインポート（記録のみ）
  async importRecordsFromCSV(csvString: string): Promise<DatabaseResult<ImportResult>> {
    try {
      // CSVの解析
      const lines = csvString.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        return {
          success: false,
          error: {
            code: 'INVALID_CSV_FORMAT',
            message: 'CSV file must contain header and at least one data row'
          }
        };
      }

      // ヘッダーの解析
      const headers = this.parseCSVLine(lines[0]);

      // 必須カラムの検証
      const requiredColumns = ['Date', 'Location', 'Fish Species'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        return {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_COLUMNS',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            details: { missingColumns }
          }
        };
      }

      // カラムインデックスのマッピング
      const columnIndices = {
        date: headers.indexOf('Date'),
        location: headers.indexOf('Location'),
        fishSpecies: headers.indexOf('Fish Species'),
        size: headers.indexOf('Size (cm)'),
        latitude: headers.indexOf('Latitude'),
        longitude: headers.indexOf('Longitude'),
        gpsAccuracy: headers.indexOf('GPS Accuracy'),
        notes: headers.indexOf('Notes')
      };

      let importedRecords = 0;
      let skippedItems = 0;
      const errors: string[] = [];

      // データ行の処理（ヘッダーをスキップ）
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);

          // 行のバリデーション
          const validationError = this.validateCSVRow(values, columnIndices, i + 1);
          if (validationError) {
            errors.push(validationError);
            skippedItems++;
            continue;
          }

          // 座標データの作成
          let coordinates = undefined;
          const latitude = this.parseNumber(values[columnIndices.latitude]);
          const longitude = this.parseNumber(values[columnIndices.longitude]);

          if (latitude !== null && longitude !== null) {
            coordinates = {
              latitude,
              longitude,
              accuracy: this.parseNumber(values[columnIndices.gpsAccuracy]) || undefined,
              timestamp: new Date().toISOString()
            };
          }

          // 記録データの作成
          const createData = {
            date: values[columnIndices.date],
            location: values[columnIndices.location],
            fishSpecies: values[columnIndices.fishSpecies],
            size: this.parseNumber(values[columnIndices.size]) || undefined,
            coordinates,
            notes: values[columnIndices.notes] || undefined,
            useGPS: false // CSV インポート時はGPSフラグは無効
          };

          // 記録の保存
          const createResult = await fishingRecordService.createRecord(createData);

          if (createResult.success) {
            importedRecords++;
          } else {
            errors.push(`Row ${i + 1}: Failed to import - ${createResult.error?.message}`);
            skippedItems++;
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: Failed to process - ${error}`);
          skippedItems++;
        }
      }

      const result: ImportResult = {
        success: errors.length === 0 || importedRecords > 0,
        importedRecords,
        importedPhotos: 0, // CSV does not include photos
        skippedItems,
        errors
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CSV_IMPORT_FAILED',
          message: 'Failed to import CSV data',
          details: error
        }
      };
    }
  }

  // CSV行のパース（引用符とエスケープ処理）
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされた引用符
          current += '"';
          i++; // 次の引用符をスキップ
        } else {
          // 引用符の開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // フィールドの区切り
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 最後のフィールドを追加
    result.push(current.trim());

    return result;
  }

  // CSV行のバリデーション
  private validateCSVRow(
    values: string[],
    columnIndices: Record<string, number>,
    rowNumber: number
  ): string | null {
    // 必須フィールドの検証
    if (!values[columnIndices.date]) {
      return `Row ${rowNumber}: Date is required`;
    }

    if (!values[columnIndices.location]) {
      return `Row ${rowNumber}: Location is required`;
    }

    if (!values[columnIndices.fishSpecies]) {
      return `Row ${rowNumber}: Fish Species is required`;
    }

    // 日付フォーマットの検証
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(values[columnIndices.date])) {
      return `Row ${rowNumber}: Invalid date format (expected YYYY-MM-DD)`;
    }

    // 数値フィールドの検証
    if (values[columnIndices.size] && this.parseNumber(values[columnIndices.size]) === null) {
      return `Row ${rowNumber}: Invalid size value`;
    }

    if (values[columnIndices.latitude] && this.parseNumber(values[columnIndices.latitude]) === null) {
      return `Row ${rowNumber}: Invalid latitude value`;
    }

    if (values[columnIndices.longitude] && this.parseNumber(values[columnIndices.longitude]) === null) {
      return `Row ${rowNumber}: Invalid longitude value`;
    }

    return null;
  }

  // 数値のパース（空文字列やnullを処理）
  private parseNumber(value: string | undefined): number | null {
    if (!value || value.trim() === '') {
      return null;
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  // Excel形式でのエクスポート（記録のみ）
  async exportRecordsAsExcel(): Promise<DatabaseResult<ArrayBuffer>> {
    try {
      const recordsResult = await fishingRecordService.getRecords();
      if (!recordsResult.success || !recordsResult.data) {
        return {
          success: false,
          error: {
            code: 'EXPORT_EXCEL_FAILED',
            message: 'Failed to get records for Excel export',
            details: recordsResult.error
          }
        };
      }

      // ワークブックの作成
      const workbook = XLSX.utils.book_new();

      // データの変換
      const worksheetData = recordsResult.data.map(record => ({
        'ID': record.id,
        'Date': record.date.toISOString().split('T')[0],
        'Location': record.location,
        'Fish Species': record.fishSpecies,
        'Size (cm)': record.size || '',
        'Weight (g)': record.weight || '',
        'Weather': record.weather || '',
        'Temperature (°C)': record.temperature || '',
        'Latitude': record.coordinates?.latitude || '',
        'Longitude': record.coordinates?.longitude || '',
        'GPS Accuracy': record.coordinates?.accuracy || '',
        'Notes': record.notes || '',
        'Created At': record.createdAt.toISOString(),
        'Updated At': record.updatedAt.toISOString()
      }));

      // ワークシートの作成
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // カラム幅の設定
      const columnWidths = [
        { wch: 36 }, // ID
        { wch: 12 }, // Date
        { wch: 20 }, // Location
        { wch: 15 }, // Fish Species
        { wch: 10 }, // Size
        { wch: 10 }, // Weight
        { wch: 10 }, // Weather
        { wch: 14 }, // Temperature
        { wch: 12 }, // Latitude
        { wch: 12 }, // Longitude
        { wch: 12 }, // GPS Accuracy
        { wch: 30 }, // Notes
        { wch: 20 }, // Created At
        { wch: 20 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // ワークブックにシートを追加
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fishing Records');

      // ArrayBufferに変換
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });

      return {
        success: true,
        data: excelBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_EXCEL_FAILED',
          message: 'Failed to export records as Excel',
          details: error
        }
      };
    }
  }

  // Excel形式からのインポート（記録のみ）
  async importRecordsFromExcel(arrayBuffer: ArrayBuffer): Promise<DatabaseResult<ImportResult>> {
    try {
      // ワークブックの読み込み
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // 最初のシートを取得
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          error: {
            code: 'INVALID_EXCEL_FORMAT',
            message: 'Excel file contains no sheets'
          }
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];

      // JSON に変換
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        return {
          success: false,
          error: {
            code: 'INVALID_EXCEL_FORMAT',
            message: 'Excel file must contain header and at least one data row'
          }
        };
      }

      // ヘッダー行の取得
      const headers = jsonData[0] as string[];

      // 必須カラムの検証
      const requiredColumns = ['Date', 'Location', 'Fish Species'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        return {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_COLUMNS',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            details: { missingColumns }
          }
        };
      }

      // カラムインデックスのマッピング
      const columnIndices = {
        date: headers.indexOf('Date'),
        location: headers.indexOf('Location'),
        fishSpecies: headers.indexOf('Fish Species'),
        size: headers.indexOf('Size (cm)'),
        weight: headers.indexOf('Weight (g)'),
        weather: headers.indexOf('Weather'),
        temperature: headers.indexOf('Temperature (°C)'),
        latitude: headers.indexOf('Latitude'),
        longitude: headers.indexOf('Longitude'),
        gpsAccuracy: headers.indexOf('GPS Accuracy'),
        notes: headers.indexOf('Notes')
      };

      let importedRecords = 0;
      let skippedItems = 0;
      const errors: string[] = [];

      // データ行の処理（ヘッダーをスキップ）
      for (let i = 1; i < jsonData.length; i++) {
        try {
          const row = jsonData[i] as any[];

          // 空行をスキップ
          if (!row || row.length === 0 || !row[columnIndices.date]) {
            continue;
          }

          // 日付の変換（Excelのシリアル番号対応）
          let dateValue: string;
          const rawDate = row[columnIndices.date];

          if (typeof rawDate === 'number') {
            // Excelのシリアル番号を日付に変換
            const excelDate = XLSX.SSF.parse_date_code(rawDate);
            dateValue = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
          } else if (typeof rawDate === 'string') {
            dateValue = rawDate;
          } else {
            errors.push(`Row ${i + 1}: Invalid date format`);
            skippedItems++;
            continue;
          }

          // バリデーション
          if (!row[columnIndices.location] || !row[columnIndices.fishSpecies]) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            skippedItems++;
            continue;
          }

          // 座標データの作成
          let coordinates = undefined;
          const latitude = this.parseExcelNumber(row[columnIndices.latitude]);
          const longitude = this.parseExcelNumber(row[columnIndices.longitude]);

          if (latitude !== null && longitude !== null) {
            coordinates = {
              latitude,
              longitude,
              accuracy: this.parseExcelNumber(row[columnIndices.gpsAccuracy]) || undefined,
              timestamp: new Date().toISOString()
            };
          }

          // 記録データの作成
          const createData = {
            date: dateValue,
            location: String(row[columnIndices.location]),
            fishSpecies: String(row[columnIndices.fishSpecies]),
            size: this.parseExcelNumber(row[columnIndices.size]) || undefined,
            weight: this.parseExcelNumber(row[columnIndices.weight]) || undefined,
            weather: row[columnIndices.weather] ? String(row[columnIndices.weather]) : undefined,
            temperature: this.parseExcelNumber(row[columnIndices.temperature]) || undefined,
            coordinates,
            notes: row[columnIndices.notes] ? String(row[columnIndices.notes]) : undefined,
            useGPS: false
          };

          // 記録の保存
          const createResult = await fishingRecordService.createRecord(createData);

          if (createResult.success) {
            importedRecords++;
          } else {
            errors.push(`Row ${i + 1}: Failed to import - ${createResult.error?.message}`);
            skippedItems++;
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: Failed to process - ${error}`);
          skippedItems++;
        }
      }

      const result: ImportResult = {
        success: errors.length === 0 || importedRecords > 0,
        importedRecords,
        importedPhotos: 0, // Excel does not include photos
        skippedItems,
        errors
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXCEL_IMPORT_FAILED',
          message: 'Failed to import Excel data',
          details: error
        }
      };
    }
  }

  // Excelセルの数値をパース
  private parseExcelNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  // ファイルダウンロード用のBlob作成
  createDownloadBlob(data: string | ArrayBuffer, mimeType: string): Blob {
    return new Blob([data], { type: mimeType });
  }

  // ファイルダウンロードの実行
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // プライベートメソッド: インポートデータの検証
  private validateImportData(data: unknown): DatabaseResult<void> {
    // 基本構造の確認
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA_FORMAT',
          message: 'Invalid data format'
        }
      };
    }

    // 型ガードでデータの型安全性を確保
    const importData = data as any;

    // 必須フィールドの確認
    if (!importData.version) {
      return {
        success: false,
        error: {
          code: 'MISSING_VERSION',
          message: 'Missing version information'
        }
      };
    }

    if (!Array.isArray(importData.records)) {
      return {
        success: false,
        error: {
          code: 'INVALID_RECORDS',
          message: 'Records must be an array'
        }
      };
    }

    if (!Array.isArray(importData.photos)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PHOTOS',
          message: 'Photos must be an array'
        }
      };
    }

    if (!importData.settings || typeof importData.settings !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_SETTINGS',
          message: 'Settings must be an object'
        }
      };
    }

    // バージョン互換性の確認
    if (importData.version !== '1.0.0') {
      console.warn(`Importing from different version: ${importData.version}`);
    }

    return { success: true };
  }
}

// サービスインスタンスのシングルトン
export const exportImportService = new ExportImportService();