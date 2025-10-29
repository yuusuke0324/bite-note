// 統計ダッシュボードコンポーネント

import React, { useMemo, useState } from 'react';
import { statisticsService } from '../lib/statistics-service';
import type { FishingRecord } from '../types';
import type {
  OverallStats,
  SpeciesStats,
  LocationStats,
  TimeAnalysis,
  SizeDistribution,
  WeatherStats
} from '../lib/statistics-service';

interface StatisticsDashboardProps {
  records: FishingRecord[];
  isVisible: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'species' | 'locations' | 'trends' | 'sizes' | 'weather';

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  records,
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // 統計データの計算
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    return {
      overall: statisticsService.calculateOverallStats(records),
      species: statisticsService.calculateSpeciesStats(records),
      locations: statisticsService.calculateLocationStats(records),
      timeAnalysis: statisticsService.calculateTimeAnalysis(records),
      sizeDistribution: statisticsService.calculateSizeDistribution(records),
      weather: statisticsService.calculateWeatherStats(records)
    };
  }, [records]);

  if (!isVisible) return null;

  if (!stats) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3>データがありません</h3>
          <p>統計を表示するには釣果記録が必要です。</p>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '概要', icon: '📊' },
    { id: 'species', label: '魚種別', icon: '🐟' },
    { id: 'locations', label: '場所別', icon: '📍' },
    { id: 'trends', label: '時系列', icon: '📈' },
    { id: 'sizes', label: 'サイズ分布', icon: '📏' },
    { id: 'weather', label: '天候別', icon: '🌤️' }
  ] as const;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '1000px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            📊 釣果統計ダッシュボード
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#6c757d',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #dee2e6',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#333',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツエリア */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflow: 'auto'
        }}>
          {activeTab === 'overview' && <OverviewTab stats={stats.overall} />}
          {activeTab === 'species' && <SpeciesTab stats={stats.species} />}
          {activeTab === 'locations' && <LocationsTab stats={stats.locations} />}
          {activeTab === 'trends' && <TrendsTab stats={stats.timeAnalysis} />}
          {activeTab === 'sizes' && <SizesTab stats={stats.sizeDistribution} />}
          {activeTab === 'weather' && <WeatherTab stats={stats.weather} />}
        </div>
      </div>
    </div>
  );
};

// 概要タブ
const OverviewTab: React.FC<{ stats: OverallStats }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📊 全体統計</h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      <StatCard
        title="総記録数"
        value={stats.totalRecords}
        unit="件"
        icon="📝"
        color="#007bff"
      />
      <StatCard
        title="平均サイズ"
        value={stats.averageSize}
        unit="cm"
        icon="📏"
        color="#28a745"
      />
      <StatCard
        title="総重量"
        value={stats.totalWeight}
        unit="kg"
        icon="⚖️"
        color="#ffc107"
      />
      <StatCard
        title="釣り場数"
        value={stats.uniqueLocations}
        unit="箇所"
        icon="📍"
        color="#17a2b8"
      />
      <StatCard
        title="魚種数"
        value={stats.uniqueSpecies}
        unit="種類"
        icon="🐟"
        color="#6f42c1"
      />
      <StatCard
        title="記録期間"
        value={stats.dateRange.daysCovered}
        unit="日間"
        icon="📅"
        color="#fd7e14"
      />
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    }}>
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>📷 写真付き記録</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
          {stats.recordsWithPhoto} / {stats.totalRecords}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          ({Math.round((stats.recordsWithPhoto / stats.totalRecords) * 100)}%)
        </div>
      </div>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>🗺️ GPS記録</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
          {stats.recordsWithGPS} / {stats.totalRecords}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          ({Math.round((stats.recordsWithGPS / stats.totalRecords) * 100)}%)
        </div>
      </div>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>📆 記録開始</h4>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
          {stats.dateRange.earliest.toLocaleDateString('ja-JP')}
        </div>
      </div>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>📆 最新記録</h4>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
          {stats.dateRange.latest.toLocaleDateString('ja-JP')}
        </div>
      </div>
    </div>
  </div>
);

// 魚種別タブ
const SpeciesTab: React.FC<{ stats: SpeciesStats[] }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>🐟 魚種別統計</h3>

    <div style={{
      display: 'grid',
      gap: '1rem'
    }}>
      {stats.slice(0, 10).map((species, index) => (
        <div
          key={species.species}
          style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>
              #{index + 1} {species.species}
            </h4>
            <div style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {species.percentage.toFixed(1)}%
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <strong>釣果数:</strong> {species.count}匹
            </div>
            <div>
              <strong>平均:</strong> {species.averageSize}cm
            </div>
            <div>
              <strong>最大:</strong> {species.maxSize}cm
            </div>
            <div>
              <strong>重量:</strong> {species.totalWeight}kg
            </div>
          </div>

          {species.locations.length > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
              <strong>主な釣り場:</strong> {species.locations.slice(0, 3).join(', ')}
              {species.locations.length > 3 && ` 他${species.locations.length - 3}箇所`}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// 場所別タブ
const LocationsTab: React.FC<{ stats: LocationStats[] }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📍 釣り場別統計</h3>

    <div style={{
      display: 'grid',
      gap: '1rem'
    }}>
      {stats.slice(0, 10).map((location, index) => (
        <div
          key={location.location}
          style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>
              #{index + 1} {location.location}
            </h4>
            <div style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#e8f5e8',
              color: '#2e7d32',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {location.percentage.toFixed(1)}%
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <strong>釣果数:</strong> {location.count}匹
            </div>
            <div>
              <strong>平均:</strong> {location.averageSize}cm
            </div>
            <div>
              <strong>最大:</strong> {location.maxSize}cm
            </div>
            <div>
              <strong>重量:</strong> {location.totalWeight}kg
            </div>
          </div>

          {location.species.length > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
              <strong>釣れる魚種:</strong> {location.species.slice(0, 5).join(', ')}
              {location.species.length > 5 && ` 他${location.species.length - 5}種`}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// 時系列タブ
const TrendsTab: React.FC<{ stats: TimeAnalysis }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📈 時系列分析</h3>

    {/* 季節別統計 */}
    <div style={{ marginBottom: '2rem' }}>
      <h4 style={{ color: '#333', marginBottom: '1rem' }}>🌸 季節別釣果</h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem'
      }}>
        {[
          { season: '春', count: stats.seasonal.spring, icon: '🌸', color: '#e91e63' },
          { season: '夏', count: stats.seasonal.summer, icon: '☀️', color: '#ff9800' },
          { season: '秋', count: stats.seasonal.autumn, icon: '🍂', color: '#ff5722' },
          { season: '冬', count: stats.seasonal.winter, icon: '❄️', color: '#2196f3' }
        ].map(({ season, count, icon, color }) => (
          <div
            key={season}
            style={{
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{count}</div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{season} ({count}匹)</div>
          </div>
        ))}
      </div>
    </div>

    {/* 年別トレンド */}
    {stats.yearlyTrends.length > 1 && (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: '#333', marginBottom: '1rem' }}>📊 年別トレンド</h4>
        <div style={{
          display: 'grid',
          gap: '0.5rem'
        }}>
          {stats.yearlyTrends.map(trend => (
            <div
              key={trend.year}
              style={{
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{trend.year}年</span>
              <span>{trend.count}匹 (平均: {trend.averageSize}cm)</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 月別詳細 */}
    <div>
      <h4 style={{ color: '#333', marginBottom: '1rem' }}>📅 月別詳細（直近12ヶ月）</h4>
      <div style={{
        display: 'grid',
        gap: '0.5rem',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        {stats.monthly.slice(-12).map(month => (
          <div
            key={`${month.year}-${month.month}`}
            style={{
              padding: '0.75rem',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontWeight: 'bold' }}>
              {month.year}年{month.month}月
            </span>
            <div style={{ fontSize: '0.9rem' }}>
              {month.count}匹 | 平均: {month.averageSize}cm | 魚種: {month.species.size}種
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// サイズ分布タブ
const SizesTab: React.FC<{ stats: SizeDistribution }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📏 サイズ分布</h3>

    {/* パーセンタイル */}
    <div style={{ marginBottom: '2rem' }}>
      <h4 style={{ color: '#333', marginBottom: '1rem' }}>📊 パーセンタイル</h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1rem'
      }}>
        {[
          { label: '25%', value: stats.percentiles.p25, desc: '下位25%' },
          { label: '50%', value: stats.percentiles.p50, desc: '中央値' },
          { label: '75%', value: stats.percentiles.p75, desc: '上位25%' },
          { label: '90%', value: stats.percentiles.p90, desc: '上位10%' },
          { label: '95%', value: stats.percentiles.p95, desc: '上位5%' }
        ].map(({ label, value, desc }) => (
          <div
            key={label}
            style={{
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>{desc}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
              {value}cm
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* 範囲別分布 */}
    <div>
      <h4 style={{ color: '#333', marginBottom: '1rem' }}>📈 サイズ範囲別分布</h4>
      <div style={{
        display: 'grid',
        gap: '0.5rem'
      }}>
        {stats.ranges.filter(range => range.count > 0).map(range => (
          <div
            key={range.range}
            style={{
              padding: '0.75rem',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontWeight: 'bold' }}>{range.range}</span>
              <span>{range.count}匹 ({range.percentage.toFixed(1)}%)</span>
            </div>
            <div style={{
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#007bff',
                width: `${range.percentage}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 天候別タブ
const WeatherTab: React.FC<{ stats: WeatherStats[] }> = ({ stats }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>🌤️ 天候別統計</h3>

    <div style={{
      display: 'grid',
      gap: '1rem'
    }}>
      {stats.map((weather, index) => (
        <div
          key={weather.weather}
          style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>
              #{index + 1} {weather.weather}
            </h4>
            <div style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {weather.count}回
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <strong>釣果数:</strong> {weather.count}匹
            </div>
            <div>
              <strong>平均サイズ:</strong> {weather.averageSize}cm
            </div>
            <div>
              <strong>平均気温:</strong> {weather.averageTemp > 0 ? `${weather.averageTemp}°C` : '-'}
            </div>
          </div>

          {weather.species.length > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
              <strong>釣れる魚種:</strong> {weather.species.slice(0, 5).join(', ')}
              {weather.species.length > 5 && ` 他${weather.species.length - 5}種`}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// 統計カードコンポーネント
const StatCard: React.FC<{
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
}> = ({ title, value, unit, icon, color }) => (
  <div style={{
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 'bold', color, marginBottom: '0.25rem' }}>
      {value}
    </div>
    <div style={{ fontSize: '0.9rem', color: '#666' }}>
      {title} ({unit})
    </div>
  </div>
);