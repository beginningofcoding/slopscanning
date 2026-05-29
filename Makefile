.PHONY: up down test bakeoff smoke

up:
	docker compose up --build

down:
	docker compose down

test:
	cd backend && python -m pytest tests -q

bakeoff:
	cd backend && python scripts/run_bakeoff.py

smoke:
	cd backend && python scripts/smoke_test.py --check-contracts
