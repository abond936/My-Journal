import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';
import { Card } from '@/lib/types/card';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();

interface TagConsistencyIssue {
  type: 'parentId_mismatch' | 'card_tag_mismatch' | 'orphaned_tag';
  tagId: string;
  tagName: string;
  issue: string;
  details: any;
}

interface ConsistencyReport {
  totalTags: number;
  totalCards: number;
  issues: TagConsistencyIssue[];
  summary: {
    parentIdMismatches: number;
    cardTagMismatches: number;
    orphanedTags: number;
  };
}

async function checkTagIdConsistency(): Promise<ConsistencyReport> {
  console.log('🔍 Checking Tag ID Consistency...\n');

  const report: ConsistencyReport = {
    totalTags: 0,
    totalCards: 0,
    issues: [],
    summary: {
      parentIdMismatches: 0,
      cardTagMismatches: 0,
      orphanedTags: 0
    }
  };

  try {
    // 1. Get all tags
    console.log('📋 Fetching all tags...');
    const tagsSnapshot = await firestore.collection('tags').get();
    const allTags = tagsSnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    } as Tag));
    
    report.totalTags = allTags.length;
    console.log(`✅ Found ${allTags.length} tags`);

    // Create a map of all tag IDs for quick lookup
    const tagIdMap = new Map<string, Tag>();
    const legacyIdMap = new Map<string, Tag>();
    
    allTags.forEach(tag => {
      tagIdMap.set(tag.docId!, tag);
      const legacyId = (tag as Tag & { id?: string }).id;
      if (legacyId && legacyId !== tag.docId) {
        legacyIdMap.set(legacyId, tag);
      }
    });

    // 2. Check for parentId mismatches
    console.log('\n🔗 Checking parentId consistency...');
    allTags.forEach(tag => {
      if (tag.parentId) {
        // Check if parentId points to a docId
        if (!tagIdMap.has(tag.parentId)) {
          // Check if it points to a legacy id
          if (legacyIdMap.has(tag.parentId)) {
            const legacyParent = legacyIdMap.get(tag.parentId)!;
            report.issues.push({
              type: 'parentId_mismatch',
              tagId: tag.docId!,
              tagName: tag.name,
              issue: `parentId points to legacy 'id' instead of 'docId'`,
              details: {
                currentParentId: tag.parentId,
                correctParentId: legacyParent.docId,
                parentName: legacyParent.name
              }
            });
            report.summary.parentIdMismatches++;
          } else {
            // Orphaned tag - parent doesn't exist
            report.issues.push({
              type: 'orphaned_tag',
              tagId: tag.docId!,
              tagName: tag.name,
              issue: `parentId points to non-existent tag`,
              details: {
                parentId: tag.parentId
              }
            });
            report.summary.orphanedTags++;
          }
        }
      }
    });

    // 3. Get all cards and check tag assignments
    console.log('\n📄 Fetching all cards...');
    const cardsSnapshot = await firestore.collection('cards').get();
    const allCards = cardsSnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    } as Card));
    
    report.totalCards = allCards.length;
    console.log(`✅ Found ${allCards.length} cards`);

    // 4. Check card tag assignments
    console.log('\n🏷️  Checking card tag assignments...');
    const cardTagIssues = new Set<string>(); // Track unique tag IDs with issues
    
    allCards.forEach(card => {
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tagId => {
          // Check if tagId is a valid docId
          if (!tagIdMap.has(tagId)) {
            // Check if it's a legacy id
            if (legacyIdMap.has(tagId)) {
              const legacyTag = legacyIdMap.get(tagId)!;
              if (!cardTagIssues.has(tagId)) {
                report.issues.push({
                  type: 'card_tag_mismatch',
                  tagId: tagId,
                  tagName: legacyTag.name,
                  issue: `Card tag assignment uses legacy 'id' instead of 'docId'`,
                  details: {
                    correctTagId: legacyTag.docId,
                    affectedCards: 1
                  }
                });
                cardTagIssues.add(tagId);
                report.summary.cardTagMismatches++;
              } else {
                // Update the count of affected cards
                const existingIssue = report.issues.find(issue => 
                  issue.type === 'card_tag_mismatch' && issue.tagId === tagId
                );
                if (existingIssue) {
                  existingIssue.details.affectedCards++;
                }
              }
            } else {
              // Tag doesn't exist at all
              if (!cardTagIssues.has(tagId)) {
                report.issues.push({
                  type: 'card_tag_mismatch',
                  tagId: tagId,
                  tagName: 'UNKNOWN',
                  issue: `Card tag assignment points to non-existent tag`,
                  details: {
                    affectedCards: 1
                  }
                });
                cardTagIssues.add(tagId);
                report.summary.cardTagMismatches++;
              } else {
                // Update the count of affected cards
                const existingIssue = report.issues.find(issue => 
                  issue.type === 'card_tag_mismatch' && issue.tagId === tagId
                );
                if (existingIssue) {
                  existingIssue.details.affectedCards++;
                }
              }
            }
          }
        });
      }
    });

    return report;

  } catch (error) {
    console.error('❌ Error checking tag consistency:', error);
    throw error;
  }
}

function printReport(report: ConsistencyReport): void {
  console.log('\n📊 TAG ID CONSISTENCY REPORT');
  console.log('================================');
  console.log(`Total Tags: ${report.totalTags}`);
  console.log(`Total Cards: ${report.totalCards}`);
  console.log(`Total Issues: ${report.issues.length}`);
  console.log('');
  
  console.log('📈 SUMMARY:');
  console.log(`  ParentId Mismatches: ${report.summary.parentIdMismatches}`);
  console.log(`  Card Tag Mismatches: ${report.summary.cardTagMismatches}`);
  console.log(`  Orphaned Tags: ${report.summary.orphanedTags}`);
  console.log('');

  if (report.issues.length > 0) {
    console.log('🚨 DETAILED ISSUES:');
    console.log('===================');
    
    // Group issues by type
    const parentIdIssues = report.issues.filter(i => i.type === 'parentId_mismatch');
    const cardTagIssues = report.issues.filter(i => i.type === 'card_tag_mismatch');
    const orphanedIssues = report.issues.filter(i => i.type === 'orphaned_tag');

    if (parentIdIssues.length > 0) {
      console.log('\n🔗 PARENT ID MISMATCHES:');
      parentIdIssues.forEach(issue => {
        console.log(`  • ${issue.tagName} (${issue.tagId})`);
        console.log(`    Current parentId: ${issue.details.currentParentId}`);
        console.log(`    Should be: ${issue.details.correctParentId} (${issue.details.parentName})`);
      });
    }

    if (cardTagIssues.length > 0) {
      console.log('\n🏷️  CARD TAG MISMATCHES:');
      cardTagIssues.forEach(issue => {
        console.log(`  • ${issue.tagName} (${issue.tagId})`);
        if (issue.details.correctTagId) {
          console.log(`    Should be: ${issue.details.correctTagId}`);
        }
        console.log(`    Affects ${issue.details.affectedCards} cards`);
      });
    }

    if (orphanedIssues.length > 0) {
      console.log('\n👻 ORPHANED TAGS:');
      orphanedIssues.forEach(issue => {
        console.log(`  • ${issue.tagName} (${issue.tagId})`);
        console.log(`    Missing parent: ${issue.details.parentId}`);
      });
    }
  } else {
    console.log('✅ No consistency issues found!');
  }
}

// Main execution
if (require.main === module) {
  checkTagIdConsistency()
    .then(printReport)
    .then(() => {
      console.log('\n🎯 Check complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { checkTagIdConsistency, printReport }; 