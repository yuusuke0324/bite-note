/**
 * 絵文字からLucideアイコンへのマッピング定数
 * @module constants/icon-mappings
 */

import {
  Fish,
  Waves,
  Edit,
  PenTool,
  Camera,
  Settings,
  Wrench,
  Home,
  BarChart3,
  PieChart,
  Search,
  MapPin,
  Navigation,
  Calendar,
  Ruler,
  MessageSquare,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Info,
  Upload,
  Share,
  Download,
  Trash2,
  RotateCw,
  RefreshCw,
  Save,
  Map,
  CloudSun,
  Sun,
  Moon,
  Droplet,
  Droplets,
  Anchor,
  Check,
  CheckCircle2,
  X,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  Wifi,
  WifiOff,
  Trophy,
  Award,
  FileText,
  NotebookPen,
  File,
  Palette,
  Lock,
  ImageIcon,
  Bell,
  FlaskConical,
  Sliders,
  Eye,
  FolderOpen,
  Smartphone,
  Hand,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  MoreVertical,
  MoreHorizontal,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  Star,
  Heart,
  Bookmark,
  Target,
  Wind,
  Thermometer,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react';

import type { IconCategory } from '../types/icon';

/**
 * アイコンマッピング型
 */
export interface IconMapping {
  /** Lucideアイコンコンポーネント */
  icon: LucideIcon;
  /** 代替アイコン（オプション） */
  alternativeIcon?: LucideIcon;
  /** 用途説明 */
  description: string;
  /** カテゴリ */
  category: IconCategory;
}

/**
 * 絵文字からLucideアイコンへのマッピング定数
 */
export const ICON_MAPPINGS: Record<string, IconMapping> = {
  // ========================================
  // ナビゲーション・UI要素
  // ========================================
  '🎣': {
    icon: Anchor,
    alternativeIcon: Fish,
    description: '釣り・アプリアイコン（釣り行為）',
    category: 'navigation',
  },
  '✏️': {
    icon: Edit,
    alternativeIcon: PenTool,
    description: '記録登録・編集',
    category: 'navigation',
  },
  '📸': {
    icon: Camera,
    description: '写真・カメラ',
    category: 'navigation',
  },
  '🔧': {
    icon: Settings,
    alternativeIcon: Wrench,
    description: 'デバッグ・設定',
    category: 'navigation',
  },
  '⚙️': {
    icon: Settings,
    description: '設定',
    category: 'navigation',
  },
  '🏠': {
    icon: Home,
    description: 'ホーム',
    category: 'navigation',
  },
  '📊': {
    icon: BarChart3,
    alternativeIcon: PieChart,
    description: '統計・グラフ',
    category: 'navigation',
  },
  '🔍': {
    icon: Search,
    description: '検索',
    category: 'action',
  },
  '➕': {
    icon: Plus,
    description: '追加・新規作成',
    category: 'action',
  },
  '◀️': {
    icon: ChevronLeft,
    description: '左へ・戻る',
    category: 'navigation',
  },
  '▶️': {
    icon: ChevronRight,
    description: '右へ・進む',
    category: 'navigation',
  },
  '▼': {
    icon: ChevronDown,
    description: '下へ・展開',
    category: 'navigation',
  },
  '▲': {
    icon: ChevronUp,
    description: '上へ・折りたたみ',
    category: 'navigation',
  },
  '☰': {
    icon: Menu,
    description: 'メニュー',
    category: 'navigation',
  },
  '⋮': {
    icon: MoreVertical,
    alternativeIcon: MoreHorizontal,
    description: 'その他のオプション',
    category: 'navigation',
  },

  // ========================================
  // データ項目
  // ========================================
  '🐟': {
    icon: Fish,
    description: '魚種',
    category: 'data',
  },
  '📍': {
    icon: MapPin,
    alternativeIcon: Navigation,
    description: '場所・GPS',
    category: 'data',
  },
  '📅': {
    icon: Calendar,
    description: '日付',
    category: 'data',
  },
  '📏': {
    icon: Ruler,
    description: 'サイズ',
    category: 'data',
  },
  '💭': {
    icon: MessageSquare,
    alternativeIcon: StickyNote,
    description: 'メモ・コメント',
    category: 'data',
  },
  '📈': {
    icon: TrendingUp,
    description: '上昇トレンド',
    category: 'data',
  },
  '📉': {
    icon: TrendingDown,
    description: '下降トレンド',
    category: 'data',
  },
  '💡': {
    icon: Lightbulb,
    alternativeIcon: Info,
    description: 'ヒント・情報',
    category: 'data',
  },
  '🕐': {
    icon: Clock,
    description: '時刻・時間',
    category: 'data',
  },
  '⭐': {
    icon: Star,
    description: 'お気に入り・評価',
    category: 'data',
  },
  '❤️': {
    icon: Heart,
    description: 'いいね・お気に入り',
    category: 'data',
  },
  '🔖': {
    icon: Bookmark,
    description: 'ブックマーク',
    category: 'data',
  },
  '🎯': {
    icon: Target,
    description: 'ヒットポイント・狙いポイント',
    category: 'data',
  },

  // ========================================
  // アクション
  // ========================================
  '📤': {
    icon: Upload,
    alternativeIcon: Share,
    description: 'エクスポート・共有',
    category: 'action',
  },
  '📥': {
    icon: Download,
    description: 'インポート・ダウンロード',
    category: 'action',
  },
  '🗑️': {
    icon: Trash2,
    description: '削除',
    category: 'action',
  },
  '🔄': {
    icon: RotateCw,
    alternativeIcon: RefreshCw,
    description: 'リロード・再試行・更新',
    category: 'action',
  },
  '💾': {
    icon: Save,
    description: '保存',
    category: 'action',
  },
  '🗺️': {
    icon: Map,
    description: '地図',
    category: 'action',
  },
  '🎛️': {
    icon: Filter,
    alternativeIcon: Sliders,
    description: 'フィルター',
    category: 'action',
  },
  '↑': {
    icon: SortAsc,
    description: '昇順ソート',
    category: 'action',
  },
  '↓': {
    icon: SortDesc,
    description: '降順ソート',
    category: 'action',
  },

  // ========================================
  // 天候・環境
  // ========================================
  '🌊': {
    icon: Waves,
    description: '潮汐・海・大潮',
    category: 'weather',
  },
  '🌤️': {
    icon: CloudSun,
    alternativeIcon: Sun,
    description: '天気',
    category: 'weather',
  },
  '🌙': {
    icon: Moon,
    description: '月・ダークモード',
    category: 'weather',
  },
  '☀️': {
    icon: Sun,
    description: 'ライトモード',
    category: 'weather',
  },
  '💧': {
    icon: Droplet,
    alternativeIcon: Droplets,
    description: '小潮',
    category: 'weather',
  },
  '🏖️': {
    icon: ArrowDown,
    alternativeIcon: TrendingDown,
    description: '干潮',
    category: 'weather',
  },
  '💨': {
    icon: Wind,
    description: '風速・風向',
    category: 'weather',
  },
  '🌡️': {
    icon: Thermometer,
    description: '気温・水温',
    category: 'weather',
  },

  // ========================================
  // ステータス・通知
  // ========================================
  '✓': {
    icon: Check,
    alternativeIcon: CheckCircle2,
    description: '成功',
    category: 'status',
  },
  '✗': {
    icon: X,
    alternativeIcon: XCircle,
    description: 'エラー',
    category: 'status',
  },
  '⚠️': {
    icon: AlertTriangle,
    description: '警告',
    category: 'status',
  },
  'ℹ': {
    icon: Info,
    description: '情報',
    category: 'status',
  },
  '🚨': {
    icon: AlertOctagon,
    description: '重大なエラー',
    category: 'status',
  },
  '⏳': {
    icon: Loader2,
    description: '処理中・ローディング',
    category: 'status',
  },
  '📡': {
    icon: Wifi,
    alternativeIcon: WifiOff,
    description: 'オフライン',
    category: 'status',
  },
  '✅': {
    icon: CheckCircle2,
    description: '利用可能',
    category: 'status',
  },

  // ========================================
  // その他
  // ========================================
  '🏆': {
    icon: Trophy,
    alternativeIcon: Award,
    description: 'ベスト・ランキング',
    category: 'other',
  },
  '📝': {
    icon: FileText,
    alternativeIcon: NotebookPen,
    description: '記録・テキスト',
    category: 'other',
  },
  '📄': {
    icon: File,
    description: 'データ・ドキュメント',
    category: 'other',
  },
  '🎨': {
    icon: Palette,
    description: '表示・デザイン',
    category: 'other',
  },
  '🔒': {
    icon: Lock,
    description: 'プライバシー',
    category: 'other',
  },
  '📷': {
    icon: ImageIcon,
    description: '写真設定',
    category: 'other',
  },
  '🔔': {
    icon: Bell,
    description: '通知',
    category: 'other',
  },
  '🧪': {
    icon: FlaskConical,
    description: '実験的機能',
    category: 'other',
  },
  '👁️': {
    icon: Eye,
    description: '表示オプション',
    category: 'other',
  },
  '🗂️': {
    icon: FolderOpen,
    description: 'データ管理',
    category: 'other',
  },
  '📱': {
    icon: Smartphone,
    description: 'モバイル・インストール',
    category: 'other',
  },
  '👋': {
    icon: Hand,
    description: 'ウェルカム',
    category: 'other',
  },
};

/**
 * カテゴリ別アイコン取得
 * @param category - 取得するカテゴリ
 * @returns 指定カテゴリのアイコンマッピング
 */
export function getIconsByCategory(
  category: IconCategory
): Record<string, IconMapping> {
  return Object.entries(ICON_MAPPINGS)
    .filter(([, mapping]) => mapping.category === category)
    .reduce(
      (acc, [emoji, mapping]) => ({ ...acc, [emoji]: mapping }),
      {} as Record<string, IconMapping>
    );
}

/**
 * 絵文字からアイコンを取得
 * @param emoji - 絵文字
 * @returns Lucideアイコンコンポーネント（見つからない場合はundefined）
 */
export function getIconFromEmoji(emoji: string): LucideIcon | undefined {
  return ICON_MAPPINGS[emoji]?.icon;
}

/**
 * 絵文字からアイコンマッピング情報を取得
 * @param emoji - 絵文字
 * @returns アイコンマッピング情報（見つからない場合はundefined）
 */
export function getIconMapping(emoji: string): IconMapping | undefined {
  return ICON_MAPPINGS[emoji];
}

/**
 * すべてのカテゴリを取得
 * @returns カテゴリの配列
 */
export function getAllCategories(): IconCategory[] {
  const categories = new Set<IconCategory>();
  Object.values(ICON_MAPPINGS).forEach((mapping) => {
    categories.add(mapping.category);
  });
  return Array.from(categories);
}

/**
 * マッピングされた絵文字の総数を取得
 * @returns 絵文字の総数
 */
export function getIconMappingsCount(): number {
  return Object.keys(ICON_MAPPINGS).length;
}

// よく使うアイコンの直接エクスポート（利便性のため）
export {
  Fish,
  Waves,
  Edit,
  Camera,
  Settings,
  Home,
  BarChart3,
  Search,
  MapPin,
  Calendar,
  Ruler,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Info,
  Upload,
  Download,
  Trash2,
  RotateCw,
  Save,
  Map,
  CloudSun,
  Sun,
  Moon,
  Droplet,
  Droplets,
  Anchor,
  Check,
  CheckCircle2,
  X,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  Wifi,
  WifiOff,
  Trophy,
  FileText,
  File,
  Palette,
  Lock,
  ImageIcon,
  Bell,
  FlaskConical,
  Sliders,
  Eye,
  FolderOpen,
  Smartphone,
  Hand,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  MoreVertical,
  Filter,
  Clock,
  Star,
  Heart,
  Bookmark,
  Target,
  Wind,
  Thermometer,
  ArrowDown,
};
