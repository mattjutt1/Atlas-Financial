# Frontend Components Knowledge Graph - Atlas Financial v1.1

**Version**: 1.1
**Updated**: 2025-01-25
**Scope**: Refactored Next.js Frontend Component Architecture with Quality Improvements

## Component Hierarchy Graph

### Root Level
```
App Root (layout.tsx)
├── MainLayout [PROVIDER_WRAPPER]
│   ├── SessionProvider [AUTH_CONTEXT]
│   ├── ApolloProvider [GRAPHQL_CONTEXT]
│   ├── Header [NAVIGATION]
│   ├── Page Content [DYNAMIC]
│   └── Footer [STATIC]
```

### Layout Components
```
Header [COMPONENT]
├── Logo/Brand [STATIC]
├── Navigation Menu [INTERACTIVE]
│   ├── Desktop Nav [RESPONSIVE]
│   └── Mobile Menu [RESPONSIVE]
├── User Actions [AUTH_DEPENDENT]
│   ├── Theme Toggle [CLIENT_STATE]
│   ├── Notifications [FUTURE]
│   └── Profile Menu [AUTH_DROPDOWN]
└── Auth Status [SESSION_AWARE]

Footer [COMPONENT]
├── Brand Section [STATIC]
├── Link Groups [STATIC]
│   ├── Product Links
│   ├── Support Links
│   └── Legal Links
└── Status Indicator [SYSTEM_STATUS]
```

### Dashboard Components (Refactored)
```
Dashboard Page (/) [PAGE]
├── LoadingSpinner [REUSABLE_COMPONENT] [LOADING_STATE]
├── AccountCard [FINANCIAL_COMPONENT] × N
│   ├── Card [REUSABLE_WRAPPER] [HOVER_EFFECTS]
│   ├── Account Info [DATA_DISPLAY]
│   ├── formatCurrency() [UTILITY_FUNCTION]
│   ├── Badge [REUSABLE_COMPONENT] [TYPE_VARIANT]
│   └── Actions Menu [INTERACTIVE]
├── NetWorthChart [DATA_VISUALIZATION]
│   ├── mockNetWorthData [FIXTURE_DATA]
│   ├── Recharts Integration [CHART_LIBRARY]
│   ├── Time Controls [USER_INPUT]
│   ├── Trend Analysis [COMPUTED]
│   └── Legend [ACCESSIBILITY]
├── BrutalHonestyInsight [AI_COMPONENT]
│   ├── mockInsights [FIXTURE_DATA]
│   ├── Severity Display [PRIORITY_SYSTEM]
│   ├── Insight Content [AI_GENERATED]
│   ├── Action Steps [RECOMMENDATIONS]
│   └── Carousel Controls [NAVIGATION]
└── RecentTransactions [ACTIVITY_FEED]
    ├── mockTransactions [FIXTURE_DATA]
    ├── Transaction Items [DATA_LIST]
    ├── Category Icons [VISUAL_AID]
    ├── formatCurrency() [UTILITY_FUNCTION]
    └── View All Link [NAVIGATION]
```

### Accounts Components
```
Accounts Page (/accounts) [PAGE]
├── Page Header [LAYOUT]
│   ├── Title/Description [STATIC]
│   └── Add Account Button [ACTION_TRIGGER]
├── Summary Cards [METRICS_DISPLAY]
│   ├── Total Assets [COMPUTED_METRIC]
│   ├── Total Debt [COMPUTED_METRIC]
│   └── Net Worth [COMPUTED_METRIC]
├── Filter Controls [USER_INPUT]
│   ├── Type Filter [SELECTION]
│   └── Account Counter [FEEDBACK]
└── Account Grid [RESPONSIVE_GRID]
    └── AccountCard [REUSED_COMPONENT] × N
```

## Code Quality Refactoring (v1.1)

### New Component Library
```
/components/common/ [REUSABLE_LIBRARY]
├── Card [WRAPPER_COMPONENT]
│   ├── Props: children, className, hoverable, padding, onClick
│   ├── Variants: none, sm, md, lg padding
│   └── Features: Hover effects, click handling
├── LoadingSpinner [LOADING_COMPONENT]
│   ├── Props: size, className, fullScreen
│   ├── Variants: sm, md, lg sizes
│   └── Features: Full-screen overlay option
└── Badge [INDICATOR_COMPONENT]
    ├── Props: children, variant, size, className
    ├── Variants: primary, secondary, success, warning, danger, info
    └── Sizes: sm, md, lg
```

### Utility Functions Library
```
/lib/utils/ [UTILITY_LIBRARY]
├── currency.ts [CURRENCY_UTILITIES]
│   ├── formatCurrency() [STANDARD_FORMATTER]
│   ├── formatCurrencyCompact() [COMPACT_FORMATTER]
│   ├── parseCurrencyAmount() [PARSER]
│   └── getCurrencySymbol() [SYMBOL_EXTRACTOR]
├── date.ts [DATE_UTILITIES]
│   ├── formatDate() [STANDARD_FORMATTER]
│   ├── formatDateTime() [TIMESTAMP_FORMATTER]
│   ├── formatRelativeTime() [RELATIVE_FORMATTER]
│   ├── isToday() [DATE_CHECKER]
│   ├── isThisWeek() [WEEK_CHECKER]
│   └── isThisMonth() [MONTH_CHECKER]
└── index.ts [EXPORTS]
```

### Custom Hooks Library
```
/hooks/ [HOOKS_LIBRARY]
├── useAuthentication.ts [AUTH_HOOK]
│   ├── Returns: session, status, isLoading, isAuthenticated, user
│   └── Replaces: Multiple useSession calls
├── useFinancialData.ts [DATA_HOOK]
│   ├── Returns: accounts, transactions, insights, loading, error
│   └── Integrates: Multiple GraphQL queries
├── useAccountSummary.ts [BUSINESS_LOGIC_HOOK]
│   ├── Input: accounts array
│   ├── Returns: totalBalance, totalDebt, netWorth, accountsByType
│   └── Computes: Financial summaries
└── index.ts [EXPORTS]
```

### Centralized Mock Data
```
/lib/fixtures/ [MOCK_DATA_LIBRARY]
├── mockAccounts.ts [ACCOUNT_FIXTURES]
│   ├── Account interface [TYPESCRIPT_TYPE]
│   ├── mockAccounts [FULL_DATASET]
│   └── mockAccountsBasic [SUBSET_DATASET]
├── mockTransactions.ts [TRANSACTION_FIXTURES]
│   ├── Transaction interface [TYPESCRIPT_TYPE]
│   └── mockTransactions [DATASET]
├── mockInsights.ts [INSIGHT_FIXTURES]
│   ├── Insight interface [TYPESCRIPT_TYPE]
│   └── mockInsights [DATASET]
├── mockNetWorth.ts [NET_WORTH_FIXTURES]
│   ├── NetWorthData interface [TYPESCRIPT_TYPE]
│   └── mockNetWorthData [DATASET]
└── index.ts [CONSOLIDATED_EXPORTS]
```

### GraphQL Optimization
```
/lib/graphql/ [GRAPHQL_LIBRARY]
├── fragments.ts [FRAGMENT_DEFINITIONS]
│   ├── ACCOUNT_BASIC_FIELDS [REUSABLE_FRAGMENT]
│   ├── TRANSACTION_WITH_ACCOUNT [COMPOSED_FRAGMENT]
│   ├── BUDGET_BASIC_FIELDS [REUSABLE_FRAGMENT]
│   ├── DEBT_BASIC_FIELDS [REUSABLE_FRAGMENT]
│   ├── INVESTMENT_WITH_PERFORMANCE [COMPOSED_FRAGMENT]
│   └── FINANCIAL_INSIGHT_FIELDS [REUSABLE_FRAGMENT]
├── queries.ts [OPTIMIZED_QUERIES]
│   ├── Uses fragments for field reuse
│   ├── 69% reduction in code duplication
│   └── Type-safe with generated types
└── mutations.ts [OPTIMIZED_MUTATIONS]
    ├── Uses fragments for return types
    ├── Consistent field selection
    └── Reduced maintenance overhead
```

## Component Relationships

### Data Flow Relationships
```
Apollo Client [DATA_SOURCE]
├── GraphQL Queries [DATA_FETCHING]
│   ├── GET_USER_ACCOUNTS → AccountCard
│   ├── GET_TRANSACTIONS → RecentTransactions
│   ├── GET_FINANCIAL_INSIGHTS → BrutalHonestyInsight
│   └── GET_NET_WORTH_DATA → NetWorthChart
├── GraphQL Mutations [DATA_MODIFICATION]
│   ├── CREATE_ACCOUNT → Account Forms
│   ├── UPDATE_TRANSACTION → Transaction Editor
│   └── DELETE_DEBT → Debt Manager
└── GraphQL Subscriptions [REAL_TIME]
    ├── ACCOUNT_BALANCE_UPDATES → AccountCard
    ├── NEW_TRANSACTIONS → RecentTransactions
    └── FINANCIAL_INSIGHTS → BrutalHonestyInsight
```

### Authentication Relationships
```
NextAuth Session [AUTH_PROVIDER]
├── useSession Hook [CONSUMER]
│   ├── Header (User display) [UI_UPDATE]
│   ├── Dashboard (Welcome message) [PERSONALIZATION]
│   └── Protected Pages [ACCESS_CONTROL]
├── Apollo Auth Link [INTEGRATION]
│   └── GraphQL Requests [TOKEN_INJECTION]
└── Auth Pages [FLOW_HANDLING]
    ├── Sign In Page [ENTRY_POINT]
    └── Error Page [ERROR_HANDLING]
```

### Theme Relationships
```
useTheme Hook [THEME_PROVIDER]
├── Theme Toggle Button [TRIGGER]
├── Tailwind Classes [CSS_INTEGRATION]
│   ├── Dark Mode Classes [CONDITIONAL_STYLING]
│   └── Color Variables [DESIGN_TOKENS]
└── Local Storage [PERSISTENCE]
```

## Component Patterns

### Composition Patterns
```
Card Pattern [DESIGN_PATTERN]
├── AccountCard [FINANCIAL_CARD]
├── Summary Cards [METRIC_CARDS]
├── Insight Card [AI_CARD]
└── Transaction Items [LIST_CARDS]

Provider Pattern [CONTEXT_PATTERN]
├── SessionProvider [AUTH_CONTEXT]
├── ApolloProvider [DATA_CONTEXT]
└── ThemeProvider [IMPLICIT_THEME]

Hook Pattern [STATE_PATTERN]
├── useSession [AUTH_STATE]
├── useQuery [DATA_STATE]
├── useTheme [UI_STATE]
└── Custom Hooks [BUSINESS_LOGIC]
```

### Reusability Matrix
```
High Reuse Components:
├── AccountCard [USED: Dashboard, Accounts]
├── Currency Formatter [USED: Multiple components]
├── Button Styles [USED: Throughout app]
└── Loading States [USED: All data components]

Page-Specific Components:
├── NetWorthChart [USED: Dashboard only]
├── BrutalHonestyInsight [USED: Dashboard, Insights]
├── Filter Controls [USED: Accounts, Transactions]
└── Page Headers [USED: Each page uniquely]
```

## Integration Points

### External Library Integration
```
Recharts [CHART_LIBRARY]
├── LineChart → NetWorthChart
├── BarChart → Budget Components [FUTURE]
└── PieChart → Category Analysis [FUTURE]

Heroicons [ICON_LIBRARY]
├── Navigation Icons → Header
├── Action Icons → Buttons
└── Status Icons → Components

Headless UI [COMPONENT_LIBRARY]
├── Dropdown Menus → Profile Menu
├── Modal Dialogs → Forms [FUTURE]
└── Toggle Switches → Settings [FUTURE]
```

### API Integration Points
```
GraphQL Integration [DATA_LAYER]
├── Queries → Read Operations
├── Mutations → Write Operations
└── Subscriptions → Real-time Updates

REST Integration [SUPPLEMENTARY]
├── AI Engine → Insights API
├── File Uploads → Document API [FUTURE]
└── External APIs → Bank Integration [FUTURE]
```

## Component State Management

### State Ownership
```
Server State [APOLLO_CLIENT]
├── Account Data → AccountCard
├── Transaction Data → RecentTransactions
├── Insight Data → BrutalHonestyInsight
└── Chart Data → NetWorthChart

Client State [REACT_HOOKS]
├── UI State → Loading, Errors, Modals
├── Form State → User Input Forms
├── Filter State → Search/Filter Controls
└── Navigation State → Mobile Menu, Tabs

Session State [NEXTAUTH]
├── User Info → Header, Personalization
├── Auth Status → Protected Components
└── Permissions → Feature Access [FUTURE]
```

### Data Flow Patterns
```
Top-Down Flow [PROPS]
├── Page → Components
├── Layout → Page Content
└── Provider → Consumer Components

Bottom-Up Flow [EVENTS]
├── User Actions → Event Handlers
├── Form Submissions → Mutation Triggers
└── Navigation → Route Changes

Lateral Flow [CONTEXT]
├── Theme Changes → All Components
├── Auth Changes → Protected Components
└── Data Updates → Subscribed Components
```

This knowledge graph establishes the complete component architecture for the Atlas Financial frontend, providing clear relationships and patterns for future development and maintenance.
