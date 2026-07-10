import { runPairedBackup } from './backup-run';

runPairedBackup(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exit(1);
});
