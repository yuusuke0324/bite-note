/**
 * fishColors ユーティリティ単体テスト
 *
 * @description
 * 魚種別背景色定義のテストスイート。
 * 色取得、アイコン種別判定、部分一致検索を検証。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import { describe, it, expect } from 'vitest';
import {
  FISH_COLORS,
  DEFAULT_FISH_COLOR,
  getFishColor,
  getFishIconType,
  getAllFishSpecies,
} from '../fishColors';

describe('fishColors', () => {
  describe('FISH_COLORS constant', () => {
    it('contains expected fish species', () => {
      expect(FISH_COLORS).toHaveProperty('シーバス');
      expect(FISH_COLORS).toHaveProperty('マダイ');
      expect(FISH_COLORS).toHaveProperty('アジ');
      expect(FISH_COLORS).toHaveProperty('メバル');
      expect(FISH_COLORS).toHaveProperty('アオリイカ');
      expect(FISH_COLORS).toHaveProperty('ブリ');
    });

    it('each species has light and dark color', () => {
      Object.values(FISH_COLORS).forEach((config) => {
        expect(config).toHaveProperty('light');
        expect(config).toHaveProperty('dark');
        expect(typeof config.light).toBe('string');
        expect(typeof config.dark).toBe('string');
      });
    });

    it('colors are valid hex values', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(FISH_COLORS).forEach((config) => {
        expect(config.light).toMatch(hexRegex);
        expect(config.dark).toMatch(hexRegex);
      });
    });
  });

  describe('DEFAULT_FISH_COLOR constant', () => {
    it('has light and dark colors', () => {
      expect(DEFAULT_FISH_COLOR).toHaveProperty('light');
      expect(DEFAULT_FISH_COLOR).toHaveProperty('dark');
    });

    it('colors are valid hex values', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(DEFAULT_FISH_COLOR.light).toMatch(hexRegex);
      expect(DEFAULT_FISH_COLOR.dark).toMatch(hexRegex);
    });
  });

  describe('getFishColor', () => {
    describe('Light Mode', () => {
      it('returns correct color for Seabass', () => {
        expect(getFishColor('シーバス', false)).toBe(FISH_COLORS['シーバス'].light);
      });

      it('returns correct color for Red Sea Bream', () => {
        expect(getFishColor('マダイ', false)).toBe(FISH_COLORS['マダイ'].light);
      });

      it('returns correct color for Horse Mackerel', () => {
        expect(getFishColor('アジ', false)).toBe(FISH_COLORS['アジ'].light);
      });

      it('returns correct color for Rockfish', () => {
        expect(getFishColor('メバル', false)).toBe(FISH_COLORS['メバル'].light);
      });

      it('returns correct color for Bigfin Reef Squid', () => {
        expect(getFishColor('アオリイカ', false)).toBe(FISH_COLORS['アオリイカ'].light);
      });

      it('returns correct color for Yellowtail', () => {
        expect(getFishColor('ブリ', false)).toBe(FISH_COLORS['ブリ'].light);
      });

      it('returns default color for unknown species', () => {
        expect(getFishColor('未知の魚', false)).toBe(DEFAULT_FISH_COLOR.light);
      });
    });

    describe('Dark Mode', () => {
      it('returns brighter color for Seabass in dark mode', () => {
        expect(getFishColor('シーバス', true)).toBe(FISH_COLORS['シーバス'].dark);
      });

      it('returns brighter color for Red Sea Bream in dark mode', () => {
        expect(getFishColor('マダイ', true)).toBe(FISH_COLORS['マダイ'].dark);
      });

      it('returns default dark color for unknown species', () => {
        expect(getFishColor('未知の魚', true)).toBe(DEFAULT_FISH_COLOR.dark);
      });
    });

    describe('Partial Matching', () => {
      it('matches species name containing defined key: シーバス（セイゴ）', () => {
        expect(getFishColor('シーバス（セイゴ）', false)).toBe(FISH_COLORS['シーバス'].light);
      });

      it('matches species name with suffix: マダイ 40cm', () => {
        expect(getFishColor('マダイ 40cm', false)).toBe(FISH_COLORS['マダイ'].light);
      });

      it('matches species name with prefix: 大きいブリ', () => {
        expect(getFishColor('大きいブリ', false)).toBe(FISH_COLORS['ブリ'].light);
      });

      it('matches alias: セイゴ (alias of シーバス)', () => {
        expect(getFishColor('セイゴ', false)).toBe(FISH_COLORS['セイゴ'].light);
      });

      it('matches alias: フッコ (alias of シーバス)', () => {
        expect(getFishColor('フッコ', false)).toBe(FISH_COLORS['フッコ'].light);
      });
    });

    describe('Color Categories', () => {
      it('teal category for Seabass family', () => {
        const tealColor = FISH_COLORS['シーバス'].light;
        expect(getFishColor('シーバス', false)).toBe(tealColor);
        expect(getFishColor('スズキ', false)).toBe(tealColor);
        expect(getFishColor('セイゴ', false)).toBe(tealColor);
      });

      it('red category for Sea Bream family', () => {
        const redColor = FISH_COLORS['マダイ'].light;
        expect(getFishColor('マダイ', false)).toBe(redColor);
        expect(getFishColor('チヌ', false)).toBe(redColor);
        expect(getFishColor('クロダイ', false)).toBe(redColor);
      });

      it('blue category for pelagic fish', () => {
        const blueColor = FISH_COLORS['アジ'].light;
        expect(getFishColor('アジ', false)).toBe(blueColor);
        expect(getFishColor('サバ', false)).toBe(blueColor);
      });

      it('purple-pink category for squid/octopus', () => {
        const purpleColor = FISH_COLORS['アオリイカ'].light;
        expect(getFishColor('アオリイカ', false)).toBe(purpleColor);
        expect(getFishColor('ヤリイカ', false)).toBe(purpleColor);
        expect(getFishColor('マダコ', false)).toBe(purpleColor);
      });

      it('cyan category for migratory fish', () => {
        const cyanColor = FISH_COLORS['ブリ'].light;
        expect(getFishColor('ブリ', false)).toBe(cyanColor);
        expect(getFishColor('カンパチ', false)).toBe(cyanColor);
        expect(getFishColor('ヒラマサ', false)).toBe(cyanColor);
      });
    });
  });

  describe('getFishIconType', () => {
    describe('Returns "squid" for squid/octopus', () => {
      it('returns "squid" for Bigfin Reef Squid (アオリイカ)', () => {
        expect(getFishIconType('アオリイカ')).toBe('squid');
      });

      it('returns "squid" for Spear Squid (ヤリイカ)', () => {
        expect(getFishIconType('ヤリイカ')).toBe('squid');
      });

      it('returns "squid" for Common Cuttlefish (コウイカ)', () => {
        expect(getFishIconType('コウイカ')).toBe('squid');
      });

      it('returns "squid" for Octopus (マダコ)', () => {
        expect(getFishIconType('マダコ')).toBe('squid');
      });

      it('returns "squid" for partial match containing "イカ"', () => {
        expect(getFishIconType('大きいアオリイカ')).toBe('squid');
      });

      it('returns "squid" for partial match containing "タコ"', () => {
        expect(getFishIconType('小さいタコ')).toBe('squid');
      });
    });

    describe('Returns "fish" for fish species', () => {
      it('returns "fish" for Seabass (シーバス)', () => {
        expect(getFishIconType('シーバス')).toBe('fish');
      });

      it('returns "fish" for Red Sea Bream (マダイ)', () => {
        expect(getFishIconType('マダイ')).toBe('fish');
      });

      it('returns "fish" for Horse Mackerel (アジ)', () => {
        expect(getFishIconType('アジ')).toBe('fish');
      });

      it('returns "fish" for Yellowtail (ブリ)', () => {
        expect(getFishIconType('ブリ')).toBe('fish');
      });

      it('returns "fish" for unknown species', () => {
        expect(getFishIconType('未知の魚')).toBe('fish');
      });

      it('returns "fish" for empty string', () => {
        expect(getFishIconType('')).toBe('fish');
      });
    });
  });

  describe('getAllFishSpecies', () => {
    it('returns array of species names', () => {
      const species = getAllFishSpecies();
      expect(Array.isArray(species)).toBe(true);
      expect(species.length).toBeGreaterThan(0);
    });

    it('includes common species', () => {
      const species = getAllFishSpecies();
      expect(species).toContain('シーバス');
      expect(species).toContain('マダイ');
      expect(species).toContain('アジ');
      expect(species).toContain('メバル');
      expect(species).toContain('アオリイカ');
      expect(species).toContain('ブリ');
    });

    it('matches FISH_COLORS keys', () => {
      const species = getAllFishSpecies();
      const colorKeys = Object.keys(FISH_COLORS);
      expect(species.sort()).toEqual(colorKeys.sort());
    });
  });
});
