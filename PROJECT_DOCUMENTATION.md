# React Native BudgetApp - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [File Structure and Organization](#file-structure-and-organization)
4. [Complete File Interaction Mapping](#complete-file-interaction-mapping)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Configuration and Setup](#configuration-and-setup)
7. [Development Guidelines](#development-guidelines)

## Project Overview

The BudgetApp is a React Native personal finance management application that helps users track income, expenses, and financial goals. The app implements a sophisticated architecture with offline-first capabilities, real-time synchronization, and progressive onboarding.

### Key Features

- **Authentication System**: Custom JWT-based authentication
- **Transaction Management**: CRUD operations with category support
- **Offline-First Design**: AsyncStorage with backend sync
- **Progressive Onboarding**: Tutorial system with spotlights
- **Analytics Dashboard**: Spending insights and visualizations
- **Goal Tracking**: Financial goals with automatic progress updates
- **Discretionary Spending Analysis**: Enhanced spending breakdown with subcategories
- **Spending Velocity Tracking**: Day/time pattern analysis for spending habits

### Recent Updates

#### Latest Changes (Git Commits)
- **b02bd1f - Savings goal duplicate issue fixed**: Fixed duplicate savings goal creation issues
- **0e0e21b - Update spending budget issue fixed**: Resolved spending budget calculation problems
- **4e04c84 - ✅ Savings Goals - FULLY BACKEND INTEGRATED**: Complete backend integration for savings goals system
- **6c5fa40 - What's Stored in Backend Database**: Backend database schema updates for goal storage
- **7bc09e3 - Backend-driven income payment system**: Hybrid approach for goal payments with real-time BalanceCard updates
- **Goal Service Architecture**: New modular goal service system with specialized hooks
- **Enhanced Goal Management**: Improved goal tracking with backend synchronization

## Architecture Overview

### Architectural Pattern

The app follows a **Container-Component Pattern** with these layers:

```
┌─────────────────────────────────────────┐
│               App Entry                 │
│           (App.js, index.js)            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Navigation Layer             │
│           (AppNavigator.js)             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Container Layer               │
│     (Business Logic & State Mgmt)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Screen Layer                 │
│         (UI Orchestration)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Component Layer               │
│          (Reusable UI)                  │
└─────────────────────────────────────────┘

         ┌─────────────────────────────────┐
         │         Service Layer           │
         │    (API & Business Logic)       │
         └─────────────────────────────────┘

         ┌─────────────────────────────────┐
         │          Hook Layer             │
         │      (Shared Logic)             │
         └─────────────────────────────────┘
```

## File Structure and Organization

```
BudgetApp/
├── src/
│   ├── components/          # Reusable UI Components (15 files)
│   │   ├── AddGoalModal.js
│   │   ├── AddTransactionModal.js
│   │   ├── AddTransactionSpotlight.js
│   │   ├── BalanceCard.js
│   │   ├── BalanceCardSpotlight.js
│   │   ├── CalendarModal.js
│   │   ├── CategoryPicker.js
│   │   ├── DiscretionaryBreakdown.js
│   │   ├── GoalCard.js
│   │   ├── GoalSuggestionsCard.js
│   │   ├── SpendingVelocityBreakdown.js
│   │   ├── TransactionCard.js
│   │   ├── TransactionList.js
│   │   ├── TransactionSwipeSpotlight.js
│   │   └── WelcomeFlow.js
│   │
│   ├── containers/          # Business Logic Containers (7 files)
│   │   ├── AddTransactionContainer.js
│   │   ├── AnalyticsContainer.js
│   │   ├── CategoryContainer.js
│   │   ├── DiscretionaryContainer.js
│   │   ├── HomeContainer.js
│   │   ├── IncomeSetupContainer.js
│   │   └── SpendingVelocityContainer.js
│   │
│   ├── data/               # Static Data (1 file)
│   │   └── categories.js
│   │
│   ├── hooks/              # Custom React Hooks (9 files)
│   │   ├── goal-services/  # Modular Goal Service Architecture (6 files)
│   │   │   ├── useGoalCache.js
│   │   │   ├── useGoalCalculations.js
│   │   │   ├── useGoalData.js
│   │   │   ├── useGoalSync.js
│   │   │   ├── useGoalTransformers.js
│   │   │   └── useGoalValidation.js
│   │   ├── useGoals.js
│   │   ├── useOnboarding.js
│   │   └── useTransactions.js
│   │
│   ├── navigation/         # Navigation Configuration (1 file)
│   │   └── AppNavigator.js
│   │
│   ├── screens/            # Screen Components (8 files)
│   │   ├── AnalyticsScreen.js
│   │   ├── AuthContainer.js
│   │   ├── AuthFlow.js
│   │   ├── GoalsScreen.js
│   │   ├── HomeScreen.js
│   │   ├── IncomeSetupScreen.js
│   │   ├── SettingsScreen.js
│   │   └── index.js
│   │
│   ├── services/           # API and Business Services (4 files)
│   │   ├── AuthService.js
│   │   ├── InsightsService.js
│   │   ├── TestConnection.js
│   │   └── TrendAPIService.js
│   │
│   ├── styles/             # Style Definitions (3 files)
│   │   ├── colors.js
│   │   ├── globalStyles.js
│   │   └── index.js
│   │
│   └── utils/              # Utility Functions (3 files)
│       ├── currencyHelper.js
│       ├── dateHelper.js
│       └── storage.js
│
├── Configuration Files
│   ├── package.json
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── app.json
│   ├── tsconfig.json
│   ├── App.js
│   └── index.js
```

## Complete File Interaction Mapping

### Core Application Flow

#### **App Entry Point Chain**

```
index.js → App.js → AppNavigator.js
```

**index.js** (React Native Entry)

- **Purpose**: App registration and gesture handler setup
- **Imports**: App.js, react-native-gesture-handler
- **Exports**: None (registers app)

**App.js** (Main App Wrapper)

- **Purpose**: Navigation container and safe area provider
- **Imports**: AppNavigator, @react-navigation/native, react-native-safe-area-context
- **Exports**: Default App component
- **Provides**: NavigationContainer, SafeAreaProvider

### Navigation Layer

#### **AppNavigator.js** - Central Navigation Hub

```javascript
// Key Dependencies
├── Services: AuthService, TrendAPIService
├── Containers: AuthContainer, HomeContainer, IncomeSetupContainer, AnalyticsContainer
├── Screens: WelcomeFlow, GoalsScreen, SettingsScreen
└── Navigation: @react-navigation/stack, @react-navigation/bottom-tabs
```

**Functions:**

- `checkInitialRoute()` - Determines app entry point based on auth status
- `AuthScreen()`, `WelcomeScreen()` - Navigation wrapper components
- `MainTabs()` - Bottom tab navigator configuration

**Navigation Flow:**

1. Authentication check → AuthService.isAuthenticated()
2. Profile check → TrendAPIService.getUserProfile()
3. Route determination → Auth/Welcome/Setup/Main

### Service Layer

#### **TrendAPIService.js** - Core API Service

```javascript
// Singleton Pattern - Single Instance
const TrendAPIService = {
  baseURL: 'http://127.0.0.1:3001/api/v1',
  timeout: 10000,
  // Authentication via Bearer token from AsyncStorage
}

// API Endpoints
├── Authentication
│   ├── POST /auth/login
│   ├── POST /auth/register
│   ├── POST /auth/logout
│   └── GET /auth/profile
├── Transactions
│   ├── GET /transactions
│   ├── POST /transactions
│   ├── PUT /transactions/:id
│   └── DELETE /transactions/:id
├── Categories
│   ├── GET /categories
│   ├── POST /categories
│   └── PUT /categories/:id
├── Budgets/Goals
│   ├── GET /budgets
│   ├── POST /budgets
│   └── PUT /budgets/:id
└── Onboarding
    ├── GET /onboarding/status
    └── POST /onboarding/complete
```

**Used By:**

- AuthService.js (authentication operations)
- HomeContainer.js (main data operations)
- AddTransactionContainer.js (transaction CRUD)
- useTransactions.js (transaction hook)
- useGoals.js (goals hook)
- useOnboarding.js (onboarding hook)

#### **AuthService.js** - Authentication Management

```javascript
// Singleton Pattern
const AuthService = {
  // Dependencies
  apiService: TrendAPIService,

  // State Management
  isAuthenticated: false,
  currentUser: null,
}

// Key Functions
├── initialize() - Check stored tokens on app start
├── login(email, password) - User authentication
├── register(userData) - User registration
├── logout() - Clear auth state
├── validateEmail(email) - Email validation
├── validatePassword(password) - Password validation
└── validateRegistration(data) - Full registration validation
```

**Used By:**

- AppNavigator.js (route determination)
- AuthContainer.js (auth operations)
- HomeContainer.js (profile operations)
- useOnboarding.js (user context)

#### **InsightsService.js** - Analytics Service

```javascript
// Static Class Pattern
class InsightsService {
  // Main Analytics Function
  static generateInsights(transactions, period) {
    // Analysis logic
  }

  // Specialized Analysis
  static analyzeTakeoutSpending(transactions) {
    // Takeout-specific insights
  }
}
```

**Used By:**

- AnalyticsScreen.js (static method calls)

### Hook Layer

#### **useTransactions.js** - Transaction Management Hook

```javascript
// Dependencies
├── AsyncStorage (offline storage)
├── NetInfo (network state)
└── TrendAPIService (API operations)

// Exported Functions
├── loadTransactions() - Load from API/storage
├── saveTransaction(transaction) - Create/update transaction
├── deleteTransaction(id) - Remove transaction
├── syncQueue() - Offline sync functionality
└── State: { transactions, isLoading, error, isOnline }
```

**Features:**

- Offline-first design with AsyncStorage
- Network state monitoring
- Queue-based sync when reconnecting
- Optimistic updates

**Used By:**

- GoalsScreen.js (transactions data for smart goal suggestions)

#### **useGoals.js** - Goals Management Hook

```javascript
// Dependencies
├── AsyncStorage (offline storage)
├── TrendAPIService (API operations)
└── Goal Service Modules (modular architecture)

// Exported Functions
├── loadGoals() - Load user goals
├── saveGoal(goal) - Create/update goal
├── deleteGoal(id) - Remove goal
├── updateSpendingGoals(transactions) - Auto-update progress
├── getSmartSuggestions(transactions) - AI-powered suggestions
└── State: { goals, suggestions, isLoading, error }
```

**Used By:**

- GoalsScreen.js (primary usage)

#### **Goal Service Architecture** - Modular Goal Management

**useGoalCache.js** - Caching and Local Storage Management
```javascript
// Dependencies
├── AsyncStorage (persistent storage)
└── Goal state management

// Functions
├── getCachedGoals() - Retrieve cached goal data
├── setCachedGoals() - Store goals locally
├── clearGoalCache() - Clear cached data
└── syncCacheWithAPI() - Synchronize local cache with backend
```

**useGoalCalculations.js** - Goal Progress and Financial Calculations
```javascript
// Functions
├── calculateGoalProgress() - Calculate completion percentage
├── calculateProjectedCompletion() - Estimate completion dates
├── calculateRequiredSavings() - Calculate needed savings rate
└── calculateGoalImpact() - Assess goal impact on budget
```

**useGoalData.js** - Backend Goal Data Management
```javascript
// Dependencies
├── TrendAPIService (API operations)
└── Goal data transformation

// Functions
├── fetchGoalsFromAPI() - Retrieve goals from backend
├── saveGoalToAPI() - Persist goal to backend
├── deleteGoalFromAPI() - Remove goal from backend
└── syncGoalData() - Synchronize goal data
```

**useGoalSync.js** - Synchronization and Conflict Resolution
```javascript
// Functions
├── syncGoalWithBackend() - Sync individual goal
├── resolveConflicts() - Handle sync conflicts
├── handleOfflineChanges() - Manage offline modifications
└── batchSync() - Sync multiple goals efficiently
```

**useGoalTransformers.js** - Data Transformation and Formatting
```javascript
// Functions
├── transformGoalForAPI() - Format goal for backend
├── transformGoalForUI() - Format goal for display
├── validateGoalData() - Validate goal structure
└── normalizeGoalData() - Standardize goal format
```

**useGoalValidation.js** - Goal Validation and Error Handling
```javascript
// Functions
├── validateGoalAmount() - Validate monetary amounts
├── validateGoalDate() - Validate target dates
├── validateGoalType() - Validate goal category
└── validateGoalForm() - Comprehensive form validation
```

#### **useOnboarding.js** - Onboarding Flow Hook

```javascript
// Dependencies
├── AsyncStorage (local state)
├── TrendAPIService (backend sync)
└── AuthService (user context)

// Exported Functions
├── loadOnboardingStatus() - Get tutorial status
├── completeTour(tourName) - Mark tutorial complete
├── measureComponent(ref) - Layout measurements
├── checkAndShowOnboarding() - Conditional display
└── State: { onboardingStatus, componentMeasurements }
```

**Used By:**

- HomeContainer.js (tutorial orchestration)

### Container Layer

#### **HomeContainer.js** - Main App Logic Container

```javascript
// Primary Dependencies
├── Services: TrendAPIService, AuthService
├── Hooks: useOnboarding
├── Components: HomeScreen
└── React Navigation: useNavigation, useFocusEffect

// Key State Management
├── userProfile - User account information
├── transactions - Transaction list with resolved categories
├── categories - Available categories/subcategories
├── totalExpenses - Calculated expense total
├── isLoading - Loading states
└── Various UI state (spotlights, modals)

// Major Functions
├── Data Loading
│   ├── loadUserProfile() - User account data
│   ├── loadTransactions() - Transaction history
│   ├── loadCategories() - Category hierarchy
│   └── loadGoals() - Financial goals
├── Data Processing
│   ├── processTransactionsWithCategories() - Resolve category data
│   ├── resolveCategoryForTransaction() - Category lookup logic
│   ├── calculateTotalExpenses() - Period-based calculations
│   └── transformCategoriesForUI() - UI-friendly format
├── Transaction Operations
│   ├── saveTransaction() - Create/update with optimistic updates
│   ├── deleteTransaction() - Remove with confirmation
│   └── handleTransactionUpdate() - Sync with backend
└── UI Management
    ├── handleAddTransaction() - Modal management
    ├── onboarding triggers - Tutorial orchestration
    └── Various event handlers
```

**Data Flow to HomeScreen:**

- Pre-resolved transactions with categoryData
- Transformed categories for UI
- Calculated expense totals
- All event handlers for user interactions

#### **AddTransactionContainer.js** - Transaction Modal Logic

```javascript
// Dependencies
├── TrendAPIService (API operations)
├── AddTransactionModal (UI component)
└── React Navigation hooks

// Form State Management
├── formData - Transaction form fields
├── categories - Available categories
├── selectedCategory/Subcategory - Selection state
├── editMode - Create vs edit mode
└── UI state (loading, validation)

// Key Functions
├── Form Management
│   ├── resetForm() - Clear form state
│   ├── populateFormForEdit() - Pre-fill for editing
│   ├── validateForm() - Form validation
│   └── handleSubmit() - Save transaction
├── Category Management
│   ├── loadCategories() - Fetch available categories
│   ├── handleCategorySelect() - Category selection
│   ├── handleSubcategorySelect() - Subcategory selection
│   └── transformCategoriesForUI() - Format for picker
└── Modal Management
    ├── openModal() - Show transaction modal
    ├── closeModal() - Hide and reset
    └── handleModalComplete() - Success callback
```

**Used By:**

- HomeScreen.js (via FAB and edit actions)

#### **IncomeSetupContainer.js** - Income Setup Logic

```javascript
// Dependencies
├── AsyncStorage (temporary storage)
├── TrendAPIService (profile updates)
└── IncomeSetupScreen (UI component)

// State Management
├── incomeData - Form data (amount, frequency, nextPayDate)
├── editMode - Setup vs edit mode
├── isLoading - Save state
└── validationErrors - Form validation

// Key Functions
├── saveIncomeData() - Persist to backend
├── loadExistingData() - Pre-fill for editing
├── validateForm() - Income validation
└── handleComplete() - Navigation after save
```

**Used By:**

- AppNavigator.js (setup flow)

#### **DiscretionaryContainer.js** - Discretionary Spending Analysis Logic

```javascript
// Dependencies
├── Services: TrendAPIService (discretionary breakdown API)
├── Components: DiscretionaryBreakdown (UI component)
├── React: useState, useEffect, useCallback, useRef
└── React Navigation: useFocusEffect

// Key State Management
├── discretionaryData - Backend discretionary breakdown data
├── selectedDate - Selected date for analysis
├── selectedPeriod - Time period (daily/weekly/monthly)
├── expandedCategories - UI state for category expansion
├── showCalendar - Calendar modal visibility
└── isLoading/refreshing - Loading states

// Major Functions
├── Date Management
│   ├── formatDateForAPI() - Local timezone date formatting
│   ├── formatDateTimeForAPI() - DateTime with time component
│   ├── createLocalDateRange() - Timezone-safe date ranges
│   └── formatPeriodLabel() - Human-readable date labels
├── Data Loading
│   ├── loadDiscretionaryData() - Fetch breakdown from backend
│   └── handleRefresh() - Pull-to-refresh functionality
├── Event Handlers
│   ├── handleDateChange() - Calendar date selection
│   ├── handleCategoryPress() - Category expand/collapse
│   ├── handleCalendarOpen() - Show calendar modal
│   └── handleClose() - Modal close and cleanup
└── Data Processing
    ├── processedBreakdownData() - Transform for UI consumption
    └── Category/subcategory processing with Map/Array conversion
```

**Data Flow to DiscretionaryBreakdown:**

- Timezone-safe date ranges for API calls
- Processed breakdown data with resolved categories
- Formatted chart data and statistics
- All event handlers for user interactions

#### **SpendingVelocityContainer.js** - Spending Velocity Analysis Logic

```javascript
// Dependencies
├── Services: TrendAPIService (spending velocity API)
├── Components: SpendingVelocityBreakdown (UI component)
├── Storage: AsyncStorage (profile caching)
└── React Navigation: useFocusEffect

// Key State Management
├── userProfile - User profile data
├── analyticsData - Backend analytics data
├── spendingVelocityData - Processed velocity data
├── selectedPeriod - Time period selection
├── isLoading - Loading states
└── UI state (showBreakdown, refreshing)

// Major Functions
├── Data Loading
│   ├── loadUserProfile() - User profile with income data
│   ├── loadAnalyticsData() - Backend analytics data
│   └── getDateRange() - Period-based date calculations
├── Data Processing
│   ├── processSpendingVelocityData() - Transform for UI
│   ├── Weekly trend calculations
│   └── Velocity metrics and projections
├── Event Handlers
│   ├── handlePeriodChange() - Period selection
│   ├── handleRefresh() - Data refresh
│   └── handleClose() - Modal management
└── Lifecycle Management
    ├── App state monitoring
    ├── Focus effect handling
    └── Component cleanup
```

**Used By:**

- AnalyticsScreen.js (spending velocity modal)

#### **CategoryContainer.js** - Category Management Logic

```javascript
// Dependencies
├── Services: TrendAPIService (category CRUD operations)
├── Components: CategoryPicker (UI component)
├── React Navigation: useNavigation
└── React: useState, useEffect, useCallback

// Key State Management
├── categories - Available categories with subcategories
├── selectedCategory/Subcategory - Current selection
├── currentSubcategoryData - Selected category data
├── isLoading - Loading states
└── errorState - Error handling

// Major Functions
├── Data Transformation
│   ├── transformCategoriesForUI() - Backend to UI format
│   └── getCategoryById() - Category lookup utility
├── Backend Integration
│   ├── loadCategories() - Fetch all categories
│   ├── handleAddCategory() - Create new category
│   └── handleAddSubcategory() - Create new subcategory
├── Navigation & Selection
│   ├── handleCategorySelect() - Category selection
│   ├── handleSubcategorySelect() - Subcategory selection
│   ├── handleNavigateToSubcategories() - Drill-down navigation
│   └── handleBackToCategories() - Navigation back
└── Lifecycle Management
    ├── Component mounting/unmounting
    └── Conditional data loading
```

**Used By:**

- AddTransactionContainer.js (category selection)
- Other containers requiring category selection

### Screen Layer

#### **HomeScreen.js** - Main App Interface

```javascript
// Dependencies (Pure UI Component)
├── Components: BalanceCard, TransactionList, AddTransactionContainer
├── Onboarding: Spotlight, SpotlightMask
└── React Native: Core UI components

// Props from HomeContainer
├── userProfile - User account data
├── transactions - Pre-resolved transaction list
├── categories - Available categories
├── totalExpenses - Calculated totals
├── onboardingStatus - Tutorial state
├── componentMeasurements - Layout data
└── Event handlers - All user interactions

// UI Structure
├── Header with balance card
├── Transaction list (daily + recurring)
├── Floating action button
├── Onboarding spotlights (conditional)
└── Add transaction modal
```

#### **AnalyticsContainer.js** - Analytics Business Logic Container

```javascript
// Dependencies
├── Services: TrendAPIService (backend analytics)
├── Components: AnalyticsScreen (UI component)
├── AsyncStorage: Pro status and caching
└── React Navigation: useFocusEffect

// Key State Management
├── analyticsData - Backend-provided analytics data
├── selectedPeriod - Time period selection (daily/weekly/monthly)
├── comparisonMode - Previous period comparison toggle
├── isPro - Pro feature access status
├── isLoading - Loading states
└── UI state (refreshing, showBreakdown)

// Major Functions
├── Data Loading
│   ├── loadAnalyticsData() - Fetch from backend API
│   ├── getDateRange() - Calculate period date ranges
│   └── checkProStatus() - Pro feature availability
├── Data Processing
│   ├── processedData() - Transform backend data for UI
│   ├── Chart data formatting
│   └── Statistics calculations
├── Event Handlers
│   ├── handlePeriodChange() - Period selection
│   ├── handleComparisonToggle() - Comparison mode
│   ├── handleDiscretionaryClick() - Pro feature access
│   └── handleRefresh() - Data refresh
└── Lifecycle Management
    ├── App state monitoring
    ├── Focus effect handling
    └── Component cleanup
```

**Data Flow to AnalyticsScreen:**

- Backend analytics data with minimal transformation
- Processed chart data and statistics
- All event handlers for user interactions
- Pro status and feature availability

#### **AnalyticsScreen.js** - Analytics Dashboard UI

```javascript
// Dependencies (Pure UI Component)
├── Components: DiscretionaryBreakdown
├── Charts: react-native-chart-kit
├── Styling: colors, globalStyles
└── React Native: Core UI components

// Props from AnalyticsContainer
├── analyticsData - Backend-provided data
├── data - Processed chart data
├── statistics - Calculated statistics
├── selectedPeriod - Current time period
├── comparisonMode - Comparison toggle state
├── isPro - Pro feature status
└── Event handlers - All user interactions

// UI Features
├── Period selector (daily/weekly/monthly)
├── Spending charts and graphs
├── Statistics cards with comparisons
├── Insight cards with recommendations
├── Discretionary spending breakdown (Pro)
└── Pull-to-refresh functionality
```

#### **GoalsScreen.js** - Goals Management

```javascript
// Dependencies
├── Hooks: useGoals, useTransactions
├── Components: AddGoalModal, GoalCard, GoalSuggestionsCard
└── React Native: ScrollView, etc.

// Hook Integration
├── useGoals() - Goal CRUD operations
└── useTransactions() - Spending data for progress

// UI Structure
├── Goal list with progress bars
├── Add goal modal
├── Smart suggestions card
└── Goal completion celebrations
```

### Component Layer (Key Components)

#### **DiscretionaryBreakdown.js** - Discretionary Spending Analysis UI

```javascript
// Dependencies
├── SpendingVelocityBreakdown (nested component)
├── React Native: Modal, Charts, Animations
├── styles/colors (theming)
└── React Native Chart Kit (data visualization)

// Props Interface
├── visible - Modal visibility state
├── breakdownData - Processed discretionary data
├── selectedDate - Current selected date
├── selectedPeriod - Time period (daily/weekly/monthly)
├── expandedCategories - Category expansion state
├── showCalendar - Calendar modal state
├── Event handlers - All user interactions
└── isLoading/refreshing - Loading states

// Features
├── Modal-based discretionary spending breakdown
├── Category-wise spending analysis with subcategories
├── Interactive charts and visualizations
├── Calendar date selection
├── Expandable category details
├── Pull-to-refresh functionality
└── Spending velocity integration
```

#### **SpendingVelocityBreakdown.js** - Spending Velocity Analysis UI

```javascript
// Dependencies
├── React Native: ScrollView, Charts
├── styles/colors (theming)
└── Date formatting utilities

// Props Interface
├── spendingVelocityData - Processed velocity data
├── selectedPeriod - Time period selection
├── userProfile - User income data
├── Event handlers - User interactions
└── isLoading - Loading state

// Features
├── Weekly spending trend analysis
├── Velocity calculations and projections
├── Visual spending pace indicators
├── Income-based spending recommendations
├── Historical trend comparisons
└── Interactive period selection
```

#### **Onboarding Spotlight Components**

**AddTransactionSpotlight.js**, **BalanceCardSpotlight.js**, **TransactionSwipeSpotlight.js**

```javascript
// Dependencies
├── React Native: Animated, Dimensions, Modal
└── styles/colors (theming)

// Props Interface
├── visible - Spotlight visibility
├── targetRef - Component reference for positioning
├── onNext/onSkip - Navigation handlers
├── measurements - Layout measurements
└── Animation controls

// Features
├── Contextual tutorial overlays
├── Precise component targeting
├── Animated spotlight effects with masking
├── Step-by-step user guidance
├── Skippable tutorial flows
└── Responsive positioning
```

#### **BalanceCard.js** - Income/Expense Display

```javascript
// Dependencies
├── styles/colors (theming)
└── React Native core components

// Props Interface
├── incomeData - User income information
├── totalExpenses - Calculated expense total
├── goals - Financial goals for progress
├── leftToSpend - Calculated remaining budget
├── nextPayDate - Next income date
└── onIncomePress - Edit income handler

// Features
├── Income/expense balance display
├── Pay period information
├── Goal progress indicators
└── "Left to Spend" calculations
```

#### **TransactionList.js** - Transaction Display

```javascript
// Dependencies
├── TransactionCard (individual transactions)
└── React Native: FlatList, SectionList

// Props Interface
├── transactions - Pre-resolved with categoryData
├── onTransactionEdit - Edit handler
├── onTransactionDelete - Delete handler
└── categories - Available categories

// Features
├── Daily/recurring transaction grouping
├── Optimized rendering with FlatList
├── Section headers for dates
└── Empty state handling
```

#### **TransactionCard.js** - Individual Transaction Display

```javascript
// Dependencies
├── React Native Gesture Handler (swipe actions)
├── styles/colors (theming)
└── Vector icons

// Props Interface
├── transaction - Transaction object
├── categoryData - Pre-resolved category information
├── onEdit - Edit handler
├── onDelete - Delete handler
└── showDate - Date display toggle

// Features
├── Swipe-to-edit/delete actions
├── Category icon and color display
├── Amount formatting
├── Recurrence indicators
└── Date/time display
```

#### **AddTransactionModal.js** - Transaction Input

```javascript
// Dependencies
├── CalendarModal (date selection)
├── CategoryPicker (category selection)
└── React Native: Modal, animations

// Multi-Screen Modal Structure
├── Screen 1: Transaction form (amount, description)
├── Screen 2: Category picker
├── Screen 3: Subcategory picker (if applicable)
├── Screen 4: Calendar (date selection)
└── Integrated recurrence options

// Features
├── Animated screen transitions
├── Form validation
├── Auto-description suggestions
├── Create vs edit mode handling
└── Gesture-based navigation
```

### Style System

#### **colors.js** - Color Palette

```javascript
// Comprehensive Color System
├── Primary Colors (brand colors)
├── Background Colors (light/dark themes)
├── Text Colors (hierarchy)
├── Transaction Colors (income/expense)
├── Status Colors (success/error/warning)
├── Category Colors (visual categorization)
└── UI Element Colors (borders, shadows)
```

**Used By:** All UI components for consistent theming

#### **globalStyles.js** - Global Styles

```javascript
// Dependencies
├── colors.js (color palette)

// Style Categories
├── Layout styles (margins, padding, flex)
├── Typography styles (fonts, sizes, weights)
├── Component styles (common patterns)
└── Utility styles (shadows, borders)
```

### Utility Layer

#### **currencyHelper.js** - Currency Formatting Utilities

```javascript
// Currency formatting and calculation utilities
├── formatCurrency() - Format numbers as currency
├── parseCurrency() - Parse currency strings to numbers
├── calculateTotals() - Financial calculations
└── roundToTwoDecimal() - Precise decimal handling
```

#### **dateHelper.js** - Date Manipulation Utilities

```javascript
// Date formatting and calculation utilities
├── formatDate() - Human-readable date formatting
├── getDateRange() - Period-based date calculations
├── isToday() - Date comparison utilities
├── addDays/Weeks/Months() - Date arithmetic
└── timezoneUtils() - Timezone-safe operations
```

#### **storage.js** - AsyncStorage Utilities

```javascript
// AsyncStorage wrapper utilities
├── storeData() - Store data with error handling
├── getData() - Retrieve data with fallbacks
├── removeData() - Delete stored data
├── clearAll() - Clear all stored data
└── storageKeys - Centralized storage key management
```

#### **Data Layer**

#### **categories.js** - Default Category Data

```javascript
// Static category definitions
├── defaultCategories - System category definitions
├── categoryIcons - Icon mappings
├── categoryColors - Color schemes
└── subcategoryTemplates - Default subcategory structures
```

## Data Flow Patterns

### Authentication Flow

```
1. App Launch
   └── AppNavigator.checkInitialRoute()
       └── AuthService.initialize()
           └── AsyncStorage.getItem('authToken')

2. If No Token
   └── Navigate to AuthContainer
       └── AuthFlow (UI)
           └── User Login/Register
               └── AuthService.login()
                   └── TrendAPIService.login()
                       └── Store token in AsyncStorage
                           └── Navigate to Main App

3. If Token Exists
   └── Validate token with backend
       └── Load user profile
           └── Determine next screen (Welcome/Setup/Main)
```

### Transaction Creation Flow

```
1. HomeScreen FAB Press
   └── HomeContainer.handleAddTransaction()
       └── AddTransactionContainer.openModal()

2. User Fills Form
   └── AddTransactionModal screens
       └── Form validation
           └── AddTransactionContainer.handleSubmit()

3. Save Transaction
   └── TrendAPIService.createTransaction()
       └── Optimistic UI update
           └── HomeContainer.saveTransaction()
               └── Update local state
                   └── HomeScreen re-renders

4. Background Sync
   └── API response
       └── Confirm optimistic update
           └── Update local storage
```

### Category Resolution Flow

```
1. HomeContainer.loadTransactions()
   └── TrendAPIService.getTransactions()
       └── Raw transactions without category data

2. HomeContainer.processTransactionsWithCategories()
   └── For each transaction:
       └── resolveCategoryForTransaction()
           ├── Check direct subcategory object
           ├── Check direct category object
           ├── Lookup by subcategoryId
           ├── Lookup by categoryId
           └── Fallback to default category

3. Enhanced Transactions
   └── Transactions with pre-resolved categoryData
       └── Pass to HomeScreen
           └── TransactionList
               └── TransactionCard (ready for display)
```

### Onboarding Flow

```
1. HomeContainer initialization
   └── useOnboarding.loadOnboardingStatus()
       └── TrendAPIService.getOnboardingStatus()

2. Component Mount
   └── useOnboarding.checkAndShowOnboarding()
       └── Measure component layouts
           └── Calculate spotlight positions

3. Tutorial Display
   └── HomeScreen conditional rendering
       └── Spotlight components
           └── User interaction
               └── useOnboarding.completeTour()
                   └── TrendAPIService.markOnboardingTourComplete()
```

## Configuration and Setup

### **package.json** - Project Dependencies

```javascript
// Core React Native
├── react: 19.0.0
├── react-native: 0.79.2

// Navigation
├── @react-navigation/native: ^7.1.9
├── @react-navigation/stack: ^7.3.2
├── @react-navigation/bottom-tabs: ^7.3.13

// Storage & Network
├── @react-native-async-storage/async-storage: ^2.1.2
├── @react-native-community/netinfo: ^11.4.1

// UI Components
├── react-native-vector-icons: ^10.2.0
├── react-native-chart-kit: ^6.12.0
├── react-native-svg: ^15.12.0

// Utilities
├── date-fns: ^4.1.0
├── lodash: ^4.17.21
├── uuid: ^11.1.0

// State Management (Unused in current implementation)
├── @reduxjs/toolkit: ^2.8.2
├── react-redux: ^9.2.0
├── redux-persist: ^6.0.0
```

### **Build Configuration**

#### **babel.config.js**

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```

#### **metro.config.js**

```javascript
// Standard React Native Metro configuration
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const config = {};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

#### **app.json**

```javascript
{
  "name": "BudgetApp",
  "displayName": "BudgetApp"
}
```

#### **tsconfig.json**

```javascript
// TypeScript configuration (minimal)
{
  "extends": "@react-native/typescript-config/tsconfig.json"
}
```

### **Scripts**

```javascript
// Development Commands
├── "start": "react-native start" - Metro bundler
├── "android": "react-native run-android" - Android build
├── "ios": "react-native run-ios" - iOS build
├── "lint": "eslint ." - Code linting
└── "test": "jest" - Test runner
```

## Development Guidelines

### Key Architectural Decisions

1. **Container-Component Pattern**

   - Containers handle business logic and state
   - Components are pure UI with props
   - Clear separation of concerns

2. **Service Layer Abstraction**

   - Single API service for all backend operations
   - Authentication service for auth management
   - Specialized services for domain logic

3. **Hook-Based State Management**

   - Custom hooks for domain-specific logic
   - No Redux - using React state + hooks
   - Clean, reusable business logic

4. **Offline-First Design**

   - AsyncStorage as primary data store
   - API as synchronization layer
   - Optimistic updates for better UX

5. **Pre-Resolution Pattern**
   - Resolve complex relationships at container level
   - Pass down pre-processed data
   - Eliminate prop drilling and repetitive logic

### Code Quality Patterns

- **Singleton Services**: Consistent state management
- **Progressive Enhancement**: Graceful degradation when offline
- **Optimistic Updates**: Immediate UI feedback
- **Layout Measurements**: Precise onboarding positioning
- **Form Validation**: Multiple validation layers
- **Error Boundaries**: Graceful error handling

## File Status Notes

### Utility Consolidation
Some utility functions originally planned as separate files have been consolidated:
- **dateUtils.js** - Date utilities integrated into dateHelper.js
- **formatting.js** - Formatting utilities integrated into currencyHelper.js and other files
- **validation.js** - Validation logic integrated into services and containers

### Simplified Component Architecture
The spotlight system has been simplified:
- **Spotlight.js** and **SpotlightMask.js** - Functionality integrated directly into individual spotlight components
- **RecurrencePickerModal.js** - Recurrence functionality integrated into AddTransactionModal.js

### Documentation Status
- **File counts updated** to reflect actual implementation (15 components, 9 hooks including goal services)
- **Architecture patterns** remain consistent with original design
- **Data flow and interaction patterns** accurately documented
- **Recent enhancements** added to feature set
- **Goal Service Architecture** - New modular goal management system documented
- **Backend Integration** - Updated to reflect full backend integration for savings goals
- **Recent commits** - Documentation updated with latest 5 commits and file changes

---

This documentation provides a complete understanding of the BudgetApp architecture, file interactions, and development patterns. The codebase demonstrates solid React Native practices with clean separation of concerns and maintainable architecture.
