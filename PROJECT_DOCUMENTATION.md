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
│   ├── components/          # Reusable UI Components (14 files)
│   │   ├── AddGoalModal.js
│   │   ├── AddTransactionModal.js
│   │   ├── BalanceCard.js
│   │   ├── CalendarModal.js
│   │   ├── CategoryPicker.js
│   │   ├── DiscretionaryBreakdown.js
│   │   ├── GoalCard.js
│   │   ├── GoalSuggestionsCard.js
│   │   ├── RecurrencePickerModal.js
│   │   ├── Spotlight.js
│   │   ├── SpotlightMask.js
│   │   ├── TransactionCard.js
│   │   ├── TransactionList.js
│   │   └── WelcomeFlow.js
│   │
│   ├── containers/          # Business Logic Containers (5 files)
│   │   ├── AddTransactionContainer.js
│   │   ├── AnalyticsContainer.js
│   │   ├── CategoryContainer.js
│   │   ├── HomeContainer.js
│   │   └── IncomeSetupContainer.js
│   │
│   ├── data/               # Static Data (1 file)
│   │   └── index.js        # Empty file
│   │
│   ├── hooks/              # Custom React Hooks (3 files)
│   │   ├── useGoals.js
│   │   ├── useOnboarding.js
│   │   └── useTransactions.js
│   │
│   ├── navigation/         # Navigation Configuration (1 file)
│   │   └── AppNavigator.js
│   │
│   ├── screens/            # Screen Components (7 files)
│   │   ├── AnalyticsScreen.js
│   │   ├── AuthContainer.js
│   │   ├── AuthFlow.js
│   │   ├── GoalsScreen.js
│   │   ├── HomeScreen.js
│   │   ├── IncomeSetupScreen.js
│   │   └── SettingsScreen.js
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
│   └── utils/              # Utility Functions (3 files, empty)
│       ├── dateUtils.js
│       ├── formatting.js
│       └── validation.js
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
└── TrendAPIService (API operations)

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
├── RecurrencePickerModal (repeat options)
└── React Native: Modal, animations

// Multi-Screen Modal Structure
├── Screen 1: Transaction form (amount, description)
├── Screen 2: Category picker
├── Screen 3: Subcategory picker (if applicable)
├── Screen 4: Recurrence picker
└── Screen 5: Calendar (date selection)

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

This documentation provides a complete understanding of the BudgetApp architecture, file interactions, and development patterns. The codebase demonstrates solid React Native practices with clean separation of concerns and maintainable architecture.
