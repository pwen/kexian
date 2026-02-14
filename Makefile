.PHONY: help setup run migrate upgrade downgrade shell reset-db

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

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
	rm -f projects.db
	uv run flask db upgrade
