/**
 * @file create-tags-json.ts
 * @description This script reads a CSV file containing tag data,
 * transforms it into a structured JSON format, and writes it to a new file.
 * This serves as an intermediary step for cleaning and preparing tag data
 * before it is uploaded to the database.
 *
 * @usage
 * 1. Place your CSV file in the `src/data/migration/` directory.
 *    It MUST be named `tags-new.csv`.
 * 2. The CSV file MUST have the following headers in the first row:
 *    `id,name,parentId,order,dimension,description`
 * 3. Run the script from the project root using the command:
 *    `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/migration/create-tags-json.ts`
 * 4. The script will generate a `new-tags.json` file in `src/data/migration/`.
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

async function convertCsvToJson() {
  const csvFilePath = path.resolve(process.cwd(), 'src/data/migration', 'tags-new.csv');
  const jsonFilePath = path.resolve(process.cwd(), 'src/data/migration', 'new-tags.json');

  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

  const records = parse(fileContent, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 2));
  console.log(`✅ Success! ${records.length} records written to ${jsonFilePath}`);
}

convertCsvToJson();