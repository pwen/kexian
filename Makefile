.PHONY: help setup run migrate upgrade downgrade shell reset-db docker-up docker-down docker-build db-dump db-restore

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies and apply migrations
	uv sync
	uv run flask db upgrade

run: ## Start the development server on port 5001
	uv run python app.py

migrate: ## Generate a new migration (usage: make migrate m="add rating column")
	uv run flask db migrate -m "$(m)"

upgrade: ## Apply pending migrations
	uv run flask db upgrade

downgrade: ## Roll back the last migration
	uv run flask db downgrade

shell: ## Open an interactive Flask shell
	uv run flask shell

reset-db: ## Wipe the database and re-apply all migrations
	uv run flask db downgrade base
	uv run flask db upgrade

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------

db: ## Start only Postgres in the background
	docker compose up -d db

docker-build: ## Build the Docker image
	docker compose build

docker-up: ## Start containers in the background (detached)
	docker compose up -d

docker-up-logs: ## Start containers with log tailing
	docker compose up

docker-down: ## Stop and remove containers
	docker compose down

# ---------------------------------------------------------------------------
# Database sync  (pull prod → local or vice versa)
# ---------------------------------------------------------------------------

db-dump: ## Dump the database to backup.sql (usage: make db-dump url="postgres://...")
	pg_dump "$(url)" --no-owner --no-acl -f backup.sql

db-restore: ## Restore backup.sql into the local database
	psql "postgresql://kexian:kexian@localhost:5432/kexian" < backup.sql
