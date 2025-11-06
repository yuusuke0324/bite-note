/**
 * 魚種ユーザー入力バリデーター
 *
 * @description
 * ユーザーが新しい魚種を登録する際の入力検証
 * データ品質の維持と不適切なコンテンツの防止
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import type {
  UserSpeciesValidationRules,
  UserSpeciesValidationResult,
  UserSpeciesValidationError
} from '../../types';

/**
 * デフォルトバリデーションルール
 */
const DEFAULT_VALIDATION_RULES: UserSpeciesValidationRules = {
  standardName: {
    minLength: 2,
    maxLength: 20,
    pattern: /^[ぁ-んァ-ヶー一-龠々\u3001-\u303F\u4E00-\u9FFF]+$/,  // 日本語（ひらがな、カタカナ、漢字拡張、句読点）全角スペース除外
    forbiddenWords: [
      'テスト', 'test', 'TEST',
      'あああ', 'アアア',
      'zzz', 'ZZZ',
      '削除', '消去',
      'debug', 'DEBUG'
    ]
  },
  maxUserSpecies: 100,
  sanitization: {
    trim: true,
    removeSpecialChars: false
  }
};

/**
 * エラーメッセージマップ
 */
const ERROR_MESSAGES: Record<UserSpeciesValidationError['code'], string> = {
  'TOO_SHORT': '魚種名は2文字以上で入力してください',
  'TOO_LONG': '魚種名は20文字以内で入力してください',
  'INVALID_PATTERN': '日本語（ひらがな・カタカナ・漢字）で入力してください',
  'FORBIDDEN_WORD': '不適切な単語が含まれています',
  'MAX_SPECIES_REACHED': '登録可能な魚種数の上限（100種）に達しています',
  'DUPLICATE_NAME': 'この魚種名は既に登録されています'
};

/**
 * 魚種バリデータークラス
 */
export class FishSpeciesValidator {
  private rules: UserSpeciesValidationRules;

  constructor(rules: Partial<UserSpeciesValidationRules> = {}) {
    this.rules = {
      ...DEFAULT_VALIDATION_RULES,
      ...rules,
      standardName: {
        ...DEFAULT_VALIDATION_RULES.standardName,
        ...rules.standardName
      },
      sanitization: {
        ...DEFAULT_VALIDATION_RULES.sanitization,
        ...rules.sanitization
      }
    };
  }

  /**
   * 魚種名をバリデーション
   *
   * @param input - 入力された魚種名
   * @param existingNames - 既存の魚種名リスト（重複チェック用）
   * @returns バリデーション結果
   */
  validate(input: string, existingNames: string[] = []): UserSpeciesValidationResult {
    // サニタイゼーション
    let sanitized = input;

    if (this.rules.sanitization.trim) {
      sanitized = sanitized.trim();
    }

    if (this.rules.sanitization.removeSpecialChars) {
      // 特殊文字を削除（ただし、日本語の句読点は保持）
      sanitized = sanitized.replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F]/g, '');
    }

    // 文字数チェック（最小）
    if (sanitized.length < this.rules.standardName.minLength) {
      return {
        valid: false,
        error: {
          code: 'TOO_SHORT',
          message: ERROR_MESSAGES['TOO_SHORT'],
          details: `入力: ${sanitized.length}文字, 最小: ${this.rules.standardName.minLength}文字`
        }
      };
    }

    // 文字数チェック（最大）
    if (sanitized.length > this.rules.standardName.maxLength) {
      return {
        valid: false,
        error: {
          code: 'TOO_LONG',
          message: ERROR_MESSAGES['TOO_LONG'],
          details: `入力: ${sanitized.length}文字, 最大: ${this.rules.standardName.maxLength}文字`
        }
      };
    }

    // 禁止語チェック（パターンチェックより先に実行）
    const lowerInput = sanitized.toLowerCase();
    for (const word of this.rules.standardName.forbiddenWords) {
      if (lowerInput.includes(word.toLowerCase())) {
        return {
          valid: false,
          error: {
            code: 'FORBIDDEN_WORD',
            message: ERROR_MESSAGES['FORBIDDEN_WORD'],
            details: `禁止語: ${word}`
          }
        };
      }
    }

    // パターンチェック（日本語のみ）
    if (!this.rules.standardName.pattern.test(sanitized)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PATTERN',
          message: ERROR_MESSAGES['INVALID_PATTERN'],
          details: '許可されている文字: ひらがな、カタカナ、漢字'
        }
      };
    }

    // 重複チェック
    const normalizedExisting = existingNames.map(n => n.toLowerCase().trim());
    if (normalizedExisting.includes(sanitized.toLowerCase())) {
      return {
        valid: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: ERROR_MESSAGES['DUPLICATE_NAME'],
          details: `既存の魚種名: ${sanitized}`
        }
      };
    }

    // バリデーション成功
    return {
      valid: true,
      sanitizedValue: sanitized
    };
  }

  /**
   * ユーザー登録魚種数の上限チェック
   *
   * @param currentCount - 現在のユーザー登録魚種数
   * @returns チェック結果
   */
  checkSpeciesLimit(currentCount: number): UserSpeciesValidationResult {
    if (currentCount >= this.rules.maxUserSpecies) {
      return {
        valid: false,
        error: {
          code: 'MAX_SPECIES_REACHED',
          message: ERROR_MESSAGES['MAX_SPECIES_REACHED'],
          details: `現在: ${currentCount}種, 上限: ${this.rules.maxUserSpecies}種`
        }
      };
    }

    return {
      valid: true
    };
  }

  /**
   * バリデーションルールを取得
   */
  getRules(): UserSpeciesValidationRules {
    return {
      ...this.rules,
      standardName: { ...this.rules.standardName },
      sanitization: { ...this.rules.sanitization }
    };
  }

  /**
   * バリデーションルールを更新
   */
  updateRules(newRules: Partial<UserSpeciesValidationRules>): void {
    this.rules = {
      ...this.rules,
      ...newRules,
      standardName: {
        ...this.rules.standardName,
        ...newRules.standardName
      },
      sanitization: {
        ...this.rules.sanitization,
        ...newRules.sanitization
      }
    };
  }
}

/**
 * シングルトンインスタンス
 */
export const fishSpeciesValidator = new FishSpeciesValidator();
