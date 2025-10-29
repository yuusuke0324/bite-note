/**
 * TASK-101: 動的縦軸スケール調整機能
 * ScaleRenderer - スケールの描画とSVG要素生成
 */

import type { DynamicScale } from '../../types/scale';

export interface LabelFormat {
  decimals: number;
  unit: string;
  showUnit: boolean;
}

export interface SVGTickElement {
  x: number;
  y: number;
  value: number;
}

export interface SVGLabelElement {
  x: number;
  y: number;
  text: string;
  value: number;
}

export interface SVGGridLineElement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: number;
}

export interface SVGScaleElements {
  ticks: SVGTickElement[];
  labels: SVGLabelElement[];
  gridLines: SVGGridLineElement[];
}

export class ScaleRenderer {
  private scale: DynamicScale;
  private svgHeight: number;
  private flipY: boolean;

  constructor(scale: DynamicScale, svgHeight: number, flipY: boolean = true) {
    this.scale = scale;
    this.svgHeight = svgHeight;
    this.flipY = flipY;
  }

  /**
   * 潮位値をSVG Y座標に変換する
   */
  levelToSVGY(level: number): number {
    const scaleSpan = this.scale.max - this.scale.min;
    const ratio = (level - this.scale.min) / scaleSpan;

    if (this.flipY) {
      // 通常のSVG座標系：上が0、下が正の値
      return this.svgHeight * (1 - ratio);
    } else {
      // 数学的座標系：下が0、上が正の値
      return this.svgHeight * ratio;
    }
  }

  /**
   * 目盛りラベルを生成する
   */
  generateTickLabels(): string[] {
    const format = this.getOptimalLabelFormat();

    return this.scale.ticks.map(tick => {
      const value = format.decimals > 0
        ? tick.toFixed(format.decimals)
        : Math.round(tick).toString();

      return format.showUnit ? `${value}${format.unit}` : value;
    });
  }

  /**
   * SVG要素を生成する
   */
  generateSVGElements(gridWidth: number = 400): SVGScaleElements {
    const elements: SVGScaleElements = {
      ticks: [],
      labels: [],
      gridLines: []
    };

    this.scale.ticks.forEach((tick, index) => {
      const y = this.levelToSVGY(tick);

      // 目盛り要素
      elements.ticks.push({
        x: 0,
        y,
        value: tick
      });

      // ラベル要素
      const labels = this.generateTickLabels();
      elements.labels.push({
        x: -10,
        y: y + 4, // 中央寄せのためのオフセット
        text: labels[index],
        value: tick
      });

      // グリッドライン要素
      elements.gridLines.push({
        x1: 0,
        y1: y,
        x2: gridWidth,
        y2: y,
        value: tick
      });
    });

    return elements;
  }

  /**
   * 最適なラベル形式を決定する
   */
  getOptimalLabelFormat(): LabelFormat {
    const interval = this.scale.interval;

    // 間隔に基づく小数点桁数の決定
    let decimals = 0;
    if (interval < 10) decimals = 1;
    else if (interval < 50) decimals = 0;
    else decimals = 0;

    // 小数点を含む目盛りがあるかチェック
    const hasDecimals = this.scale.ticks.some(tick => tick % 1 !== 0);
    if (hasDecimals && decimals === 0) {
      decimals = 1;
    }

    return {
      decimals,
      unit: this.scale.unit,
      showUnit: true
    };
  }

  /**
   * スケールの表示に必要な幅を計算する
   */
  calculateRequiredWidth(): number {
    const labels = this.generateTickLabels();
    const maxLabelLength = Math.max(...labels.map(label => label.length));

    // 文字幅の概算（文字数 * 8px + 余白）
    return maxLabelLength * 8 + 20;
  }

  /**
   * Y軸のタイトルを生成する
   */
  generateAxisTitle(): string {
    return `潮位 (${this.scale.unit})`;
  }

  /**
   * スケールの統計情報を取得する
   */
  getScaleStatistics() {
    return {
      range: this.scale.max - this.scale.min,
      tickCount: this.scale.ticks.length,
      interval: this.scale.interval,
      density: this.scale.ticks.length / (this.scale.max - this.scale.min) * 100, // ticks per 100cm
      unit: this.scale.unit
    };
  }
}