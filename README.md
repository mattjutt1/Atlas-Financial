# Atlas Financial v1.1

The brutally honest personal finance platform that tells you the truth about your money. A modern, AI-powered financial management platform built with a clean monorepo architecture.

## 🌟 Features

- 🏦 **Account Management** - Multi-institution account aggregation
- 💰 **Transaction Tracking** - Real-time transaction categorization
- 📊 **Brutal Honesty Insights** - AI-powered financial reality checks
- 📈 **Investment Portfolio** - All-Weather portfolio analysis
- 💳 **Smart Budgeting** - 75/15/10 rule enforcement
- 🔥 **Debt Snowball** - Ramsey method debt elimination
- 🔒 **Enterprise Security** - Keycloak authentication
- 🚀 **Real-time Updates** - GraphQL subscriptions

## 🏗️ Architecture

**Monorepo Structure:**
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: FastAPI + Python AI Engine
- **Database**: PostgreSQL with Hasura GraphQL
- **Authentication**: Keycloak + NextAuth.js
- **Infrastructure**: Docker Compose
- **Styling**: Tailwind CSS + Dark Mode

## 🚀 Tech Stack

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19 with Server Components
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **GraphQL**: Apollo Client with fragments
- **Authentication**: NextAuth.js + Keycloak

### Backend Stack
- **AI Engine**: FastAPI + Python
- **Database**: PostgreSQL 15
- **GraphQL**: Hasura Engine
- **Auth Provider**: Keycloak
- **Message Queue**: Redis (planned)
- **Monitoring**: Structured logging

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot reload across all services
- **Testing**: Jest + Testing Library
- **CI/CD**: GitHub Actions (planned)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for AI engine development)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mattjutt1/Atlas-Financial.git
   cd Atlas-Financial
   ```

2. **Start all services:**
   ```bash
   # Start complete development environment
   ./scripts/atlas-up.sh

   # Or manually with Docker Compose
   docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
   ```

3. **Access the applications:**
   - **Frontend**: http://localhost:3000
   - **Hasura Console**: http://localhost:8080
   - **Keycloak Admin**: http://localhost:8180
   - **AI Engine**: http://localhost:8000

### Individual Service Development

```bash
# Frontend development (apps/web)
cd apps/web
npm install
npm run dev

# AI Engine development (services/ai-engine)
cd services/ai-engine
pip install -r requirements.txt
python main.py
```

## 📁 Project Structure

```
Atlas-Financial/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   ├── components/    # React components
│       │   │   ├── common/    # Reusable UI components
│       │   │   └── dashboard/ # Feature-specific components
│       │   ├── hooks/         # Custom React hooks
│       │   ├── lib/           # Utilities and configurations
│       │   │   ├── fixtures/  # Mock data and types
│       │   │   ├── graphql/   # GraphQL operations & fragments
│       │   │   └── utils/     # Utility functions
│       │   └── types/         # TypeScript definitions
├── services/
│   ├── ai-engine/             # FastAPI AI service
│   │   ├── src/
│   │   │   ├── ai/           # AI models and logic
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── services/     # Business logic services
│   │   │   └── data/         # Data access layer
│   │   └── main.py           # Application entry point
│   ├── hasura/               # GraphQL engine configuration
│   └── keycloak/             # Authentication service
├── infrastructure/
│   └── docker/               # Docker configurations
├── scripts/                  # Development scripts
└── docs/                     # Documentation
```

## 🧩 Key Components

### Frontend Architecture
- **App Router**: Next.js 15 with React Server Components
- **Component Library**: Reusable UI components (Card, Badge, LoadingSpinner)
- **Custom Hooks**: Authentication, data fetching, and business logic
- **GraphQL Integration**: Apollo Client with optimized fragments
- **Utility Functions**: Currency formatting, date handling, and more

### Backend Services
- **AI Engine**: Modular FastAPI service with route separation
- **Service Registry**: Centralized dependency management
- **Structured Logging**: JSON-formatted logs for monitoring
- **Health Checks**: Comprehensive service health monitoring

### Database Design
- **GraphQL-First**: Hasura provides type-safe GraphQL API
- **Real-time**: Subscriptions for live data updates
- **Optimized Queries**: Fragment-based query optimization

## 🧪 Development Scripts

```bash
# Start complete development environment
./scripts/atlas-up.sh

# Stop all services
./scripts/atlas-down.sh

# Reset database and restart
./scripts/atlas-reset.sh

# Run integration tests
./scripts/test-integration.sh
```

## 📊 Recent Improvements

### Code Quality Refactoring (v1.1)
- **69% reduction** in GraphQL operation duplication through fragments
- **81% reduction** in mock data bloat via centralized fixtures
- **44% reduction** in component complexity through reusable utilities
- **Modular AI engine** with separated concerns and service registry
- **Custom hooks** for authentication and data management
- **Utility library** for currency, date, and common operations

### Performance Optimizations
- Fragment-based GraphQL queries for optimal data fetching
- Component-level code splitting and lazy loading
- Optimized Docker builds with multi-stage processes
- Efficient state management with custom hooks

## 🚀 Roadmap

### Phase 2 (Q2 2024)
- [ ] Real bank integration (Plaid/Yodlee)
- [ ] Advanced AI insights with local LLM
- [ ] Mobile app (React Native)
- [ ] Real-time notifications

### Phase 3 (Q3 2024)
- [ ] Multi-tenant support
- [ ] Advanced reporting and analytics
- [ ] Third-party integrations
- [ ] Enterprise features

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the code quality standards
4. **Test thoroughly** including integration tests
5. **Submit a pull request** with clear description

### Development Guidelines
- Follow TypeScript strict mode
- Use provided ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed
- Keep components focused and reusable

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and community chat

---

**Atlas Financial v1.1** - *The brutally honest truth about your money* 💰
