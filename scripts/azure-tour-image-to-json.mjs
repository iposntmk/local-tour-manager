import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  DEFAULT_API_VERSION,
  analyzeDocumentFile,
  getAzureConfig,
} from './azure-document-intelligence.mjs';
import { buildTourImportJson } from './tour-image-import-parser.mjs';

const DEFAULT_OUTPUT = 'tour-import-from-image.json';

const usage = () => {
  console.log([
    'Usage:',
    '  node --env-file=.env scripts/azure-tour-image-to-json.mjs <image-or-pdf> [output-json] [options]',
    '',
    'Options:',
    '  --year <yyyy>        Year to apply to sheet dates like 15/5',
    '  --raw <path>         Save raw Azure analyze result JSON',
    '  --api-version <ver>  Azure API version, default 2023-07-31',
    '  --company <name>     Fallback company if OCR cannot find one',
    '  --nationality <name> Manual nationality if OCR cannot find one',
  ].join('\n'));
};

const parseArgs = (argv) => {
  const positionals = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = value;
    i += 1;
  }
  return { inputPath: positionals[0], outputPath: positionals[1] || DEFAULT_OUTPUT, options };
};

const main = async () => {
  const { inputPath, outputPath, options } = parseArgs(process.argv.slice(2));
  if (!inputPath || options.help) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const { endpoint, key, apiVersion: envApiVersion } = getAzureConfig();
  if (!endpoint || !key) {
    throw new Error('Missing AZURE_FORM_RECOGNIZER_ENDPOINT or AZURE_FORM_RECOGNIZER_KEY in .env');
  }

  const apiVersion = String(options['api-version'] || envApiVersion || DEFAULT_API_VERSION);
  const result = await analyzeDocumentFile({ endpoint, key, filePath: inputPath, apiVersion });
  if (options.raw) {
    await writeFile(resolve(String(options.raw)), JSON.stringify(result, null, 2), 'utf8');
  }

  const importJson = buildTourImportJson(result.analyzeResult, {
    year: options.year,
    company: options.company,
    nationality: options.nationality,
  });
  await writeFile(resolve(outputPath), JSON.stringify(importJson, null, 2), 'utf8');
  console.log(`Wrote ${resolve(outputPath)}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
