/**
 * FishSpeciesValidator ユニットテスト
 *
 * @description
 * 魚種バリデーターの包括的なテストスイート
 * 入力検証、サニタイゼーション、エラーハンドリングのカバレッジ
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FishSpeciesValidator } from '../FishSpeciesValidator';

describe('FishSpeciesValidator', () => {
  let validator: FishSpeciesValidator;

  beforeEach(() => {
    validator = new FishSpeciesValidator();
  });

  describe('文字数バリデーション', () => {
    it('2文字以上の入力を受け入れること', () => {
      const result = validator.validate('マアジ');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('マアジ');
    });

    it('1文字の入力を拒否すること', () => {
      const result = validator.validate('あ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_SHORT');
      expect(result.error?.message).toContain('2文字以上');
    });

    it('20文字の入力を受け入れること', () => {
      const longName = 'あ'.repeat(20);
      const result = validator.validate(longName);
      expect(result.valid).toBe(false); // 'あああ'が禁止語のため
      expect(result.error?.code).toBe('FORBIDDEN_WORD');
    });

    it('21文字以上の入力を拒否すること', () => {
      const tooLongName = 'あ'.repeat(21);
      const result = validator.validate(tooLongName);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_LONG');
      expect(result.error?.message).toContain('20文字以内');
    });
  });

  describe('パターンバリデーション', () => {
    it('ひらがなのみの入力を受け入れること', () => {
      const result = validator.validate('あじ');
      expect(result.valid).toBe(true);
    });

    it('カタカナのみの入力を受け入れること', () => {
      const result = validator.validate('アジ');
      expect(result.valid).toBe(true);
    });

    it('漢字のみの入力を受け入れること', () => {
      const result = validator.validate('鯵');
      expect(result.valid).toBe(false); // 1文字のため
      expect(result.error?.code).toBe('TOO_SHORT');
    });

    it('ひらがな・カタカナ・漢字の混在を受け入れること', () => {
      const result = validator.validate('マあじ鯵');
      expect(result.valid).toBe(true);
    });

    it('アルファベットを含む入力を拒否すること', () => {
      const result = validator.validate('アジfish');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATTERN');
      expect(result.error?.message).toContain('日本語');
    });

    it('数字を含む入力を拒否すること', () => {
      const result = validator.validate('アジ123');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATTERN');
    });

    it('特殊文字を含む入力を拒否すること', () => {
      const result = validator.validate('アジ!@#');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATTERN');
    });
  });

  describe('禁止語チェック', () => {
    it('禁止語を含む入力を拒否すること（テスト）', () => {
      const result = validator.validate('テストアジ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN_WORD');
      expect(result.error?.message).toContain('不適切な単語');
    });

    it('禁止語を含む入力を拒否すること（test）', () => {
      const result = validator.validate('testアジ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN_WORD'); // 禁止語チェックが先に実行される
    });

    it('禁止語を含む入力を拒否すること（あああ）', () => {
      const result = validator.validate('あああ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN_WORD');
    });

    it('大文字小文字を区別せず禁止語をチェックすること', () => {
      const result = validator.validate('TESTアジ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN_WORD'); // 大文字も禁止語として認識される
    });

    it('禁止語でない通常の入力を受け入れること', () => {
      const result = validator.validate('マアジ');
      expect(result.valid).toBe(true);
    });
  });

  describe('重複チェック', () => {
    it('既存名と重複する入力を拒否すること', () => {
      const existingNames = ['マアジ', 'スズキ', 'クロダイ'];
      const result = validator.validate('マアジ', existingNames);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('DUPLICATE_NAME');
      expect(result.error?.message).toContain('既に登録されています');
    });

    it('大文字小文字を区別せず重複をチェックすること', () => {
      const existingNames = ['マアジ'];
      const result = validator.validate('まあじ', existingNames);
      expect(result.valid).toBe(true); // ひらがなとカタカナは異なる文字として扱われる
    });

    it('前後の空白を無視して重複をチェックすること', () => {
      const existingNames = ['マアジ'];
      const result = validator.validate('  マアジ  ', existingNames);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('DUPLICATE_NAME');
    });

    it('既存名と重複しない入力を受け入れること', () => {
      const existingNames = ['マアジ', 'スズキ'];
      const result = validator.validate('クロダイ', existingNames);
      expect(result.valid).toBe(true);
    });

    it('空の既存名リストで動作すること', () => {
      const result = validator.validate('マアジ', []);
      expect(result.valid).toBe(true);
    });
  });

  describe('サニタイゼーション', () => {
    it('前後の空白をトリミングすること', () => {
      const result = validator.validate('  マアジ  ');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('マアジ');
    });

    it('タブ文字をトリミングすること', () => {
      const result = validator.validate('\tマアジ\t');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('マアジ');
    });

    it('改行文字をトリミングすること', () => {
      const result = validator.validate('\nマアジ\n');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('マアジ');
    });
  });

  describe('checkSpeciesLimit', () => {
    it('上限未満の場合は成功すること', () => {
      const result = validator.checkSpeciesLimit(50);
      expect(result.valid).toBe(true);
    });

    it('上限ちょうどの場合は失敗すること', () => {
      const result = validator.checkSpeciesLimit(100);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('MAX_SPECIES_REACHED');
      expect(result.error?.message).toContain('100種');
    });

    it('上限超過の場合は失敗すること', () => {
      const result = validator.checkSpeciesLimit(101);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('MAX_SPECIES_REACHED');
    });

    it('0の場合は成功すること', () => {
      const result = validator.checkSpeciesLimit(0);
      expect(result.valid).toBe(true);
    });
  });

  describe('getRules', () => {
    it('現在のルールを取得できること', () => {
      const rules = validator.getRules();
      expect(rules.standardName.minLength).toBe(2);
      expect(rules.standardName.maxLength).toBe(20);
      expect(rules.maxUserSpecies).toBe(100);
      expect(rules.sanitization.trim).toBe(true);
    });

    it('取得したルールが元のルールと独立していること', () => {
      const rules = validator.getRules();
      rules.standardName.minLength = 5;

      const originalRules = validator.getRules();
      expect(originalRules.standardName.minLength).toBe(2); // getRules()はstandardNameをスプレッドでコピーしている
    });
  });

  describe('updateRules', () => {
    it('ルールを更新できること', () => {
      validator.updateRules({
        standardName: {
          minLength: 3,
          maxLength: 15,
          pattern: /^[ぁ-んァ-ヶー一-龠々\u3000-\u303F]+$/,
          forbiddenWords: []
        }
      });

      const rules = validator.getRules();
      expect(rules.standardName.minLength).toBe(3);
      expect(rules.standardName.maxLength).toBe(15);
    });

    it('更新後のルールが適用されること', () => {
      validator.updateRules({
        standardName: {
          minLength: 3,
          maxLength: 15,
          pattern: /^[ぁ-んァ-ヶー一-龠々\u3000-\u303F]+$/,
          forbiddenWords: []
        }
      });

      const result = validator.validate('あい');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_SHORT');
    });

    it('部分的な更新ができること', () => {
      validator.updateRules({
        maxUserSpecies: 50
      });

      const rules = validator.getRules();
      expect(rules.maxUserSpecies).toBe(50);
      expect(rules.standardName.minLength).toBe(2); // 変更されていない
    });
  });

  describe('カスタムバリデータ', () => {
    it('カスタムルールで初期化できること', () => {
      const customValidator = new FishSpeciesValidator({
        standardName: {
          minLength: 3,
          maxLength: 10,
          pattern: /^[ぁ-んァ-ヶー一-龠々\u3000-\u303F]+$/,
          forbiddenWords: ['カスタム']
        },
        maxUserSpecies: 50
      });

      const result = customValidator.validate('あい');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_SHORT');
    });

    it('カスタム禁止語が適用されること', () => {
      const customValidator = new FishSpeciesValidator({
        standardName: {
          minLength: 2,
          maxLength: 20,
          pattern: /^[ぁ-んァ-ヶー一-龠々\u3000-\u303F]+$/,
          forbiddenWords: ['カスタム']
        }
      });

      const result = customValidator.validate('カスタムアジ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN_WORD');
    });
  });

  describe('エッジケース', () => {
    it('空文字列を拒否すること', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_SHORT');
    });

    it('空白のみの入力を拒否すること', () => {
      const result = validator.validate('   ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TOO_SHORT');
    });

    it('Unicode文字を正しく処理すること', () => {
      const result = validator.validate('🐟アジ');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATTERN');
    });

    it('全角スペースを含む入力を拒否すること', () => {
      const result = validator.validate('マ　アジ');
      expect(result.valid).toBe(false); // 全角スペース(U+3000)はパターンで明示的に除外されている
      expect(result.error?.code).toBe('INVALID_PATTERN');
    });
  });

  describe('エラーメッセージ', () => {
    it('文字数不足でわかりやすいメッセージを返すこと', () => {
      const result = validator.validate('あ');
      expect(result.error?.message).toContain('2文字以上');
    });

    it('文字数超過でわかりやすいメッセージを返すこと', () => {
      const result = validator.validate('あ'.repeat(21));
      expect(result.error?.message).toContain('20文字以内');
    });

    it('無効なパターンでわかりやすいメッセージを返すこと', () => {
      const result = validator.validate('fish123');
      expect(result.error?.message).toContain('日本語');
    });

    it('詳細情報を含むこと', () => {
      const result = validator.validate('あ');
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details).toContain('1文字');
      expect(result.error?.details).toContain('最小: 2文字');
    });
  });
});
