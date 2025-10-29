/**
 * TASK-101: 動的縦軸スケール調整機能
 * ScaleRenderer テストファイル (RED フェーズ)
 */

import { describe, it, expect } from 'vitest';
import { ScaleRenderer } from '../../../utils/scale/ScaleRenderer';
import type { DynamicScale } from '../../../types/scale';

describe('ScaleRenderer', () => {
  describe('levelToSVGY', () => {
    it('should convert tide level to SVG Y coordinate', () => {
      const scale: DynamicScale = {
        min: -200,
        max: 200,
        interval: 100,
        ticks: [-200, -100, 0, 100, 200],
        unit: 'cm'
      };
      const svgHeight = 400;

      const renderer = new ScaleRenderer(scale, svgHeight);

      expect(renderer.levelToSVGY(200)).toBe(0);     // 最大値はSVG上端
      expect(renderer.levelToSVGY(0)).toBe(200);     // 中央値はSVG中央
      expect(renderer.levelToSVGY(-200)).toBe(400);  // 最小値はSVG下端
    });

    it('should handle values outside scale range', () => {
      const scale: DynamicScale = {
        min: -100,
        max: 100,
        interval: 50,
        ticks: [-100, -50, 0, 50, 100],
        unit: 'cm'
      };
      const svgHeight = 300;

      const renderer = new ScaleRenderer(scale, svgHeight);

      // 範囲外の値でも適切にクリップされる
      expect(renderer.levelToSVGY(150)).toBeLessThanOrEqual(0);
      expect(renderer.levelToSVGY(-150)).toBeGreaterThanOrEqual(300);
    });
  });

  describe('generateTickLabels', () => {
    it('should generate properly formatted tick labels', () => {
      const scale: DynamicScale = {
        min: -150,
        max: 250,
        interval: 50,
        ticks: [-150, -100, -50, 0, 50, 100, 150, 200, 250],
        unit: 'cm'
      };

      const renderer = new ScaleRenderer(scale, 400);
      const labels = renderer.generateTickLabels();

      expect(labels).toEqual([
        '-150cm', '-100cm', '-50cm', '0cm', '50cm', '100cm', '150cm', '200cm', '250cm'
      ]);
    });

    it('should handle decimal values in labels', () => {
      const scale: DynamicScale = {
        min: -75,
        max: 125,
        interval: 25,
        ticks: [-75, -50, -25, 0, 25, 50, 75, 100, 125],
        unit: 'cm'
      };

      const renderer = new ScaleRenderer(scale, 300);
      const labels = renderer.generateTickLabels();

      expect(labels).toEqual([
        '-75cm', '-50cm', '-25cm', '0cm', '25cm', '50cm', '75cm', '100cm', '125cm'
      ]);
    });
  });

  describe('generateSVGElements', () => {
    it('should generate SVG tick elements', () => {
      const scale: DynamicScale = {
        min: 0,
        max: 200,
        interval: 50,
        ticks: [0, 50, 100, 150, 200],
        unit: 'cm'
      };

      const renderer = new ScaleRenderer(scale, 400);
      const elements = renderer.generateSVGElements();

      expect(elements.ticks).toHaveLength(5);
      expect(elements.labels).toHaveLength(5);
      expect(elements.gridLines).toHaveLength(5);

      // 各要素の構造確認
      expect(elements.ticks[0]).toHaveProperty('x');
      expect(elements.ticks[0]).toHaveProperty('y');
      expect(elements.labels[0]).toHaveProperty('text');
      expect(elements.gridLines[0]).toHaveProperty('x1');
    });
  });

  describe('getOptimalLabelFormat', () => {
    it('should determine optimal label format based on scale', () => {
      const scale1: DynamicScale = {
        min: 0,
        max: 100,
        interval: 10,
        ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        unit: 'cm'
      };

      const renderer1 = new ScaleRenderer(scale1, 400);
      const format1 = renderer1.getOptimalLabelFormat();
      expect(format1.decimals).toBe(0);
      expect(format1.unit).toBe('cm');

      const scale2: DynamicScale = {
        min: -12.5,
        max: 12.5,
        interval: 2.5,
        ticks: [-12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5],
        unit: 'cm'
      };

      const renderer2 = new ScaleRenderer(scale2, 400);
      const format2 = renderer2.getOptimalLabelFormat();
      expect(format2.decimals).toBe(1);
    });
  });
});