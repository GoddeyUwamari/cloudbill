# ============================================================================
# CloudBill - Makefile
# Convenient shortcuts for Docker operations
# ============================================================================
# Each command shows the actual Docker command being executed
# This helps you learn what's happening behind the scenes

.PHONY: help docker-db-start docker-db-stop docker-db-restart docker-db-status docker-db-logs docker-db-connect docker-db-migrate docker-db-clean docker-db-reset

# Default target: Show help
help:
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║         CloudBill - Docker Commands (Phase 1: PostgreSQL)      ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📦 Container Management:"
	@echo "  make docker-db-start        - Start PostgreSQL container"
	@echo "  make docker-db-stop         - Stop PostgreSQL container"
	@echo "  make docker-db-restart      - Restart PostgreSQL container"
	@echo ""
	@echo "📊 Monitoring & Debugging:"
	@echo "  make docker-db-status       - Show container status"
	@echo "  make docker-db-logs         - View container logs (live)"
	@echo "  make docker-db-health       - Check container health"
	@echo ""
	@echo "🗄️  Database Operations:"
	@echo "  make docker-db-connect      - Connect to PostgreSQL shell"
	@echo "  make docker-db-migrate      - Run database migrations"
	@echo "  make docker-db-backup       - Backup database"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  make docker-db-clean        - Stop and remove container"
	@echo "  make docker-db-reset        - Complete reset (removes data!)"
	@echo ""
	@echo "📚 Learning:"
	@echo "  make docker-learn           - Open Docker learning guide"
	@echo ""

# ----------------------------------------------------------------------------
# Container Management
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

# ----------------------------------------------------------------------------
# Monitoring & Debugging
# ----------------------------------------------------------------------------

# Show container status
docker-db-status:
	@echo "📊 Container Status:"
	@echo "📝 Command: docker-compose ps"
	@echo ""
	@docker-compose ps
	@echo ""
	@echo "📝 Command: docker inspect cloudbill-postgres --format='{{.State.Health.Status}}'"
	@echo "Health: $$(docker inspect cloudbill-postgres --format='{{.State.Health.Status}}' 2>/dev/null || echo 'Container not running')"

# View container logs (follow mode)
docker-db-logs:
	@echo "📜 Viewing PostgreSQL logs (Ctrl+C to exit)..."
	@echo "📝 Command: docker-compose logs -f postgres"
	@echo ""
	@docker-compose logs -f postgres

# Check container health
docker-db-health:
	@echo "💓 Health Check:"
	@echo "📝 Command: docker exec cloudbill-postgres pg_isready -U postgres"
	@docker exec cloudbill-postgres pg_isready -U postgres || echo "❌ Container unhealthy or not running"

# ----------------------------------------------------------------------------
# Database Operations
# ----------------------------------------------------------------------------

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

# ----------------------------------------------------------------------------
# Cleanup Operations
# ----------------------------------------------------------------------------

# Stop and remove container (keeps volume data)
docker-db-clean:
	@echo "🧹 Cleaning up PostgreSQL container..."
	@echo "📝 Command: docker-compose down"
	@docker-compose down
	@echo "✅ Container removed (data preserved in volume)"

# Complete reset - removes everything including data
docker-db-reset:
	@echo "⚠️  WARNING: This will delete ALL data!"
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