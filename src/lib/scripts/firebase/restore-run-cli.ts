import { runPairedRestore } from './restore-run';

runPairedRestore(process.argv.slice(2)).catch((error) => {
  console.error('\nRestore failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
