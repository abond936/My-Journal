# Dimensional Tags Backfill Script

This script populates the dimensional tag arrays (`who`, `what`, `when`, `where`, `reflection`) for all existing cards in the database.

## Background

The tag filtering system was updated to use dimensional arrays for better performance and querying capabilities. However, existing cards in the database only have the flat `tags` array populated. This script organizes the existing flat tags into dimensional arrays.

## What It Does

1. **Fetches all cards** from the Firestore `cards` collection
2. **For each card**: Takes the existing `tags` array and organizes it by dimension using `organizeEntryTags`
3. **Updates each card** with the populated dimensional arrays
4. **Skips cards** that already have dimensional arrays or have no tags

## Usage

### Option 1: Using the Runner Script (Recommended)

```bash
# Dry run - see what would be updated without making changes
npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --dry-run

# Test with a small limit first
npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --dry-run --limit=10

# Run the actual backfill
npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts

# Run with custom batch size
npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --batch-size=100
```

### Option 2: Direct Execution

```bash
# Dry run
npx tsx src/lib/scripts/firebase/backfill-dimensional-tags.ts --dry-run

# Live run
npx tsx src/lib/scripts/firebase/backfill-dimensional-tags.ts
```

## Options

- `--dry-run`: Show what would be updated without making changes
- `--limit=N`: Only process the first N cards (useful for testing)
- `--batch-size=N`: Process cards in batches of N (default: 500)

## Safety Features

- **Dry run mode**: Test the script without making changes
- **Batch processing**: Processes cards in manageable batches
- **Error handling**: Continues processing even if individual cards fail
- **Skip logic**: Skips cards that already have dimensional arrays
- **Progress tracking**: Shows detailed progress and statistics
- **5-second delay**: Gives you time to cancel in live mode

## Example Output

```
🔧 Dimensional Tags Backfill Runner
====================================

📋 Configuration:
   Dry run: NO
   Batch size: 500
   Limit: unlimited

⚠️  LIVE MODE - Changes will be made to the database
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

🚀 Starting dimensional tags backfill...
📋 Options: dryRun=false, batchSize=500, limit=unlimited
⏰ Started at: 2024-01-15T10:30:00.000Z

📊 Found 150 cards to process
🔄 Processing 1 batches of up to 500 cards each

📦 Processing batch 1/1 (150 cards)
  ✅ Batch 1 complete: 120 updated, 25 skipped, 5 errors

🎉 Backfill complete!
📊 Summary:
   Total cards: 150
   Processed: 150
   Updated: 120
   Skipped: 25
   Errors: 5
   Processing time: 45.23s

🎯 Final Result:
   Success: YES
   Cards updated: 120
   Cards skipped: 25
   Errors: 5
   Total time: 45.23s

✅ Backfill completed successfully!
```

## What Gets Updated

For each card, the script adds these fields:

```typescript
{
  who: string[],      // Tags with dimension='who'
  what: string[],     // Tags with dimension='what'  
  when: string[],     // Tags with dimension='when'
  where: string[],    // Tags with dimension='where'
  reflection: string[], // Tags with dimension='reflection'
  updatedAt: number   // Updated timestamp
}
```

## Troubleshooting

### Common Issues

1. **"No dimensional tags found"**: The card has tags, but none of them have a `dimension` property set
2. **"Already has dimensional arrays"**: The card was already processed
3. **"No tags to organize"**: The card has no tags array or empty tags array

### If Errors Occur

1. Check the error messages in the output
2. Verify that your tags have the correct `dimension` property set
3. Run with `--limit=1` to test on a single card
4. Check the Firestore console to see the actual card data

## After Running

Once the backfill is complete:

1. **Test the filtering**: Go to the view page and try filtering by tags
2. **Verify results**: Check that cards appear when you select tags in the sidebar
3. **Monitor performance**: The filtering should now work correctly

## Rollback

If you need to rollback the changes, you can remove the dimensional arrays:

```typescript
// Remove dimensional arrays from all cards
const cards = await firestore.collection('cards').get();
const batch = firestore.batch();

cards.docs.forEach(doc => {
  batch.update(doc.ref, {
    who: firestore.FieldValue.delete(),
    what: firestore.FieldValue.delete(),
    when: firestore.FieldValue.delete(),
    where: firestore.FieldValue.delete(),
    reflection: firestore.FieldValue.delete()
  });
});

await batch.commit();
```

**Note**: This is destructive and will break the filtering system again. 