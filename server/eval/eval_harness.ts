/**
 * Lumina-AI Production Retrieval & Verification Evaluation Harness
 * Measures:
 * 1. Retrieval Recall@k (is the ground-truth document retrieved in top k?)
 * 2. Citation Quote Validity (are generated quotes exact substrings of stored chunks?)
 * 3. Refusal Accuracy (does system refuse when asked out-of-domain ungrounded questions?)
 */

import { executeGroundedQA } from '../src/services/rag.js';
import { seedDemoWorkspaces } from '../src/demo/sampleData.js';
import { inMemoryStore } from '../src/db/pool.js';

interface GoldenTestCase {
  id: string;
  workspaceId: string;
  query: string;
  expectedSourceTitle: string;
  expectedAnswerSubstring: string;
  shouldRefuse: boolean;
}

const GOLDEN_DATASET: GoldenTestCase[] = [
  {
    id: 'eval-1-transformers',
    workspaceId: 'ws-academic-ai-reasoning',
    query: 'What architecture dispenses with recurrence and convolutions entirely?',
    expectedSourceTitle: 'Attention Is All You Need',
    expectedAnswerSubstring: 'Transformer',
    shouldRefuse: false,
  },
  {
    id: 'eval-2-chain-of-thought',
    workspaceId: 'ws-academic-ai-reasoning',
    query: 'What accuracy did PaLM 540B achieve on the GSM8K arithmetic benchmark when using chain-of-thought prompting?',
    expectedSourceTitle: 'Chain-of-Thought Prompting',
    expectedAnswerSubstring: '58%',
    shouldRefuse: false,
  },
  {
    id: 'eval-3-rag-memory',
    workspaceId: 'ws-academic-ai-reasoning',
    query: 'How does RAG combine parametric memory with non-parametric retrieval memory?',
    expectedSourceTitle: 'Retrieval-Augmented Generation',
    expectedAnswerSubstring: 'DPR',
    shouldRefuse: false,
  },
  {
    id: 'eval-4-legal-liability',
    workspaceId: 'ws-legal-cloud-contracts',
    query: 'What is the limitation of liability direct damages cap in the cloud services agreement?',
    expectedSourceTitle: 'Master Cloud Services Agreement',
    expectedAnswerSubstring: 'twelve (12) months',
    shouldRefuse: false,
  },
  {
    id: 'eval-5-refusal-out-of-domain',
    workspaceId: 'ws-academic-ai-reasoning',
    query: 'What is the recipe for baking chocolate chip cookies on Mars?',
    expectedSourceTitle: '',
    expectedAnswerSubstring: 'Insufficient evidence',
    shouldRefuse: true,
  },
];

async function runEval() {
  console.log('====================================================');
  console.log('🔬 Starting Lumina-AI RAG & Verification Eval Harness');
  console.log('====================================================');

  await seedDemoWorkspaces();

  let recallAt3Hits = 0;
  let totalCitationCount = 0;
  let verifiedCitationCount = 0;
  let refusalCorrect = 0;
  let totalEvaluated = 0;

  for (const testCase of GOLDEN_DATASET) {
    totalEvaluated++;
    console.log(`\n[Case ${totalEvaluated}/${GOLDEN_DATASET.length}] Testing: "${testCase.query}"`);

    const result = await executeGroundedQA(testCase.workspaceId, testCase.query);

    // 1. Refusal Check
    if (testCase.shouldRefuse) {
      if (result.refused) {
        refusalCorrect++;
        console.log(`  ✅ Correctly refused ungrounded query (Gate working). Reason: ${result.refusalReason}`);
      } else {
        console.log(`  ❌ Failed to refuse out-of-domain query. Top chunk: ${result.retrievalTrace.topRetrievedChunks[0]?.sourceTitle}, score: ${result.retrievalTrace.topRetrievedChunks[0]?.keywordScore}`);
      }
      continue;
    }

    // 2. Retrieval Recall@3 Check
    const top3 = result.retrievalTrace.topRetrievedChunks.slice(0, 3);
    const hit = top3.some((c) => c.sourceTitle.toLowerCase().includes(testCase.expectedSourceTitle.toLowerCase()));
    if (hit) {
      recallAt3Hits++;
      console.log(`  ✅ Recall@3 hit: Found "${testCase.expectedSourceTitle}"`);
    } else {
      console.log(`  ❌ Recall@3 miss for: "${testCase.expectedSourceTitle}". Got: [${top3.map(c => c.sourceTitle).join(' | ')}]`);
    }

    // 3. Citation Validity Check
    totalCitationCount += result.totalCitations;
    verifiedCitationCount += result.verifiedCount;
    console.log(`  🔍 Citations Verified: ${result.verifiedCount}/${result.totalCitations} (${result.confidence * 100}% confidence)`);
  }

  const recallScore = ((recallAt3Hits / (GOLDEN_DATASET.length - 1)) * 100).toFixed(1);
  const citationIntegrity = totalCitationCount > 0 ? ((verifiedCitationCount / totalCitationCount) * 100).toFixed(1) : '100';
  const refusalScore = (refusalCorrect / 1) * 100;

  console.log('\n====================================================');
  console.log('📊 EVALUATION HARNESS BENCHMARK RESULTS');
  console.log('====================================================');
  console.log(`Retrieval Recall@3:     ${recallScore}%`);
  console.log(`Citation Quote Validity: ${citationIntegrity}%`);
  console.log(`Refusal Gate Accuracy:  ${refusalScore}%`);
  console.log('====================================================');

  if (Number(recallScore) >= 75 && Number(citationIntegrity) >= 80) {
    console.log('🏆 STATUS: ALL EVAL HARNESS ACCEPTANCE THRESHOLDS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ STATUS: THRESHOLDS FAILED');
    process.exit(1);
  }
}

runEval().catch((err) => {
  console.error('Evaluation crashed:', err);
  process.exit(1);
});
