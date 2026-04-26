import { existsSync } from 'fs';
import { resolve } from 'path';

const ENV_FILES = ['.env.local', '.env'];

export function loadEnvFiles() {
  for (const envFile of ENV_FILES) {
    const envPath = resolve(process.cwd(), envFile);
    if (!existsSync(envPath)) {
      continue;
    }

    process.loadEnvFile(envPath);
  }
}
