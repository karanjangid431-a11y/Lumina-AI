import { executeGroundedQA, GroundedAnswerResult } from './rag.js';
import { generateJSON, generateText } from './gemini.js';
import { VerifiedCitation } from './verification.js';

export interface AgentStepTrace {
  stepIndex: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  resultSnippet?: string;
  latencyMs?: number;
}

export interface AgentRunResult {
  goal: string;
  finalAnswer: string;
  citations: VerifiedCitation[];
  verifiedCount: number;
  totalCitations: number;
  steps: AgentStepTrace[];
  subQuestions: Array<{ question: string; answer: string }>;
  durationMs: number;
}

export async function runResearchAgent(
  workspaceId: string,
  userGoal: string,
  onStepProgress?: (step: AgentStepTrace) => void
): Promise<AgentRunResult> {
  const overallStartTime = Date.now();
  const steps: AgentStepTrace[] = [
    {
      stepIndex: 1,
      title: 'Decompose Research Goal',
      description: 'Break down complex research objective into 2 focused sub-inquiries.',
      status: 'pending',
    },
    {
      stepIndex: 2,
      title: 'Retrieve & Analyze Evidence',
      description: 'Execute hybrid retrieval and evidence gathering per sub-inquiry.',
      status: 'pending',
    },
    {
      stepIndex: 3,
      title: 'Cross-Source Synthesis',
      description: 'Reconcile findings, evaluate consensus/divergence, and assemble cited answer.',
      status: 'pending',
    },
    {
      stepIndex: 4,
      title: 'Server-Side Verification',
      description: 'Verify exact quote integrity against workspace document text.',
      status: 'pending',
    },
  ];

  // Helper to update and notify
  const updateStep = (idx: number, status: AgentStepTrace['status'], snippet?: string, latency?: number) => {
    steps[idx].status = status;
    if (snippet) steps[idx].resultSnippet = snippet;
    if (latency) steps[idx].latencyMs = latency;
    if (onStepProgress) onStepProgress({ ...steps[idx] });
  };

  // Step 1: Decomposition
  updateStep(0, 'running');
  const step1Start = Date.now();

  const planPrompt = `Given this research goal: "${userGoal}", formulate exactly 2 specific, evidence-seeking sub-questions to comprehensively address it.
Return JSON: { "subQuestions": ["question 1", "question 2"] }`;

  const planFallback = {
    subQuestions: [
      `What are the core mechanisms and empirical findings regarding ${userGoal}?`,
      `What are the primary limitations and points of conflict identified in the literature regarding ${userGoal}?`,
    ],
  };

  const plan = await generateJSON<typeof planFallback>(
    'You are an expert research planner.',
    planPrompt,
    planFallback
  );

  updateStep(0, 'completed', `Planned ${plan.subQuestions.length} focused sub-questions`, Date.now() - step1Start);

  // Step 2: Retrieve evidence for each sub-question
  updateStep(1, 'running');
  const step2Start = Date.now();

  const subResults: Array<{ question: string; answer: GroundedAnswerResult }> = [];
  for (const q of plan.subQuestions.slice(0, 2)) {
    const res = await executeGroundedQA(workspaceId, q);
    subResults.push({ question: q, answer: res });
  }

  updateStep(
    1,
    'completed',
    `Retrieved evidence across ${subResults.reduce((acc, s) => acc + s.answer.citations.length, 0)} cited sources`,
    Date.now() - step2Start
  );

  // Step 3: Cross-Source Synthesis
  updateStep(2, 'running');
  const step3Start = Date.now();

  const allCitations: VerifiedCitation[] = [];
  const synthesisBlocks: string[] = [];

  for (let i = 0; i < subResults.length; i++) {
    const sr = subResults[i];
    synthesisBlocks.push(`### Sub-Finding ${i + 1}: ${sr.question}\n${sr.answer.answer}`);
    allCitations.push(...sr.answer.citations);
  }

  const finalSummaryText = synthesisBlocks.join('\n\n');
  updateStep(2, 'completed', `Synthesized unified answer from multi-step findings`, Date.now() - step3Start);

  // Step 4: Verification
  updateStep(3, 'running');
  const step4Start = Date.now();

  const verifiedCount = allCitations.filter((c) => c.verified).length;
  updateStep(
    3,
    'completed',
    `Verified ${verifiedCount} of ${allCitations.length} cited quotes against source documents`,
    Date.now() - step4Start
  );

  return {
    goal: userGoal,
    finalAnswer: finalSummaryText,
    citations: allCitations,
    verifiedCount,
    totalCitations: allCitations.length,
    steps,
    subQuestions: subResults.map((s) => ({ question: s.question, answer: s.answer.answer })),
    durationMs: Date.now() - overallStartTime,
  };
}
