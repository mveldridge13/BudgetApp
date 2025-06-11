export type GoalType = 'savings' | 'spending' | 'debt';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type RecurrenceType =
  | 'none'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'sixmonths'
  | 'yearly';
export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type InsightType = 'success' | 'warning' | 'info';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'INR';
export type SharePermission = 'view' | 'edit' | 'admin';
export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AnalyticsMetric = 'spending' | 'savings' | 'income' | 'budget' | 'goals';
export type AIRecommendationType = 'savings' | 'spending' | 'investment' | 'budget' | 'goal';
export type AIPredictionConfidence = 'high' | 'medium' | 'low';
export type AILearningModel = 'transaction' | 'spending' | 'savings' | 'budget' | 'goal';
export type AttachmentType = 'image' | 'pdf' | 'voice' | 'video' | 'document';
export type VoiceTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VoiceTransactionSource = 'app' | 'assistant' | 'phone' | 'other';

export const GOAL_TYPES = [
  {
    id: 'savings',
    label: 'Savings',
    icon: 'dollar-sign',
    description: 'Save money for future purchases',
  },
  {
    id: 'spending',
    label: 'Spending Budget',
    icon: 'credit-card',
    description: 'Track spending in categories',
  },
  {
    id: 'debt',
    label: 'Debt Payment',
    icon: 'trending-down',
    description: 'Pay off loans or credit cards',
  },
] as const;

export const PRIORITIES = [
  {id: 'high', label: 'High', color: '#FF6B85'},
  {id: 'medium', label: 'Medium', color: '#FFB74D'},
  {id: 'low', label: 'Low', color: '#52C788'},
] as const;

export const RECURRENCE_OPTIONS = [
  {id: 'none', name: 'Does not repeat'},
  {id: 'weekly', name: 'Weekly'},
  {id: 'fortnightly', name: 'Fortnightly'},
  {id: 'monthly', name: 'Monthly'},
  {id: 'sixmonths', name: 'Every six months'},
  {id: 'yearly', name: 'Yearly'},
] as const;

export const CATEGORY_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FECA57',
  '#FF9FF3',
  '#A8A8A8',
  '#FF8C42',
  '#6C5CE7',
  '#FD79A8',
  '#FDCB6E',
  '#E17055',
  '#74B9FF',
  '#00B894',
  '#E84393',
  '#0984E3',
] as const;

export const CATEGORY_ICONS = [
  'restaurant-outline',
  'car-outline',
  'bag-outline',
  'film-outline',
  'flash-outline',
  'fitness-outline',
  'document-text-outline',
  'home-outline',
  'airplane-outline',
  'medkit-outline',
  'school-outline',
  'cafe-outline',
  'gift-outline',
  'game-controller-outline',
  'musical-notes-outline',
  'book-outline',
  'bicycle-outline',
  'camera-outline',
  'card-outline',
  'desktop-outline',
  'hardware-chip-outline',
  'heart-outline',
  'library-outline',
  'map-outline',
] as const;

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  syncStatus?: 'synced' | 'pending' | 'error';
  deviceId?: string;
}

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRate?: number;
  lastUpdated?: string;
}

export interface ExchangeRate {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  lastUpdated: string;
}

export interface SharedEntity extends BaseEntity {
  sharedWith: Array<{
    userId: string;
    permission: SharePermission;
    sharedAt: string;
    expiresAt?: string;
  }>;
  isPublic: boolean;
  shareSettings?: {
    allowComments: boolean;
    allowDuplication: boolean;
    requireApproval: boolean;
  };
}

export interface Goal extends SharedEntity {
  title: string;
  type: GoalType;
  target: number;
  current: number;
  originalAmount?: number;
  currency: CurrencyCode;
  deadline: string;
  category: string;
  priority: PriorityLevel;
  autoContribute: number;
  isActive: boolean;
  version: number;
  analytics?: {
    progressHistory: Array<{
      date: string;
      amount: number;
      currency: CurrencyCode;
    }>;
    contributions: Array<{
      date: string;
      amount: number;
      source: string;
    }>;
    milestones: Array<{
      date: string;
      description: string;
      amount: number;
    }>;
  };
  aiPredictions?: {
    completionDate?: {
      predicted: string;
      confidence: AIPredictionConfidence;
      factors: string[];
    };
    successProbability?: {
      probability: number;
      confidence: AIPredictionConfidence;
      factors: string[];
    };
    recommendations?: AIRecommendation[];
  };
}

export interface Subcategory extends BaseEntity {
  name: string;
  icon: string;
  categoryId: string;
}

export interface Category extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  hasSubcategories: boolean;
  subcategories?: Subcategory[];
  version: number;
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    compression?: {
      type: string;
      quality: number;
    };
    ocr?: {
      text: string;
      confidence: number;
      language: string;
    };
    transcription?: {
      text: string;
      confidence: number;
      language: string;
      segments?: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
  };
  processingStatus?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    progress?: number;
  };
  security?: {
    isEncrypted: boolean;
    encryptionType?: string;
    accessControl?: Array<{
      userId: string;
      permission: SharePermission;
    }>;
  };
}

export interface VoiceTransaction extends Transaction {
  voiceData: {
    audioUrl: string;
    duration: number;
    source: VoiceTransactionSource;
    status: VoiceTransactionStatus;
    transcription: {
      text: string;
      confidence: number;
      language: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
        speaker?: string;
      }>;
    };
    processing?: {
      startTime: string;
      endTime?: string;
      steps: Array<{
        name: string;
        status: 'pending' | 'completed' | 'failed';
        error?: string;
      }>;
    };
    metadata?: {
      deviceInfo?: {
        type: string;
        model: string;
        os: string;
      };
      audioQuality?: {
        sampleRate: number;
        channels: number;
        format: string;
      };
      location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
      };
    };
  };
  aiAnalysis?: {
    intent: string;
    confidence: number;
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    sentiment: 'positive' | 'negative' | 'neutral';
    categories: Array<{
      category: string;
      confidence: number;
    }>;
  };
}

export interface Transaction extends SharedEntity {
  amount: number;
  originalAmount?: number;
  currency: CurrencyCode;
  originalCurrency?: CurrencyCode;
  description: string;
  category: string;
  subcategory?: string;
  date: string;
  recurrence: RecurrenceType;
  attachedImage?: string;
  goalId?: string;
  version: number;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    tags?: string[];
    notes?: string;
    receipt?: {
      imageUrl: string;
      ocrText?: string;
      merchantName?: string;
      merchantAddress?: string;
      items?: Array<{
        name: string;
        quantity: number;
        price: number;
        currency: CurrencyCode;
      }>;
    };
    paymentMethod?: {
      type: 'cash' | 'card' | 'bank_transfer' | 'other';
      details?: string;
      currency: CurrencyCode;
    };
    tax?: {
      amount: number;
      rate: number;
      type: string;
      currency: CurrencyCode;
    };
    attachments?: {
      totalCount: number;
      totalSize: number;
      types: AttachmentType[];
      processingStatus: 'pending' | 'completed' | 'failed';
    };
    voice?: {
      hasVoice: boolean;
      duration?: number;
      transcriptionStatus?: VoiceTransactionStatus;
    };
  };
  analytics?: {
    categoryTrends?: {
      period: AnalyticsPeriod;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
    merchantInsights?: {
      frequency: number;
      totalSpent: number;
      averageTransaction: number;
    };
  };
  aiInsights?: {
    categoryPrediction?: {
      predictedCategory: string;
      confidence: AIPredictionConfidence;
      alternatives?: Array<{
        category: string;
        confidence: number;
      }>;
    };
    anomalyDetection?: {
      isAnomaly: boolean;
      score: number;
      explanation: string;
    };
    merchantInsights?: {
      category: string;
      typicalAmount: number;
      frequency: number;
      confidence: AIPredictionConfidence;
    };
    nlpAnalysis?: {
      sentiment: 'positive' | 'negative' | 'neutral';
      keywords: string[];
      entities: Array<{
        type: string;
        value: string;
        confidence: number;
      }>;
    };
  };
  attachments?: Attachment[];
  voiceTransaction?: VoiceTransaction;
}

export interface Income extends SharedEntity {
  amount: number;
  currency: CurrencyCode;
  frequency: IncomeFrequency;
  nextPayDate: string;
  version: number;
  analytics?: {
    history: Array<{
      date: string;
      amount: number;
      currency: CurrencyCode;
    }>;
    projections: Array<{
      date: string;
      projectedAmount: number;
      currency: CurrencyCode;
    }>;
  };
}

export interface UserSetup extends SharedEntity {
  income: Income;
  categories: Category[];
  preferences: {
    currency: CurrencyCode;
    secondaryCurrencies?: CurrencyCode[];
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
    timezone: string;
    analyticsPreferences: {
      defaultPeriod: AnalyticsPeriod;
      defaultMetrics: AnalyticsMetric[];
      customReports?: Array<{
        name: string;
        metrics: AnalyticsMetric[];
        period: AnalyticsPeriod;
        categories?: string[];
      }>;
    };
    sharingPreferences: {
      defaultPermission: SharePermission;
      autoShareNewGoals: boolean;
      requireApproval: boolean;
    };
    aiPreferences: {
      enabled: boolean;
      learningModels: AILearningModel[];
      predictionConfidence: AIPredictionConfidence;
      notificationPreferences: {
        recommendations: boolean;
        predictions: boolean;
        anomalies: boolean;
        insights: boolean;
      };
      privacySettings: {
        dataCollection: boolean;
        modelTraining: boolean;
        personalizedRecommendations: boolean;
      };
    };
  };
  version: number;
}

export interface Insight extends SharedEntity {
  type: InsightType;
  icon: string;
  category: string;
  message: string;
  suggestion: string;
  version: number;
  analytics?: {
    dataPoints: Array<{
      date: string;
      value: number;
      metric: AnalyticsMetric;
    }>;
    comparison?: {
      previous: number;
      current: number;
      change: number;
      percentage: number;
    };
    trends?: {
      direction: 'up' | 'down' | 'stable';
      magnitude: number;
      confidence: number;
    };
  };
  aiGenerated: boolean;
  aiMetadata?: {
    model: AILearningModel;
    confidence: AIPredictionConfidence;
    factors: string[];
    learningData?: AILearningData;
  };
}

export interface AnalyticsData {
  userId: string;
  period: AnalyticsPeriod;
  metrics: Record<AnalyticsMetric, {
    value: number;
    currency: CurrencyCode;
    trend: number;
    breakdown: Record<string, number>;
  }>;
  categories: Record<string, {
    total: number;
    percentage: number;
    trend: number;
  }>;
  goals: Record<string, {
    progress: number;
    remaining: number;
    onTrack: boolean;
  }>;
  generatedAt: string;
}

export interface AIPrediction {
  type: AIRecommendationType;
  confidence: AIPredictionConfidence;
  value: number;
  currency: CurrencyCode;
  date: string;
  factors: Array<{
    name: string;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  explanation: string;
}

export interface AIRecommendation {
  type: AIRecommendationType;
  priority: PriorityLevel;
  title: string;
  description: string;
  action: string;
  expectedImpact: {
    amount: number;
    currency: CurrencyCode;
    timeframe: string;
  };
  confidence: AIPredictionConfidence;
  category?: string;
  tags?: string[];
  createdAt: string;
  expiresAt?: string;
  userFeedback?: {
    helpful: boolean;
    implemented: boolean;
    feedback?: string;
    feedbackDate?: string;
  };
}

export interface AILearningData {
  model: AILearningModel;
  features: Record<string, number | string | boolean>;
  prediction: number;
  actual?: number;
  accuracy?: number;
  timestamp: string;
}

export interface StorageSchema {
  goals: Goal[];
  transactions: Transaction[];
  categories: Category[];
  userSetup: UserSetup;
  lastSyncTimestamp?: string;
  deviceInfo?: {
    deviceId: string;
    platform: 'ios' | 'android';
    appVersion: string;
    lastSync: string;
  };
  analytics?: {
    lastGenerated: string;
    periods: Record<AnalyticsPeriod, AnalyticsData>;
    customReports?: Record<string, AnalyticsData>;
  };
  exchangeRates?: ExchangeRate[];
  aiModels?: {
    lastTrained: string;
    models: Record<AILearningModel, {
      version: string;
      accuracy: number;
      lastUpdated: string;
      features: string[];
    }>;
    learningData: AILearningData[];
  };
  aiRecommendations?: {
    active: AIRecommendation[];
    history: AIRecommendation[];
    feedback: Array<{
      recommendationId: string;
      feedback: string;
      timestamp: string;
    }>;
  };
  attachments?: {
    totalSize: number;
    count: number;
    byType: Record<AttachmentType, number>;
    processingQueue: Array<{
      attachmentId: string;
      type: AttachmentType;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      priority: number;
    }>;
  };
  voiceTransactions?: {
    total: number;
    byStatus: Record<VoiceTransactionStatus, number>;
    processingQueue: Array<{
      transactionId: string;
      status: VoiceTransactionStatus;
      priority: number;
    }>;
  };
}

export const STORAGE_KEYS = {
  GOALS: '@fintech_app_goals',
  TRANSACTIONS: '@fintech_app_transactions',
  CATEGORIES: '@fintech_app_categories',
  USER_SETUP: '@fintech_app_user_setup',
  DEVICE_INFO: '@fintech_app_device_info',
  LAST_SYNC: '@fintech_app_last_sync',
  USER_ID: '@fintech_app_user_id',
  ANALYTICS: '@fintech_app_analytics',
  EXCHANGE_RATES: '@fintech_app_exchange_rates',
  SHARED_DATA: '@fintech_app_shared_data',
  AI_MODELS: '@fintech_app_ai_models',
  AI_RECOMMENDATIONS: '@fintech_app_ai_recommendations',
  AI_LEARNING_DATA: '@fintech_app_ai_learning_data',
  ATTACHMENTS: '@fintech_app_attachments',
  VOICE_TRANSACTIONS: '@fintech_app_voice_transactions',
  ATTACHMENT_QUEUE: '@fintech_app_attachment_queue',
  VOICE_QUEUE: '@fintech_app_voice_queue',
} as const;

export const VALIDATION_RULES = {
  category: {
    name: {
      required: true,
      maxLength: 30,
    },
    icon: {
      required: true,
    },
    color: {
      required: true,
    },
  },
  goal: {
    title: {
      required: true,
      maxLength: 50,
    },
    type: {
      required: true,
      type: 'enum',
      values: ['savings', 'spending', 'debt'],
    },
    target: {
      required: (goal: Goal) => goal.type !== 'spending',
      min: 0,
    },
    originalAmount: {
      required: (goal: Goal) => goal.type === 'debt',
      min: 0,
    },
    deadline: {
      required: true,
    },
    category: {
      required: true,
    },
    priority: {
      required: true,
      type: 'enum',
      values: ['high', 'medium', 'low'],
    },
  },
  transaction: {
    amount: {
      required: true,
      min: 0,
    },
    description: {
      required: true,
      maxLength: 100,
    },
    category: {
      required: true,
    },
    date: {
      required: true,
    },
    recurrence: {
      required: true,
      type: 'enum',
      values: [
        'none',
        'weekly',
        'fortnightly',
        'monthly',
        'sixmonths',
        'yearly',
      ],
    },
  },
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '1',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Housing',
    icon: 'home',
    color: '#FF6B6B',
    hasSubcategories: true,
    subcategories: [
      {
        id: '1-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Rent',
        icon: 'key',
        categoryId: '1',
      },
      {
        id: '1-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Mortgage',
        icon: 'bank',
        categoryId: '1',
      },
      {
        id: '1-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Utilities',
        icon: 'bolt',
        categoryId: '1',
      },
      {
        id: '1-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Maintenance',
        icon: 'tools',
        categoryId: '1',
      },
      {
        id: '1-5',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Insurance',
        icon: 'shield',
        categoryId: '1',
      },
    ],
    version: 1,
  },
  {
    id: '2',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Transportation',
    icon: 'car',
    color: '#4ECDC4',
    hasSubcategories: true,
    subcategories: [
      {
        id: '2-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Fuel',
        icon: 'gas-pump',
        categoryId: '2',
      },
      {
        id: '2-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Public Transit',
        icon: 'bus',
        categoryId: '2',
      },
      {
        id: '2-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Maintenance',
        icon: 'tools',
        categoryId: '2',
      },
      {
        id: '2-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Insurance',
        icon: 'shield',
        categoryId: '2',
      },
    ],
    version: 1,
  },
  {
    id: '3',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Food & Dining',
    icon: 'restaurant',
    color: '#96CEB4',
    hasSubcategories: true,
    subcategories: [
      {
        id: '3-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Groceries',
        icon: 'basket',
        categoryId: '3',
      },
      {
        id: '3-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Restaurants',
        icon: 'restaurant',
        categoryId: '3',
      },
      {
        id: '3-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Coffee Shops',
        icon: 'cafe',
        categoryId: '3',
      },
      {
        id: '3-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Fast Food',
        icon: 'fast-food',
        categoryId: '3',
      },
    ],
    version: 1,
  },
  {
    id: '4',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Entertainment',
    icon: 'film',
    color: '#FF9FF3',
    hasSubcategories: true,
    subcategories: [
      {
        id: '4-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Movies',
        icon: 'videocam',
        categoryId: '4',
      },
      {
        id: '4-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Games',
        icon: 'game-controller',
        categoryId: '4',
      },
      {
        id: '4-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Music',
        icon: 'musical-notes',
        categoryId: '4',
      },
      {
        id: '4-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Sports',
        icon: 'football',
        categoryId: '4',
      },
    ],
    version: 1,
  },
  {
    id: '5',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Shopping',
    icon: 'cart',
    color: '#45B7D1',
    hasSubcategories: true,
    subcategories: [
      {
        id: '5-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Clothing',
        icon: 'shirt',
        categoryId: '5',
      },
      {
        id: '5-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Electronics',
        icon: 'phone-portrait',
        categoryId: '5',
      },
      {
        id: '5-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Home Goods',
        icon: 'home',
        categoryId: '5',
      },
      {
        id: '5-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Gifts',
        icon: 'gift',
        categoryId: '5',
      },
    ],
    version: 1,
  },
  {
    id: '6',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Health',
    icon: 'fitness',
    color: '#FECA57',
    hasSubcategories: true,
    subcategories: [
      {
        id: '6-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Medical',
        icon: 'medical',
        categoryId: '6',
      },
      {
        id: '6-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Pharmacy',
        icon: 'bandage',
        categoryId: '6',
      },
      {
        id: '6-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Fitness',
        icon: 'barbell',
        categoryId: '6',
      },
      {
        id: '6-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Dental',
        icon: 'happy',
        categoryId: '6',
      },
    ],
    version: 1,
  },
  {
    id: '7',
    userId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Education',
    icon: 'school',
    color: '#A8A8A8',
    hasSubcategories: true,
    subcategories: [
      {
        id: '7-1',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Tuition',
        icon: 'book',
        categoryId: '7',
      },
      {
        id: '7-2',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Books',
        icon: 'library',
        categoryId: '7',
      },
      {
        id: '7-3',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Courses',
        icon: 'laptop',
        categoryId: '7',
      },
      {
        id: '7-4',
        userId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Supplies',
        icon: 'pencil',
        categoryId: '7',
      },
    ],
    version: 1,
  },
] as const;

export const CONSTANTS = {
  LOADING_TIMEOUT: 10000,
} as const;
