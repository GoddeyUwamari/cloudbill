# CloudBill 💳

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Enterprise-grade multi-tenant SaaS billing platform with microservices architecture. Built for scalability, reliability, and ease of integration.

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-tenant isolation with row-level security
- Redis session management

### 💰 Billing & Subscriptions
- Flexible subscription plans (Starter, Professional, Enterprise)
- Usage-based metering and billing
- Invoice generation and PDF export
- Automated billing cycles
- Subscription lifecycle management

### 💳 Payment Processing
- Stripe integration for payment processing
- Multiple payment methods support
- Secure payment method storage
- Refund management
- Transaction history tracking

### 📧 Notifications
- Multi-channel delivery (Email, SMS, Webhooks)
- Template management system
- Delivery tracking and retry logic
- Notification history and analytics
- SMTP/Twilio integration ready

### 🌐 API Gateway
- Centralized routing and load balancing
- Service health monitoring
- Request/response logging
- Rate limiting ready
- CORS configuration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (8080)                      │
│              Route Management & Health Checks                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│ Auth Service   │   │ Billing Service │   │ Payment Service│
│   (Port 3001)  │   │   (Port 3002)   │   │  (Port 3003)   │
│                │   │                 │   │                │
│ • JWT Auth     │   │ • Subscriptions │   │ • Stripe API   │
│ • User Mgmt    │   │ • Invoices      │   │ • Payments     │
│ • RBAC         │   │ • Usage Track   │   │ • Refunds      │
└────────────────┘   └─────────────────┘   └────────────────┘
        │                     │                     │
        │            ┌────────▼────────┐            │
        │            │ Notification    │            │
        │            │    Service      │            │
        │            │  (Port 3004)    │            │
        │            │                 │            │
        │            │ • Email/SMS     │            │
        │            │ • Webhooks      │            │
        │            │ • Templates     │            │
        │            └─────────────────┘            │
        │                     │                     │
┌───────▼─────────────────────▼─────────────────────▼────────┐
│                                                              │
│  PostgreSQL (5433)        Redis (6380)                       │
│  • Multi-tenant data      • Session storage                  │
│  • Row-level security     • Cache layer                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GoddeyUwamari/cloudbill.git
cd cloudbill
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy example env files
cp .env.example .env
cp services/auth-service/.env.example services/auth-service/.env
cp services/billing-service/.env.example services/billing-service/.env
cp services/payment-service/.env.example services/payment-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env
```

4. **Configure your environment variables**
```bash
# Edit .env files with your configuration
# Required: Database credentials, JWT secrets, Stripe keys, etc.
```

5. **Start with Docker Compose** (Recommended)
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

6. **Or run services locally**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Start services in separate terminals
cd services/auth-service && npm run dev
cd services/billing-service && npm run dev
cd services/payment-service && npm run dev
cd services/notification-service && npm run dev
cd services/api-gateway && npm run dev
```

## 📡 API Endpoints

### API Gateway
```
http://localhost:8080
```

### Health Checks
```bash
# Gateway health
curl http://localhost:8080/health

# Individual service health
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/billing/health
curl http://localhost:8080/api/payments/health
curl http://localhost:8080/api/notifications/health
```

### Authentication
```bash
# Register user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "tenantId": "tenant-uuid"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Refresh token
POST /api/auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

### Billing
```bash
# Create subscription
POST /api/billing/subscriptions
Authorization: Bearer <token>
{
  "tenantId": "tenant-uuid",
  "planId": "plan-uuid",
  "billingCycle": "monthly"
}

# Track usage
POST /api/billing/usage
Authorization: Bearer <token>
{
  "tenantId": "tenant-uuid",
  "metric": "api_calls",
  "quantity": 100
}

# Get invoices
GET /api/billing/invoices/tenant/:tenantId
Authorization: Bearer <token>
```

### Payments
```bash
# Create payment
POST /api/payments
Authorization: Bearer <token>
{
  "tenantId": "tenant-uuid",
  "amount": 9900,
  "currency": "usd",
  "paymentMethodId": "pm_xxx"
}

# Create payment method
POST /api/payments/methods
Authorization: Bearer <token>
{
  "tenantId": "tenant-uuid",
  "type": "card",
  "token": "tok_xxx"
}
```

### Notifications
```bash
# Send email
POST /api/notifications/email
Authorization: Bearer <token>
{
  "to": "user@example.com",
  "subject": "Welcome to CloudBill",
  "body": "Thank you for signing up!"
}

# Send SMS
POST /api/notifications/sms
Authorization: Bearer <token>
{
  "to": "+1234567890",
  "message": "Your verification code is 123456"
}

# Get notification history
GET /api/notifications/history?tenantId=tenant-uuid
Authorization: Bearer <token>
```

## 🗄️ Database Schema

### Core Tables
- **users** - User authentication and profiles
- **tenants** - Multi-tenant organization data
- **subscriptions** - Subscription plans and status
- **invoices** - Invoice records and line items
- **usage_records** - Usage tracking for metering
- **payments** - Payment transactions
- **payment_methods** - Stored payment methods
- **notifications** - Notification history
- **notification_templates** - Reusable templates

### Migrations
```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Create new migration
npm run migrate:create migration_name
```

## 🐳 Docker Services

### Container Overview
| Service | Port | Container Name | Status |
|---------|------|----------------|--------|
| PostgreSQL | 5433 | cloudbill-postgres | ✅ Healthy |
| Redis | 6380 | cloudbill-redis | ✅ Healthy |
| Auth Service | 3001 | cloudbill-auth | ✅ Healthy |
| Billing Service | 3002 | cloudbill-billing | ✅ Healthy |
| Payment Service | 3003 | cloudbill-payment | ✅ Healthy |
| Notification Service | 3004 | cloudbill-notification | ✅ Healthy |
| API Gateway | 8080 | cloudbill-gateway | ✅ Healthy |

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec auth-service sh
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npm test --workspace=@cloudbill/auth-service

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration
```

## 📊 Monitoring & Observability

### Health Checks
All services expose health endpoints:
- Database connectivity
- Redis connection
- External service status (Stripe, SMTP, etc.)
- Memory and CPU usage

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- JSON format for easy parsing
- Rotation and archival configured

### Metrics (Coming Soon)
- Prometheus metrics export
- Grafana dashboards
- Request rate and latency
- Error rates and types

## 🔒 Security

### Best Practices
- ✅ JWT with short-lived access tokens
- ✅ Refresh token rotation
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection with helmet
- ✅ CORS configuration
- ✅ Rate limiting (ready)
- ✅ Row-level security in PostgreSQL
- ✅ Environment variable management
- ✅ Secrets stored securely (not in code)

### Security Headers
```javascript
helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
})
```

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.0
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **ORM:** Native pg driver with query builders
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Joi / Zod

### External Services
- **Payments:** Stripe
- **Email:** Nodemailer (SMTP)
- **SMS:** Twilio (ready)
- **File Storage:** Local (S3 ready)

### DevOps
- **Containerization:** Docker & Docker Compose
- **Orchestration:** Kubernetes-ready
- **CI/CD:** GitHub Actions (ready)
- **Monitoring:** Winston logging (Prometheus ready)

## 📁 Project Structure

```
cloudbill/
├── services/
│   ├── api-gateway/           # API Gateway service
│   │   ├── src/
│   │   │   ├── config/       # Configuration files
│   │   │   ├── middleware/   # Auth, logging, error handling
│   │   │   ├── routes/       # Route definitions
│   │   │   └── index.ts      # Entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── auth-service/          # Authentication service
│   │   ├── src/
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── repositories/ # Data access
│   │   │   ├── routes/       # API routes
│   │   │   └── models/       # TypeScript types
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── billing-service/       # Billing & subscriptions
│   ├── payment-service/       # Payment processing
│   └── notification-service/  # Multi-channel notifications
│
├── shared/                    # Shared utilities
│   ├── types/                # Common TypeScript types
│   ├── utils/                # Helper functions
│   ├── middleware/           # Shared middleware
│   └── config/               # Shared configuration
│
├── scripts/                   # Utility scripts
│   ├── migrations/           # Database migrations
│   └── seed/                 # Seed data
│
├── docker-compose.yml         # Docker orchestration
├── .env.example              # Environment template
├── tsconfig.json             # TypeScript config
└── package.json              # Root package.json
```

## 🌐 Environment Variables

### Core Variables
```bash
# Application
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=cloudbill
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (SMTP)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM_EMAIL=noreply@cloudbill.com
SMTP_FROM_NAME=CloudBill

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

## 🚦 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start databases
docker-compose up -d postgres redis

# Run migrations
npm run migrate

# Start service in dev mode
cd services/auth-service
npm run dev
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

### Git Workflow
```bash
# Feature branch
git checkout -b feature/your-feature

# Commit with conventional commits
git commit -m "feat: add new billing feature"

# Push and create PR
git push origin feature/your-feature
```

## 📈 Roadmap

### ✅ Completed (v1.0)
- [x] Authentication & Authorization
- [x] Multi-tenant architecture
- [x] Billing & Subscription management
- [x] Payment processing (Stripe)
- [x] Multi-channel notifications
- [x] API Gateway with health checks
- [x] Docker containerization
- [x] PostgreSQL with RLS
- [x] Redis session management

### 🚧 In Progress (v1.1)
- [ ] Comprehensive test coverage (>80%)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Rate limiting & throttling
- [ ] Enhanced logging & monitoring

### 🔮 Planned (v2.0)
- [ ] Kafka event streaming
- [ ] Analytics service
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Kubernetes deployment configs
- [ ] Multi-region support
- [ ] Advanced tax calculations
- [ ] Dunning management
- [ ] Customer portal UI
- [ ] Admin dashboard

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or tooling changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Goddey Uwamari** - *Initial work* - [@GoddeyUwamari](https://github.com/GoddeyUwamari)

## 🙏 Acknowledgments

- Express.js community
- TypeScript team
- Stripe for payment infrastructure
- Open source contributors

## 📞 Support

- 📧 Email: support@cloudbill.com
- 💬 Discord: [Join our community](https://discord.gg/cloudbill)
- 🐛 Issues: [GitHub Issues](https://github.com/GoddeyUwamari/cloudbill/issues)
- 📖 Docs: [Documentation](https://docs.cloudbill.com)

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Built with ❤️ for the developer community**
