# Gametime

## Folder tree

```text
Gametime/
  backend/
    src/
      config/
      controllers/
      db/
      jobs/
      middleware/
      routes/
      services/
      utils/
    tests/
    Dockerfile
    package.json
    vitest.config.js
  frontend/
    src/
      api/
      components/
      pages/
      styles/
    Dockerfile
    index.html
    package.json
    vite.config.js
  scripts/
    create_structure.sh
    run_local.sh
  .env.example
  docker-compose.yml
  package.json
  start.sh
```

## Terminal setup commands

```bash
cd /Users/28rehank/Documents
bash Gametime/scripts/create_structure.sh
cd Gametime
cp .env.example .env
npm install
npm run dev
```

## Test command

```bash
npm test
```

## System check command

```bash
./scripts/system_check.sh
```
