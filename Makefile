# Thin wrappers; npm scripts are the source of truth.
.PHONY: install dev build lint test test-unit test-e2e migrate openapi up down

install:
	npm ci

dev:
	npm run start:dev

build:
	npm run build

lint:
	npm run lint && npm run format:check

test:
	npm test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

migrate:
	npm run migration:up

openapi:
	npm run openapi:generate

up:
	docker compose up --build -d

down:
	docker compose down -v
