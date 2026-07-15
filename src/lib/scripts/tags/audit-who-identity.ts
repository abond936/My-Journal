import 'dotenv/config';
import { getArchiveIdentityReview } from '@/lib/services/archiveIdentityService';

async function run() {
  const report = await getArchiveIdentityReview();
  const rows = report.rows;
  const totals = rows.reduce<Record<string, number>>((counts, row) => {
    const key = `${row.classification}:${row.confidence}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Who tags reviewed: ${rows.length}`);
  for (const [classification, count] of Object.entries(totals).sort()) {
    console.log(`${classification}: ${count}`);
  }
  console.log(`Alias clusters: ${report.aliasClusters.length}`);
  for (const cluster of report.aliasClusters) {
    console.log(`- ${cluster.nodeName}: ${cluster.candidateNames.join(', ')}`);
  }
  console.log('\nAssigned candidate rows:');
  for (const row of rows.filter((item) =>
    item.direct.cards + item.direct.media + item.direct.questions > 0
  )) {
    console.log(
      `${row.name} | ${row.classification}/${row.confidence} | direct C${row.direct.cards} M${row.direct.media} Q${row.direct.questions} | subtree C${row.subtree.cards} M${row.subtree.media} Q${row.subtree.questions}`
    );
  }
  console.log('\nAudit only. No writes performed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
