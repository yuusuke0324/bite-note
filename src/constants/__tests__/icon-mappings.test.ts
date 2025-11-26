import { describe, it, expect } from 'vitest';
import {
  ICON_MAPPINGS,
  getIconsByCategory,
  getIconFromEmoji,
  getIconMapping,
  getAllCategories,
  getIconMappingsCount,
} from '../icon-mappings';
import { Fish, Search, Waves } from 'lucide-react';

describe('icon-mappings', () => {
  describe('ICON_MAPPINGS定数', () => {
    it('50種類以上のアイコンマッピングが定義されている', () => {
      const count = Object.keys(ICON_MAPPINGS).length;
      expect(count).toBeGreaterThanOrEqual(50);
    });

    it('各マッピングに必須プロパティが含まれている', () => {
      Object.entries(ICON_MAPPINGS).forEach(([emoji, mapping]) => {
        expect(mapping.icon).toBeDefined();
        expect(mapping.description).toBeDefined();
        expect(mapping.category).toBeDefined();
        expect(typeof mapping.description).toBe('string');
        expect(['navigation', 'data', 'action', 'weather', 'status', 'other']).toContain(
          mapping.category
        );
      });
    });

    it('釣りアプリに必要な基本アイコンが含まれている', () => {
      // 釣り・魚種
      expect(ICON_MAPPINGS['🎣']).toBeDefined();
      expect(ICON_MAPPINGS['🐟']).toBeDefined();

      // ナビゲーション
      expect(ICON_MAPPINGS['🏠']).toBeDefined();
      expect(ICON_MAPPINGS['📊']).toBeDefined();
      expect(ICON_MAPPINGS['⚙️']).toBeDefined();

      // データ項目
      expect(ICON_MAPPINGS['📍']).toBeDefined();
      expect(ICON_MAPPINGS['📅']).toBeDefined();
      expect(ICON_MAPPINGS['📏']).toBeDefined();

      // 天気・潮汐
      expect(ICON_MAPPINGS['🌊']).toBeDefined();
      expect(ICON_MAPPINGS['🌤️']).toBeDefined();

      // アクション
      expect(ICON_MAPPINGS['🔍']).toBeDefined();
      expect(ICON_MAPPINGS['💾']).toBeDefined();
      expect(ICON_MAPPINGS['🗑️']).toBeDefined();

      // ステータス
      expect(ICON_MAPPINGS['✅']).toBeDefined();
      expect(ICON_MAPPINGS['⚠️']).toBeDefined();
    });
  });

  describe('getIconsByCategory', () => {
    it('navigationカテゴリのアイコンを取得できる', () => {
      const navIcons = getIconsByCategory('navigation');
      expect(Object.keys(navIcons).length).toBeGreaterThan(0);

      Object.values(navIcons).forEach((mapping) => {
        expect(mapping.category).toBe('navigation');
      });
    });

    it('dataカテゴリのアイコンを取得できる', () => {
      const dataIcons = getIconsByCategory('data');
      expect(Object.keys(dataIcons).length).toBeGreaterThan(0);

      Object.values(dataIcons).forEach((mapping) => {
        expect(mapping.category).toBe('data');
      });
    });

    it('全カテゴリで重複なくマッピングが分類されている', () => {
      const allCategories = getAllCategories();
      const allEmojis = new Set<string>();

      allCategories.forEach((category) => {
        const icons = getIconsByCategory(category);
        Object.keys(icons).forEach((emoji) => {
          expect(allEmojis.has(emoji)).toBe(false);
          allEmojis.add(emoji);
        });
      });

      expect(allEmojis.size).toBe(getIconMappingsCount());
    });
  });

  describe('getIconFromEmoji', () => {
    it('存在する絵文字からアイコンを取得できる', () => {
      const fishIcon = getIconFromEmoji('🐟');
      expect(fishIcon).toBe(Fish);
    });

    it('検索アイコンを取得できる', () => {
      const searchIcon = getIconFromEmoji('🔍');
      expect(searchIcon).toBe(Search);
    });

    it('存在しない絵文字はundefinedを返す', () => {
      const result = getIconFromEmoji('🦄');
      expect(result).toBeUndefined();
    });
  });

  describe('getIconMapping', () => {
    it('存在する絵文字からマッピング情報を取得できる', () => {
      const mapping = getIconMapping('🌊');
      expect(mapping).toBeDefined();
      expect(mapping?.icon).toBe(Waves);
      expect(mapping?.description).toBe('潮汐・海・大潮');
      expect(mapping?.category).toBe('weather');
    });

    it('代替アイコンが定義されているマッピングを取得できる', () => {
      const mapping = getIconMapping('🎣');
      expect(mapping?.alternativeIcon).toBeDefined();
    });

    it('存在しない絵文字はundefinedを返す', () => {
      const result = getIconMapping('❓');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllCategories', () => {
    it('全カテゴリを取得できる', () => {
      const categories = getAllCategories();
      expect(categories).toContain('navigation');
      expect(categories).toContain('data');
      expect(categories).toContain('action');
      expect(categories).toContain('weather');
      expect(categories).toContain('status');
      expect(categories).toContain('other');
    });

    it('重複がない', () => {
      const categories = getAllCategories();
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });
  });

  describe('getIconMappingsCount', () => {
    it('正確なマッピング数を返す', () => {
      const count = getIconMappingsCount();
      expect(count).toBe(Object.keys(ICON_MAPPINGS).length);
    });
  });
});
