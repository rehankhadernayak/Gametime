import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const dbPath = path.resolve(process.cwd(), env.databasePath);
if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
  process.stdout.write(`Deleted ${dbPath}\n`);
} else {
  process.stdout.write(`No DB at ${dbPath}\n`);
}
