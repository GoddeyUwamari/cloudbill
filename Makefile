# ============================================================================
# CloudBill - Makefile
# Convenient shortcuts for Docker operations
# ============================================================================
# Each command shows the actual Docker command being executed
# This helps you learn what's happening behind the scenes

.PHONY: help docker-start docker-stop docker-restart docker-status docker-logs \
        docker-db-start docker-db-stop docker-db-restart docker-db-status docker-db-logs docker-db-connect docker-db-migrate docker-db-clean docker-db-reset docker-db-backup docker-db-health \
        docker-redis-start docker-redis-stop docker-redis-restart docker-redis-status docker-redis-logs docker-redis-cli docker-redis-ping docker-redis-clean \
        docker-clean docker-reset docker-learn

# Default target: Show help
help:
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║       CloudBill - Docker Commands (Phase 2: PostgreSQL + Redis)║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make docker-start           - Start ALL services (PostgreSQL + Redis)"
	@echo "  make docker-stop            - Stop ALL services"
	@echo "  make docker-status          - Check status of ALL services"
	@echo ""
	@echo "📦 PostgreSQL Commands:"
	@echo "  make docker-db-start        - Start PostgreSQL container"
	@echo "  make docker-db-stop         - Stop PostgreSQL container"
	@echo "  make docker-db-restart      - Restart PostgreSQL container"
	@echo "  make docker-db-status       - Show PostgreSQL status"
	@echo "  make docker-db-logs         - View PostgreSQL logs (live)"
	@echo "  make docker-db-connect      - Connect to PostgreSQL shell"
	@echo "  make docker-db-migrate      - Run database migrations"
	@echo "  make docker-db-backup       - Backup database"
	@echo "  make docker-db-health       - Check PostgreSQL health"
	@echo ""
	@echo "🔴 Redis Commands:"
	@echo "  make docker-redis-start     - Start Redis container"
	@echo "  make docker-redis-stop      - Stop Redis container"
	@echo "  make docker-redis-restart   - Restart Redis container"
	@echo "  make docker-redis-status    - Show Redis status"
	@echo "  make docker-redis-logs      - View Redis logs (live)"
	@echo "  make docker-redis-cli       - Connect to Redis CLI"
	@echo "  make docker-redis-ping      - Test Redis connection"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  make docker-clean           - Stop and remove ALL containers"
	@echo "  make docker-reset           - Complete reset (removes ALL data!)"
	@echo "  make docker-db-clean        - Clean PostgreSQL only"
	@echo "  make docker-redis-clean     - Clean Redis only"
	@echo ""
	@echo "📚 Learning:"
	@echo "  make docker-learn           - Open Docker learning guide"
	@echo ""

# ----------------------------------------------------------------------------
# Multi-Service Management (NEW!)
# ----------------------------------------------------------------------------

# Start all services
docker-start:
	@echo "🚀 Starting ALL services (PostgreSQL + Redis)..."
	@echo "📝 Command: docker-compose up -d"
	@docker-compose up -d
	@echo ""
	@echo "✅ All services started!"
	@echo "🔍 Run 'make docker-status' to check health"

# Stop all services
docker-stop:
	@echo "🛑 Stopping ALL services..."
	@echo "📝 Command: docker-compose stop"
	@docker-compose stop
	@echo "✅ All services stopped!"

# Restart all services
docker-restart:
	@echo "🔄 Restarting ALL services..."
	@echo "📝 Command: docker-compose restart"
	@docker-compose restart
	@echo "✅ All services restarted!"

# Show all services status
docker-status:
	@echo "📊 All Services Status:"
	@echo "📝 Command: docker-compose ps"
	@echo ""
	@docker-compose ps

# View all services logs
docker-logs:
	@echo "📜 Viewing ALL logs (Ctrl+C to exit)..."
	@echo "📝 Command: docker-compose logs -f"
	@echo ""
	@docker-compose logs -f

# ----------------------------------------------------------------------------
# PostgreSQL Commands
# ----------------------------------------------------------------------------

# Start PostgreSQL container in detached mode
docker-db-start:
	@echo "🚀 Starting PostgreSQL container..."
	@echo "📝 Command: docker-compose up -d postgres"
	@docker-compose up -d postgres
	@echo ""
	@echo "✅ Container started!"
	@echo "🔍 Run 'make docker-db-status' to check health"

# Stop PostgreSQL container
docker-db-stop:
	@echo "🛑 Stopping PostgreSQL container..."
	@echo "📝 Command: docker-compose stop postgres"
	@docker-compose stop postgres
	@echo "✅ Container stopped!"

# Restart PostgreSQL container
docker-db-restart:
	@echo "🔄 Restarting PostgreSQL container..."
	@echo "📝 Command: docker-compose restart postgres"
	@docker-compose restart postgres
	@echo "✅ Container restarted!"

# Show PostgreSQL container status
docker-db-status:
	@echo "📊 PostgreSQL Container Status:"
	@echo "📝 Command: docker-compose ps postgres"
	@echo ""
	@docker-compose ps postgres
	@echo ""
	@echo "📝 Command: docker inspect cloudbill-postgres --format='{{.State.Health.Status}}'"
	@echo "Health: $$(docker inspect cloudbill-postgres --format='{{.State.Health.Status}}' 2>/dev/null || echo 'Container not running')"

# View PostgreSQL container logs (follow mode)
docker-db-logs:
	@echo "📜 Viewing PostgreSQL logs (Ctrl+C to exit)..."
	@echo "📝 Command: docker-compose logs -f postgres"
	@echo ""
	@docker-compose logs -f postgres

# Check PostgreSQL container health
docker-db-health:
	@echo "💓 PostgreSQL Health Check:"
	@echo "📝 Command: docker exec cloudbill-postgres pg_isready -U postgres"
	@docker exec cloudbill-postgres pg_isready -U postgres || echo "❌ Container unhealthy or not running"

# Connect to PostgreSQL shell
docker-db-connect:
	@echo "🔌 Connecting to PostgreSQL..."
	@echo "📝 Command: docker exec -it cloudbill-postgres psql -U postgres -d cloudbill"
	@echo ""
	@echo "💡 Tip: Type '\q' to exit, '\dt' to list tables, '\d tablename' for schema"
	@echo ""
	@docker exec -it cloudbill-postgres psql -U postgres -d cloudbill

# Run database migrations
docker-db-migrate:
	@echo "🗄️  Running database migrations..."
	@echo "📝 Command: ./scripts/docker-init-db.sh"
	@./scripts/docker-init-db.sh

# Backup database
docker-db-backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@echo "📝 Command: docker exec cloudbill-postgres pg_dump -U postgres cloudbill > backups/cloudbill_$$(date +%Y%m%d_%H%M%S).sql"
	@docker exec cloudbill-postgres pg_dump -U postgres cloudbill > backups/cloudbill_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ folder"

# Stop and remove PostgreSQL container (keeps volume data)
docker-db-clean:
	@echo "🧹 Cleaning up PostgreSQL container..."
	@echo "📝 Command: docker-compose rm -s -f postgres"
	@docker-compose rm -s -f postgres
	@echo "✅ PostgreSQL container removed (data preserved in volume)"

# ----------------------------------------------------------------------------
# Redis Commands (NEW!)
# ----------------------------------------------------------------------------

# Start Redis container in detached mode
docker-redis-start:
	@echo "🚀 Starting Redis container..."
	@echo "📝 Command: docker-compose up -d redis"
	@docker-compose up -d redis
	@echo ""
	@echo "✅ Redis container started!"
	@echo "🔍 Run 'make docker-redis-status' to check health"

# Stop Redis container
docker-redis-stop:
	@echo "🛑 Stopping Redis container..."
	@echo "📝 Command: docker-compose stop redis"
	@docker-compose stop redis
	@echo "✅ Redis container stopped!"

# Restart Redis container
docker-redis-restart:
	@echo "🔄 Restarting Redis container..."
	@echo "📝 Command: docker-compose restart redis"
	@docker-compose restart redis
	@echo "✅ Redis container restarted!"

# Show Redis container status
docker-redis-status:
	@echo "📊 Redis Container Status:"
	@echo "📝 Command: docker-compose ps redis"
	@echo ""
	@docker-compose ps redis
	@echo ""
	@echo "📝 Command: docker inspect cloudbill-redis --format='{{.State.Health.Status}}'"
	@echo "Health: $$(docker inspect cloudbill-redis --format='{{.State.Health.Status}}' 2>/dev/null || echo 'Container not running')"

# View Redis container logs (follow mode)
docker-redis-logs:
	@echo "📜 Viewing Redis logs (Ctrl+C to exit)..."
	@echo "📝 Command: docker-compose logs -f redis"
	@echo ""
	@docker-compose logs -f redis

# Connect to Redis CLI
docker-redis-cli:
	@echo "🔌 Connecting to Redis CLI..."
	@echo "📝 Command: docker exec -it cloudbill-redis redis-cli -a redis123"
	@echo ""
	@echo "💡 Tips:"
	@echo "  - PING                  Test connection"
	@echo "  - SET key value         Set a key"
	@echo "  - GET key               Get a key"
	@echo "  - KEYS *                List all keys"
	@echo "  - INFO                  Server info"
	@echo "  - exit                  Exit CLI"
	@echo ""
	@docker exec -it cloudbill-redis redis-cli -a redis123

# Test Redis connection
docker-redis-ping:
	@echo "🏓 Testing Redis connection..."
	@echo "📝 Command: docker exec cloudbill-redis redis-cli -a redis123 ping"
	@docker exec cloudbill-redis redis-cli -a redis123 ping || echo "❌ Redis not responding or not running"

# Stop and remove Redis container (keeps volume data)
docker-redis-clean:
	@echo "🧹 Cleaning up Redis container..."
	@echo "📝 Command: docker-compose rm -s -f redis"
	@docker-compose rm -s -f redis
	@echo "✅ Redis container removed (data preserved in volume)"

# ----------------------------------------------------------------------------
# Global Cleanup Operations
# ----------------------------------------------------------------------------

# Stop and remove ALL containers (keeps volume data)
docker-clean:
	@echo "🧹 Cleaning up ALL containers..."
	@echo "📝 Command: docker-compose down"
	@docker-compose down
	@echo "✅ All containers removed (data preserved in volumes)"

# Complete reset - removes everything including data
docker-reset:
	@echo "⚠️  WARNING: This will delete ALL data (PostgreSQL + Redis)!"
	@echo "📝 Command: docker-compose down -v"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✅ Complete reset done!"; \
	else \
		echo "❌ Reset cancelled"; \
	fi

# ----------------------------------------------------------------------------
# Learning & Documentation
# ----------------------------------------------------------------------------

# Open Docker learning guide
docker-learn:
	@echo "📚 Opening Docker learning guide..."
	@open docs/DOCKER-LEARNING.md || cat docs/DOCKER-LEARNING.md

# ----------------------------------------------------------------------------
# Notes:
# ----------------------------------------------------------------------------
# - All commands show the actual Docker command being executed
# - Use 'make help' to see all available commands
# - Commands are prefixed with @ to hide make's own output
# - .PHONY ensures targets run even if files with same names exist