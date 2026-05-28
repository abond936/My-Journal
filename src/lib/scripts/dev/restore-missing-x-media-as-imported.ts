import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import type {
  RestoreApplyRow,
  RestorePlanRow,
} from '@/lib/scripts/dev/restore-missing-x-media-as-imported-lib';

const DEFAULT_REPORT_JSON =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/zmomdadpics-x-files-missing-from-media-2026-05-27.json';
const DEFAULT_OUT_JSON =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/restore-missing-x-media-as-imported-2026-05-28.json';
const DEFAULT_OUT_TXT =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/restore-missing-x-media-as-imported-2026-05-28.txt';
const DEFAULT_OUT_JSONL =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/restore-missing-x-media-as-imported-2026-05-28.jsonl';

type CliOptions = {
  reportPath: string;
  outJson: string;
  outTxt: string;
  outJsonl: string;
  apply: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    reportPath: DEFAULT_REPORT_JSON,
    outJson: DEFAULT_OUT_JSON,
    outTxt: DEFAULT_OUT_TXT,
    outJsonl: DEFAULT_OUT_JSONL,
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length);
      continue;
    }
    if (arg.startsWith('--out-json=')) {
      options.outJson = arg.slice('--out-json='.length);
      continue;
    }
    if (arg.startsWith('--out-txt=')) {
      options.outTxt = arg.slice('--out-txt='.length);
      continue;
    }
    if (arg.startsWith('--out-jsonl=')) {
      options.outJsonl = arg.slice('--out-jsonl='.length);
      continue;
    }
  }

  return options;
}

async function writeCheckpointRow(outJsonl: string, row: RestorePlanRow | RestoreApplyRow, index: number, total: number) {
  await fs.mkdir(path.dirname(outJsonl), { recursive: true });
  await fs.appendFile(
    outJsonl,
    `${JSON.stringify({ at: new Date().toISOString(), index: index + 1, total, ...row })}\n`,
    'utf8'
  );
}

function renderPlanText(summary: ReturnType<typeof summarizePlanRows>, rows: RestorePlanRow[]): string {
  const lines = [
    'Restore missing _X media as original folder imports',
    `Generated: ${new Date().toISOString()}`,
    'Mode: preflight',
    `Total folders: ${summary.totalFolders}`,
    `Create cards: ${summary.createCount}`,
    `Merge existing cards: ${summary.mergeCount}`,
    `Errors: ${summary.errorCount}`,
    '',
  ];

  for (const row of rows) {
    if (row.action === 'error') {
      lines.push(`ERROR\t${row.folderPath}\t${row.error}`);
      continue;
    }
    lines.push(
      `${row.action.toUpperCase()}\t${row.folderPath}\t${row.importSourcePath}\timages=${row.expectedImageCount}\texistingCard=${row.existingCardId ?? ''}`
    );
  }
  return lines.join('\n');
}

function renderApplyText(summary: ReturnType<typeof summarizeApplyRows>, rows: RestoreApplyRow[]): string {
  const lines = [
    'Restore missing _X media as original folder imports',
    `Generated: ${new Date().toISOString()}`,
    'Mode: apply',
    `Total folders: ${summary.totalFolders}`,
    `Created cards: ${summary.createdCount}`,
    `Merged existing cards: ${summary.mergedCount}`,
    `Errors: ${summary.errorCount}`,
    '',
  ];

  for (const row of rows) {
    if (row.mode === 'created-card') {
      lines.push(
        `CREATED\t${row.folderPath}\t${row.importSourcePath}\t${row.cardId}\t${row.title}\timported=${row.importedCount}/${row.expectedImageCount}\tfailed=${row.failedPaths.length}`
      );
      continue;
    }
    if (row.mode === 'merged-existing-card') {
      lines.push(
        `MERGED\t${row.folderPath}\t${row.importSourcePath}\t${row.cardId}\t${row.title}\timported=${row.importedCount}\tskipped=${row.skippedCount}\texpected=${row.expectedImageCount}\tadded=${row.addedMediaCount}\tgallery=${row.galleryCount}\tmutated=${row.mutatedCard}\tfailed=${row.failedPaths.length}`
      );
      continue;
    }
    lines.push(`ERROR\t${row.folderPath}\t${row.error}`);
  }
  return lines.join('\n');
}

async function writeOutputs(
  outJson: string,
  outTxt: string,
  payload: unknown,
  text: string
) {
  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.writeFile(outJson, JSON.stringify(payload, null, 2), 'utf8');
  await fs.writeFile(outTxt, text, 'utf8');
}

async function main() {
  dotenv.config({ path: '.env' });
  dotenv.config({ path: '.env.local', override: true });

  const {
    applyRestorePlanRow,
    buildRestorePlanRows,
    buildSharedRestoreTagNameMaps,
    loadMissingReport,
    summarizeApplyRows,
    summarizePlanRows,
    uniqueFoldersFromMissingReport,
  } = await import('@/lib/scripts/dev/restore-missing-x-media-as-imported-lib');

  const options = parseArgs(process.argv.slice(2));
  const report = await loadMissingReport(options.reportPath);
  const folders = uniqueFoldersFromMissingReport(report);
  const planRows = await buildRestorePlanRows(folders);

  await fs.mkdir(path.dirname(options.outJsonl), { recursive: true });
  await fs.writeFile(options.outJsonl, '', 'utf8');

  if (!options.apply) {
    for (let i = 0; i < planRows.length; i += 1) {
      await writeCheckpointRow(options.outJsonl, planRows[i]!, i, planRows.length);
    }
    const summary = {
      generatedAt: new Date().toISOString(),
      mode: 'preflight',
      reportPath: options.reportPath,
      ...summarizePlanRows(planRows),
    };
    await writeOutputs(
      options.outJson,
      options.outTxt,
      { summary, rows: planRows },
      renderPlanText(summary, planRows)
    );
    console.log(JSON.stringify({ summary, outJson: options.outJson, outTxt: options.outTxt, outJsonl: options.outJsonl }, null, 2));
    return;
  }

  const tagNameMaps = await buildSharedRestoreTagNameMaps();
  const applyRows: RestoreApplyRow[] = [];
  for (let i = 0; i < planRows.length; i += 1) {
    const row = await applyRestorePlanRow(planRows[i]!, tagNameMaps);
    applyRows.push(row);
    await writeCheckpointRow(options.outJsonl, row, i, planRows.length);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'apply',
    reportPath: options.reportPath,
    ...summarizeApplyRows(applyRows),
  };
  await writeOutputs(
    options.outJson,
    options.outTxt,
    { summary, planRows, rows: applyRows },
    renderApplyText(summary, applyRows)
  );
  console.log(JSON.stringify({ summary, outJson: options.outJson, outTxt: options.outTxt, outJsonl: options.outJsonl }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
