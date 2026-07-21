.PHONY: dev down logs build

# Builds (if needed) and starts the full stack in the background — the
# same `docker compose up -d` workflow documented in README.md.
dev:
	docker compose up -d --build
	@port=$${WEB_PORT:-3000}; \
	echo; \
	echo "Landing page:  http://localhost:$$port/"; \
	echo "CRM dashboard: http://localhost:$$port/crm"; \
	echo "Hermes setup:  http://localhost:$$port/hermes"; \
	echo; \
	echo "Run 'make logs' to follow logs, 'make down' to stop."

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build
