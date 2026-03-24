import { writeFile } from 'node:fs/promises';

const sourceUrl = process.env.OPENAPI_SOURCE_URL || 'http://localhost:3000/api/docs-json';
const outputPath = new URL('../openapi/openapi.json', import.meta.url);

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch OpenAPI spec from ${sourceUrl}: ${response.status}`);
}

const spec = await response.text();
await writeFile(outputPath, spec, 'utf8');

console.log(`OpenAPI spec synced from ${sourceUrl}`);
