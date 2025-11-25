/**
 * アクセシビリティテスト用ユーティリティ
 *
 * WCAG 2.1 AA準拠のテストをサポートするヘルパー関数群
 *
 * @see https://www.w3.org/WAI/WCAG21/quickref/
 */

import { RenderResult } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// jest-axeのマッチャーを拡張
expect.extend(toHaveNoViolations);

/**
 * コンポーネントにアクセシビリティ違反がないことを検証
 *
 * @param view - React Testing Libraryのrender結果
 * @param rules - 除外するルール（オプション）
 */
export async function expectNoA11yViolations(
  view: RenderResult,
  rules?: string[]
): Promise<void> {
  const results = await axe(view.container, {
    rules: rules?.reduce(
      (acc, rule) => ({ ...acc, [rule]: { enabled: false } }),
      {}
    ),
  });
  expect(results).toHaveNoViolations();
}

/**
 * 要素のaria-selected属性を検証
 *
 * @param element - 検証対象の要素
 * @param value - 期待する値（true/false）
 */
export function expectAriaSelected(element: HTMLElement, value: boolean): void {
  expect(element).toHaveAttribute('aria-selected', String(value));
}

/**
 * 要素がタブパターンの要件を満たすことを検証
 * WAI-ARIA Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * @param element - 検証対象の要素
 */
export function expectTabPattern(element: HTMLElement): void {
  expect(element).toHaveAttribute('role', 'tab');
  expect(element).toHaveAttribute('aria-selected');
}

/**
 * タブリストパターンの要件を検証
 *
 * @param element - 検証対象のタブリスト要素
 */
export function expectTablistPattern(element: HTMLElement): void {
  expect(element).toHaveAttribute('role', 'tablist');
}

/**
 * 要素がフォーカス可能であることを検証
 *
 * @param element - 検証対象の要素
 */
export function expectFocusable(element: HTMLElement): void {
  const tabIndex = element.getAttribute('tabindex');
  const isNativelyFocusable = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
    element.tagName
  );

  if (!isNativelyFocusable) {
    expect(tabIndex).not.toBeNull();
    expect(Number(tabIndex)).toBeGreaterThanOrEqual(0);
  }
}

/**
 * インタラクティブ要素がキーボードアクセシブルであることを検証
 *
 * @param element - 検証対象の要素
 */
export function expectKeyboardAccessible(element: HTMLElement): void {
  const hasClickHandler = element.onclick !== null;
  const hasKeyHandler = element.onkeydown !== null || element.onkeyup !== null;

  if (hasClickHandler) {
    // インタラクティブな要素はキーボードハンドラも必要
    expect(hasKeyHandler || element.tagName === 'BUTTON' || element.tagName === 'A').toBe(true);
  }
}

/**
 * 画像にalt属性が設定されていることを検証
 *
 * @param element - 検証対象のimg要素
 * @param expectNonEmpty - 空でないaltを期待するか（装飾画像の場合はfalse）
 */
export function expectAltText(element: HTMLElement, expectNonEmpty = true): void {
  expect(element.tagName).toBe('IMG');
  expect(element).toHaveAttribute('alt');

  if (expectNonEmpty) {
    const alt = element.getAttribute('alt');
    expect(alt).not.toBe('');
  }
}

/**
 * フォームコントロールにラベルが関連付けられていることを検証
 *
 * @param input - 検証対象のフォームコントロール
 * @param labelText - 期待するラベルテキスト（オプション）
 */
export function expectLabeledControl(
  input: HTMLElement,
  labelText?: string
): void {
  const id = input.getAttribute('id');
  const ariaLabel = input.getAttribute('aria-label');
  const ariaLabelledBy = input.getAttribute('aria-labelledby');

  // いずれかの方法でラベル付けされている必要がある
  const hasLabel = id !== null || ariaLabel !== null || ariaLabelledBy !== null;
  expect(hasLabel).toBe(true);

  if (labelText && id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      expect(label.textContent).toContain(labelText);
    }
  }
}

/**
 * モーダル/ダイアログのアクセシビリティ要件を検証
 *
 * @param element - 検証対象のダイアログ要素
 */
export function expectDialogPattern(element: HTMLElement): void {
  expect(element).toHaveAttribute('role', 'dialog');
  expect(element).toHaveAttribute('aria-modal', 'true');

  // aria-labelledbyまたはaria-labelが必要
  const hasLabel =
    element.hasAttribute('aria-labelledby') || element.hasAttribute('aria-label');
  expect(hasLabel).toBe(true);
}

/**
 * ライブリージョンの設定を検証
 * スクリーンリーダーへの動的コンテンツ通知用
 *
 * @param element - 検証対象の要素
 * @param politeness - 期待するaria-live値
 */
export function expectLiveRegion(
  element: HTMLElement,
  politeness: 'polite' | 'assertive' = 'polite'
): void {
  expect(element).toHaveAttribute('aria-live', politeness);
}

/**
 * アクセシビリティテスト用のaxe設定
 * プロジェクト標準の設定を提供
 */
export const defaultAxeConfig = {
  rules: {
    // 動的コンテンツのテストでは一時的に無効化が必要な場合がある
    'color-contrast': { enabled: true },
    // ページ全体のランドマークはコンポーネントテストでは除外
    region: { enabled: false },
  },
};

/**
 * コンポーネントテスト用のaxeチェックを実行
 *
 * @param container - テスト対象のコンテナ要素
 * @returns axeの結果
 */
export async function runA11yCheck(container: HTMLElement) {
  return axe(container, defaultAxeConfig);
}
