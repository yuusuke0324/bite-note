// 統計・分析機能サービス

import type { FishingRecord } from '../types';

export interface OverallStats {
  totalRecords: number;
  totalCatches: number;
  averageSize: number;
  totalWeight: number;
  uniqueLocations: number;
  uniqueSpecies: number;
  dateRange: {
    earliest: Date;
    latest: Date;
    daysCovered: number;
  };
  recordsWithPhoto: number;
  recordsWithGPS: number;
}

export interface SpeciesStats {
  species: string;
  count: number;
  averageSize: number;
  maxSize: number;
  minSize: number;
  totalWeight: number;
  percentage: number;
  locations: string[];
}

export interface LocationStats {
  location: string;
  count: number;
  species: string[];
  averageSize: number;
  maxSize: number;
  totalWeight: number;
  percentage: number;
}

export interface MonthlyStats {
  year: number;
  month: number;
  count: number;
  averageSize: number;
  totalWeight: number;
  species: Set<string>;
  locations: Set<string>;
}

export interface WeatherStats {
  weather: string;
  count: number;
  averageSize: number;
  averageTemp: number;
  species: string[];
}

export interface TimeAnalysis {
  monthly: MonthlyStats[];
  seasonal: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
  yearlyTrends: {
    year: number;
    count: number;
    averageSize: number;
  }[];
}

export interface SizeDistribution {
  ranges: {
    range: string;
    count: number;
    percentage: number;
  }[];
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

class StatisticsService {
  // 全体統計の計算
  calculateOverallStats(records: FishingRecord[]): OverallStats {
    if (records.length === 0) {
      return {
        totalRecords: 0,
        totalCatches: 0,
        averageSize: 0,
        totalWeight: 0,
        uniqueLocations: 0,
        uniqueSpecies: 0,
        dateRange: {
          earliest: new Date(),
          latest: new Date(),
          daysCovered: 0
        },
        recordsWithPhoto: 0,
        recordsWithGPS: 0
      };
    }

    const validSizes = records.filter(r => r.size && r.size > 0).map(r => r.size!);
    const validWeights = records.filter(r => r.weight && r.weight > 0).map(r => r.weight!);
    const locations = new Set(records.map(r => r.location.trim()).filter(Boolean));
    const species = new Set(records.map(r => r.fishSpecies.trim()).filter(Boolean));

    const dates = records.map(r => r.date).sort((a, b) => a.getTime() - b.getTime());
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    const daysCovered = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      totalRecords: records.length,
      totalCatches: records.length, // 同じ値だが将来的に区別可能
      averageSize: validSizes.length > 0 ? this.average(validSizes) : 0,
      totalWeight: this.sum(validWeights),
      uniqueLocations: locations.size,
      uniqueSpecies: species.size,
      dateRange: {
        earliest,
        latest,
        daysCovered
      },
      recordsWithPhoto: records.filter(r => r.photoId).length,
      recordsWithGPS: records.filter(r => r.coordinates).length
    };
  }

  // 魚種別統計の計算
  calculateSpeciesStats(records: FishingRecord[]): SpeciesStats[] {
    const speciesMap = new Map<string, FishingRecord[]>();

    records.forEach(record => {
      const species = record.fishSpecies.trim();
      if (species) {
        if (!speciesMap.has(species)) {
          speciesMap.set(species, []);
        }
        speciesMap.get(species)!.push(record);
      }
    });

    const totalRecords = records.length;
    const stats: SpeciesStats[] = [];

    speciesMap.forEach((speciesRecords, species) => {
      const validSizes = speciesRecords.filter(r => r.size && r.size > 0).map(r => r.size!);
      const validWeights = speciesRecords.filter(r => r.weight && r.weight > 0).map(r => r.weight!);
      const locations = [...new Set(speciesRecords.map(r => r.location.trim()).filter(Boolean))];

      stats.push({
        species,
        count: speciesRecords.length,
        averageSize: validSizes.length > 0 ? this.average(validSizes) : 0,
        maxSize: validSizes.length > 0 ? Math.max(...validSizes) : 0,
        minSize: validSizes.length > 0 ? Math.min(...validSizes) : 0,
        totalWeight: this.sum(validWeights),
        percentage: (speciesRecords.length / totalRecords) * 100,
        locations
      });
    });

    return stats.sort((a, b) => b.count - a.count);
  }

  // 場所別統計の計算
  calculateLocationStats(records: FishingRecord[]): LocationStats[] {
    const locationMap = new Map<string, FishingRecord[]>();

    records.forEach(record => {
      const location = record.location.trim();
      if (location) {
        if (!locationMap.has(location)) {
          locationMap.set(location, []);
        }
        locationMap.get(location)!.push(record);
      }
    });

    const totalRecords = records.length;
    const stats: LocationStats[] = [];

    locationMap.forEach((locationRecords, location) => {
      const validSizes = locationRecords.filter(r => r.size && r.size > 0).map(r => r.size!);
      const validWeights = locationRecords.filter(r => r.weight && r.weight > 0).map(r => r.weight!);
      const species = [...new Set(locationRecords.map(r => r.fishSpecies.trim()).filter(Boolean))];

      stats.push({
        location,
        count: locationRecords.length,
        species,
        averageSize: validSizes.length > 0 ? this.average(validSizes) : 0,
        maxSize: validSizes.length > 0 ? Math.max(...validSizes) : 0,
        totalWeight: this.sum(validWeights),
        percentage: (locationRecords.length / totalRecords) * 100
      });
    });

    return stats.sort((a, b) => b.count - a.count);
  }

  // 時系列分析の計算
  calculateTimeAnalysis(records: FishingRecord[]): TimeAnalysis {
    const monthlyMap = new Map<string, {
      records: FishingRecord[];
      year: number;
      month: number;
    }>();

    // 月別データの集計
    records.forEach(record => {
      const date = record.date;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { records: [], year, month });
      }
      monthlyMap.get(key)!.records.push(record);
    });

    // 月別統計
    const monthly: MonthlyStats[] = [];
    monthlyMap.forEach(({ records: monthRecords, year, month }) => {
      const validSizes = monthRecords.filter(r => r.size && r.size > 0).map(r => r.size!);
      const validWeights = monthRecords.filter(r => r.weight && r.weight > 0).map(r => r.weight!);

      monthly.push({
        year,
        month,
        count: monthRecords.length,
        averageSize: validSizes.length > 0 ? this.average(validSizes) : 0,
        totalWeight: this.sum(validWeights),
        species: new Set(monthRecords.map(r => r.fishSpecies.trim()).filter(Boolean)),
        locations: new Set(monthRecords.map(r => r.location.trim()).filter(Boolean))
      });
    });

    monthly.sort((a, b) => a.year - b.year || a.month - b.month);

    // 季節別統計
    const seasonal = {
      spring: 0, // 3-5月
      summer: 0, // 6-8月
      autumn: 0, // 9-11月
      winter: 0  // 12-2月
    };

    monthly.forEach(stat => {
      if (stat.month >= 3 && stat.month <= 5) {
        seasonal.spring += stat.count;
      } else if (stat.month >= 6 && stat.month <= 8) {
        seasonal.summer += stat.count;
      } else if (stat.month >= 9 && stat.month <= 11) {
        seasonal.autumn += stat.count;
      } else {
        seasonal.winter += stat.count;
      }
    });

    // 年別トレンド
    const yearlyMap = new Map<number, FishingRecord[]>();
    records.forEach(record => {
      const year = record.date.getFullYear();
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, []);
      }
      yearlyMap.get(year)!.push(record);
    });

    const yearlyTrends = Array.from(yearlyMap.entries()).map(([year, yearRecords]) => {
      const validSizes = yearRecords.filter(r => r.size && r.size > 0).map(r => r.size!);
      return {
        year,
        count: yearRecords.length,
        averageSize: validSizes.length > 0 ? this.average(validSizes) : 0
      };
    }).sort((a, b) => a.year - b.year);

    return {
      monthly,
      seasonal,
      yearlyTrends
    };
  }

  // サイズ分布の計算
  calculateSizeDistribution(records: FishingRecord[]): SizeDistribution {
    const validSizes = records.filter(r => r.size && r.size > 0).map(r => r.size!);

    if (validSizes.length === 0) {
      return {
        ranges: [],
        percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }
      };
    }

    const sorted = validSizes.sort((a, b) => a - b);

    // 範囲別分布
    const maxSize = Math.max(...validSizes);
    const ranges = this.createSizeRanges(maxSize);
    const rangeCounts = ranges.map(range => ({
      range: range.label,
      count: validSizes.filter(size => size >= range.min && size < range.max).length,
      percentage: 0
    }));

    // 最大値を含む範囲の調整
    const lastRange = rangeCounts[rangeCounts.length - 1];
    if (lastRange) {
      lastRange.count = validSizes.filter(size =>
        size >= ranges[ranges.length - 1].min && size <= ranges[ranges.length - 1].max
      ).length;
    }

    // パーセンテージ計算
    rangeCounts.forEach(range => {
      range.percentage = (range.count / validSizes.length) * 100;
    });

    // パーセンタイル計算
    const percentiles = {
      p25: this.percentile(sorted, 25),
      p50: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95)
    };

    return {
      ranges: rangeCounts,
      percentiles
    };
  }

  // 天候別統計の計算
  calculateWeatherStats(records: FishingRecord[]): WeatherStats[] {
    const weatherMap = new Map<string, FishingRecord[]>();

    records.forEach(record => {
      const weather = record.weather?.trim() || '不明';
      if (!weatherMap.has(weather)) {
        weatherMap.set(weather, []);
      }
      weatherMap.get(weather)!.push(record);
    });

    const stats: WeatherStats[] = [];

    weatherMap.forEach((weatherRecords, weather) => {
      const validSizes = weatherRecords.filter(r => r.size && r.size > 0).map(r => r.size!);
      const validTemps = weatherRecords.filter(r => r.temperature && r.temperature > -50).map(r => r.temperature!);
      const species = [...new Set(weatherRecords.map(r => r.fishSpecies.trim()).filter(Boolean))];

      stats.push({
        weather,
        count: weatherRecords.length,
        averageSize: validSizes.length > 0 ? this.average(validSizes) : 0,
        averageTemp: validTemps.length > 0 ? this.average(validTemps) : 0,
        species
      });
    });

    return stats.sort((a, b) => b.count - a.count);
  }

  // ユーティリティメソッド
  private average(numbers: number[]): number {
    return numbers.length > 0 ? Math.round((numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 10) / 10 : 0;
  }

  private sum(numbers: number[]): number {
    return Math.round(numbers.reduce((sum, n) => sum + n, 0) * 10) / 10;
  }

  private percentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return Math.round(sorted[lower] * 10) / 10;
    }

    return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 10) / 10;
  }

  private createSizeRanges(maxSize: number): { min: number; max: number; label: string }[] {
    const step = Math.ceil(maxSize / 10); // 10段階に分割
    const ranges: { min: number; max: number; label: string }[] = [];

    for (let i = 0; i < 10; i++) {
      const min = i * step;
      const max = (i + 1) * step;
      ranges.push({
        min,
        max,
        label: `${min}-${max}cm`
      });
    }

    return ranges;
  }
}

export const statisticsService = new StatisticsService();