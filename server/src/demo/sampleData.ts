import crypto from 'crypto';
import { inMemoryStore, ChunkRecord, SourceRecord, WorkspaceRecord } from '../db/pool.js';
import { embedText } from '../services/gemini.js';
import { chunkDocument } from '../services/chunker.js';

export async function seedDemoWorkspaces() {
  console.log('[Demo Seed] Initializing 3 high-fidelity demonstration workspaces...');

  // --- WORKSPACE 1: ACADEMIC MODE ---
  const ws1Id = 'ws-academic-ai-reasoning';
  const ws1: WorkspaceRecord = {
    id: ws1Id,
    name: 'LLM Reasoning & Alignment Frontiers',
    description: 'Empirical research into chain-of-thought, retrieval-augmented generation, and constitutional AI safety guardrails.',
    mode: 'academic',
    domain: 'Computer Science & AI',
    settings: { plainLanguage: false, targetLanguage: 'English' },
    created_at: new Date('2026-09-15T10:00:00Z'),
    updated_at: new Date('2026-09-20T14:30:00Z'),
  };
  inMemoryStore.workspaces.set(ws1Id, ws1);

  // Sources for WS1
  const ws1Sources = [
    {
      id: 'src-vaswani-2017',
      title: 'Attention Is All You Need: Architectural Foundations and Scaled Self-Attention',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
      year: 2017,
      venue: 'Advances in Neural Information Processing Systems (NeurIPS)',
      citation_count: 114500,
      open_access: true,
      url: 'https://arxiv.org/abs/1706.03762',
      doi: '10.48550/arXiv.1706.03762',
      source_type: 'paper' as const,
      text: `Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.

Section 1: Introduction
Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.

Section 3: Model Architecture
The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions. In our work we divide key, query, and value projections into h=8 parallel attention heads. On the WMT 2014 English-to-German translation task, the big transformer model achieves 28.4 BLEU, outperforming existing best models by over 2.0 BLEU.`,
    },
    {
      id: 'src-wei-2022',
      title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
      authors: ['Jason Wei', 'Xuezhi Wang', 'Dale Schuurmans', 'Maarten Bosma', 'Ed Chi', 'Quoc Le', 'Denny Zhou'],
      year: 2022,
      venue: 'Conference on Neural Information Processing Systems (NeurIPS)',
      citation_count: 6850,
      open_access: true,
      url: 'https://arxiv.org/abs/2201.11903',
      doi: '10.48550/arXiv.2201.11903',
      source_type: 'paper' as const,
      text: `Abstract: We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting.

Section 2: Chain of Thought Prompting
A chain of thought is a sequence of natural language intermediate steps that leads to the final output. We hypothesize that chain-of-thought prompting has several attractive properties for language model reasoning: first, it allows models to decompose multi-step problems into intermediate steps that solve each part independently; second, it provides an interpretable window into the behavior of the model, allowing developers to debug where a reasoning path went wrong; third, chain of thought reasoning can be used for tasks such as math word problems, commonsense reasoning, and symbolic manipulation.

Section 4: Arithmetic Reasoning Results
On GSM8K, prompting PaLM 540B with chain of thought yields a new state-of-the-art accuracy of 58%, exceeding standard prompting by over 30 percentage points and outperforming even fine-tuned GPT-3. We observe that chain-of-thought prompting is an emergent ability that only appears in models scaled beyond roughly 100 billion parameters.`,
    },
    {
      id: 'src-lewis-2020',
      title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
      authors: ['Patrick Lewis', 'Ethan Perez', 'Aleksandra Piktus', 'Fabio Petroni', 'Vladimir Karpukhin'],
      year: 2020,
      venue: 'NeurIPS 2020 Proceedings',
      citation_count: 5410,
      open_access: true,
      url: 'https://arxiv.org/abs/2005.11401',
      doi: '10.48550/arXiv.2005.11401',
      source_type: 'paper' as const,
      text: `Abstract: Large pre-trained language models store factual knowledge in their parameters, but their ability to access and precisely manipulate knowledge is limited, often leading to hallucinations on knowledge-intensive tasks. We present a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG)—models which combine pre-trained parametric memory with non-parametric retrieval memory.

Section 2: Methods
Our RAG models use the input sequence x to retrieve text passages z and use them as additional context when generating the target sequence y. We leverage DPR (Dense Passage Retrieval) for non-parametric memory, where the retriever p_eta(z|x) is based on dual-encoders using BERT representations. The generator p_theta(y_i | x, z, y_{1:i-1}) is parameterized using BART.

Section 4: Empirical Findings
We evaluate RAG on open-domain question answering benchmarks including Natural Questions, WebQuestions, and CuratedTREC. RAG establishes new state-of-the-art results across open-domain QA without requiring expensive continuous pre-training. Crucially, human evaluation demonstrates that RAG generations are significantly more factual and contain markedly fewer hallucinations than pure parametric baseline models.`,
    },
    {
      id: 'src-bai-2022',
      title: 'Constitutional AI: Harmlessness from AI Feedback and Self-Correction',
      authors: ['Yuntao Bai', 'Saurav Kadavath', 'Sandipan Kundu', 'Amanda Askell', 'Jackson Kernion'],
      year: 2022,
      venue: 'arXiv preprint',
      citation_count: 2190,
      open_access: true,
      url: 'https://arxiv.org/abs/2212.08073',
      doi: '10.48550/arXiv.2212.08073',
      source_type: 'paper' as const,
      text: `Abstract: As AI systems become more capable, we would like to train them to behave harmlessly and follow constitutional principles without requiring human supervision for every decision. We experiment with methods for training a harmless AI assistant through self-improvement, without any human feedback labels for harmlessness.

Section 1: Constitutional Principles
The only human input is a list of principles or instructions, alongside few-shot exemplars. The method consists of both a supervised learning phase (critique and revision) and a reinforcement learning phase (RL from AI Feedback, RLAIF). During the critique phase, the model is prompted to critique its own responses according to a constitution consisting of rules like 'Please choose the response that is most harmless, helpful, and honest.'

Section 3: Evaluation & Alignment
Our results show that RLAIF achieves Pareto-superior harmlessness without degrading helpfulness. In contrast to standard RLHF which requires continuous expensive human raters, Constitutional AI allows rapid policy updates and transparency since the rules guiding model values are explicitly declared in human-readable constitutional principles.`,
    },
  ];

  await ingestSourcesForWorkspace(ws1Id, ws1Sources);

  // Seed Insights for WS1
  inMemoryStore.insights.set(`${ws1Id}:synthesis`, {
    overallSummary:
      'The modern landscape of large language models centers on three complementary pillars: scaled multi-head self-attention architectures, intermediate chain-of-thought elicitation for multi-step reasoning, and non-parametric retrieval grounding to mitigate hallucinations. Recent advances in Constitutional AI further provide verifiable guardrails without sacrificing downstream reasoning utility.',
    themes: [
      {
        name: 'Parallel Attention Architectures',
        description: 'Replacement of recurrence with multi-head self-attention enables unprecedented scaling over large corpora.',
        citations: ['Vaswani et al., 2017'],
      },
      {
        name: 'Emergent Multi-Step Reasoning',
        description: 'Chain-of-thought prompting breaks down arithmetic and symbolic problems into auditable intermediate steps in 100B+ models.',
        citations: ['Wei et al., 2022'],
      },
      {
        name: 'Hybrid Parametric & Non-Parametric Memory',
        description: 'Dense retrieval augmented generation connects pre-trained weights to factual corpora, drastically cutting hallucinations.',
        citations: ['Lewis et al., 2020'],
      },
      {
        name: 'Constitutional Rule-Based Guardrails',
        description: 'Self-critique and AI feedback using explicit constitutional principles replace opaque human preference labeling.',
        citations: ['Bai et al., 2022'],
      },
    ],
    consensus: [
      {
        statement: 'Pure parametric models are prone to factual hallucinations unless grounded by external retrieval or chain-of-thought self-verification.',
        supportingSources: ['Lewis et al. (2020)', 'Wei et al. (2022)'],
      },
      {
        statement: 'Parallel self-attention scales superiorly to recurrent architectures across sequence lengths.',
        supportingSources: ['Vaswani et al. (2017)'],
      },
    ],
    conflicts: [
      {
        topic: 'Fine-Tuning vs. Few-Shot In-Context Prompting',
        perspectiveA: 'RAG and dense passage retrieval demonstrate that fine-tuning reader-generator networks yields optimal task accuracy (Lewis et al.).',
        perspectiveB: 'Chain-of-thought shows that emergent capabilities in 100B+ models can exceed fine-tuned models solely through zero-shot or few-shot prompting without weight updates (Wei et al.).',
      },
    ],
    gaps: [
      {
        gap: 'Real-time multi-modal retrieval fusion under high-throughput latency constraints',
        impact: 'Critical for production robotics and edge reasoning assistants',
        confidence: 'High',
      },
      {
        gap: 'Formal mathematical verification of chain-of-thought intermediate deduction steps',
        impact: 'Necessary for safety-critical medical and legal deployment',
        confidence: 'Medium',
      },
    ],
    readingPath: [
      {
        order: 1,
        title: 'Attention Is All You Need',
        stage: 'Foundational',
        reason: 'Master the underlying transformer building blocks and self-attention equations.',
      },
      {
        order: 2,
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        stage: 'Core Architecture',
        reason: 'Understand how non-parametric external memory combines with parametric weights to eliminate hallucinations.',
      },
      {
        order: 3,
        title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
        stage: 'Reasoning Frontier',
        reason: 'Learn how emergent multi-step deduction unfolds across scaled architectures.',
      },
      {
        order: 4,
        title: 'Constitutional AI: Harmlessness from AI Feedback and Self-Correction',
        stage: 'Alignment & Safety',
        reason: 'Explore how explicit constitutional guardrails govern model outputs without human bottlenecking.',
      },
    ],
  });

  // Seed WS1 Extraction Table
  inMemoryStore.extractionTables.set('tbl-ws1-methods', {
    id: 'tbl-ws1-methods',
    workspace_id: ws1Id,
    title: 'Model Architecture & Benchmark Comparison',
    description: 'Structured comparison of core mechanisms, parameter regimes, and primary evaluation benchmarks.',
    columns: [
      { id: 'col-arch', name: 'Core Architecture', description: 'Primary network or prompt framework', type: 'text' },
      { id: 'col-param', name: 'Scale / Param Regime', description: 'Model size tested', type: 'text' },
      { id: 'col-bench', name: 'Primary Benchmarks', description: 'Evaluation datasets', type: 'text' },
      { id: 'col-keymetric', name: 'Key Metric Reported', description: 'Headline quantitative result', type: 'text' },
    ],
    rows: [
      {
        sourceId: 'src-vaswani-2017',
        sourceTitle: 'Attention Is All You Need',
        cells: {
          'col-arch': { value: 'Transformer (Multi-Head Self-Attention)', quote: 'The Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.', verified: true },
          'col-param': { value: 'Base (65M) & Big (213M)', quote: 'In our work we divide key, query, and value projections into h=8 parallel attention heads.', verified: true },
          'col-bench': { value: 'WMT 2014 English-to-German & English-to-French', quote: 'On the WMT 2014 English-to-German translation task, the big transformer model achieves 28.4 BLEU', verified: true },
          'col-keymetric': { value: '28.4 BLEU (EN-DE), +2.0 BLEU over SOTA', quote: 'outperforming existing best models by over 2.0 BLEU.', verified: true },
        },
      },
      {
        sourceId: 'src-wei-2022',
        sourceTitle: 'Chain-of-Thought Prompting',
        cells: {
          'col-arch': { value: 'Few-Shot Chain-of-Thought Prompting', quote: 'generating a chain of thought—a series of intermediate reasoning steps', verified: true },
          'col-param': { value: 'PaLM 540B, GPT-3 175B, LaMDA 137B', quote: 'prompting PaLM 540B with chain of thought yields a new state-of-the-art accuracy of 58%', verified: true },
          'col-bench': { value: 'GSM8K, SVAMP, ASDiv, StrategyQA', quote: 'On GSM8K, prompting PaLM 540B with chain of thought yields a new state-of-the-art', verified: true },
          'col-keymetric': { value: '58% Accuracy on GSM8K (+30% over standard prompting)', quote: 'exceeding standard prompting by over 30 percentage points', verified: true },
        },
      },
      {
        sourceId: 'src-lewis-2020',
        sourceTitle: 'Retrieval-Augmented Generation (RAG)',
        cells: {
          'col-arch': { value: 'DPR Dense Retriever + BART Seq2Seq Generator', quote: 'We leverage DPR for non-parametric memory... The generator is parameterized using BART.', verified: true },
          'col-param': { value: 'BART Large (400M) + Wikipedia DPR index', quote: 'RAG models use the input sequence x to retrieve text passages z and use them as additional context', verified: true },
          'col-bench': { value: 'Natural Questions, WebQuestions, CuratedTREC', quote: 'We evaluate RAG on open-domain question answering benchmarks including Natural Questions', verified: true },
          'col-keymetric': { value: 'New SOTA on Open-Domain QA, reduced hallucinations', quote: 'RAG generations are significantly more factual and contain markedly fewer hallucinations', verified: true },
        },
      },
    ],
  });

  // --- WORKSPACE 2: LEGAL MODE ---
  const ws2Id = 'ws-legal-cloud-contracts';
  const ws2: WorkspaceRecord = {
    id: ws2Id,
    name: 'Enterprise Cloud Agreements & Liability Analysis',
    description: 'Contract analysis covering SaaS terms, data privacy addenda (DPA), limitation of liability caps, and indemnification exposure.',
    mode: 'legal',
    domain: 'Humanities & Law',
    settings: { plainLanguage: false, targetLanguage: 'English' },
    created_at: new Date('2026-09-18T09:00:00Z'),
    updated_at: new Date('2026-09-22T16:00:00Z'),
  };
  inMemoryStore.workspaces.set(ws2Id, ws2);

  const ws2Sources = [
    {
      id: 'src-mcsa-2026',
      title: 'Master Cloud Services Agreement (MCSA-2026-v4)',
      authors: ['Enterprise Legal Counsel'],
      year: 2026,
      venue: 'Corporate Legal Vault',
      citation_count: 0,
      open_access: false,
      source_type: 'pdf' as const,
      text: `MASTER CLOUD SERVICES AGREEMENT (MCSA)
This Master Agreement is entered into between Apex Cloud Systems Inc. ("Provider") and Meridian Global Enterprises ("Customer").

Section 4: Term and Termination
4.1 Term: This Agreement commences on the Effective Date and shall continue for an initial term of thirty-six (36) months ("Initial Term").
4.2 Termination for Convenience: Either party may terminate this Agreement without cause upon ninety (90) days prior written notice, subject to payment of all accrued fees.
4.3 Termination for Cause: Either party may terminate immediately upon written notice if the other party commits a material breach of this Agreement and fails to cure such breach within thirty (30) days of receiving written notice.

Section 8: Limitation of Liability
8.1 Direct Damages Cap: TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, EACH PARTY'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE FEES PAID OR PAYABLE BY CUSTOMER UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS PRECEDING THE INCIDENT GIVING RISE TO LIABILITY.
8.2 Consequential Damages Exclusion: NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION, REGARDLESS OF THE THEORY OF LIABILITY.
8.3 Uncapped Liabilities: The limitations in Section 8.1 shall not apply to: (a) breach of Section 9 (Confidentiality); (b) gross negligence or willful misconduct; or (c) indemnification obligations under Section 11.

Section 11: Intellectual Property Indemnification
11.1 Provider Indemnity: Provider shall defend, indemnify, and hold harmless Customer from and against any third-party claim alleging that Customer's authorized use of the Cloud Services infringes any valid United States patent, copyright, or trademark. Provider shall pay all damages finally awarded by a court of competent jurisdiction or agreed in settlement.
11.2 Exclusions: Provider shall have no liability under Section 11.1 if the infringement arises from: (a) modification of the Services by Customer; (b) combination of the Services with third-party software not supplied by Provider; or (c) use of the Services after notice to cease such use.

Section 14: Governing Law and Dispute Resolution
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of laws principles. The parties agree that exclusive jurisdiction and venue for any legal proceeding shall be the state and federal courts located in Wilmington, Delaware.`,
    },
    {
      id: 'src-dpa-2026',
      title: 'Global Data Processing Addendum (GDPR & CCPA Schedule)',
      authors: ['Privacy Compliance Directorate'],
      year: 2026,
      venue: 'Corporate Compliance Archive',
      citation_count: 0,
      open_access: false,
      source_type: 'docx' as const,
      text: `SCHEDULE B: DATA PROCESSING ADDENDUM (DPA)
This Data Processing Addendum supplements the MCSA between Apex Cloud Systems ("Processor") and Meridian Global ("Controller").

Section 3: Controller and Processor Obligations
3.1 Processing of Personal Data: Processor shall process Personal Data solely on documented instructions from Controller, including with respect to transfers of personal data to a third country or an international organization, unless required to do so by applicable Union or Member State law.
3.2 Security Measures: Processor shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including encryption of personal data at rest (AES-256) and in transit (TLS 1.3).
3.3 Security Incident Notification: Processor shall notify Controller without undue delay, and in any event within forty-eight (48) hours, upon becoming aware of a confirmed Personal Data Breach affecting Controller Personal Data. Such notification shall describe the nature of the breach, the categories and approximate number of data subjects affected, and remediation steps undertaken.

Section 6: Audits and Inspections
Processor shall make available to Controller all information necessary to demonstrate compliance with GDPR Article 28 and allow for and contribute to audits, including inspections, conducted by Controller or an independent auditor mandated by Controller, no more than once per calendar year with thirty (30) days prior written notice.

Section 9: International Transfers
All transfers of EEA or UK Personal Data to countries not recognized as providing an adequate level of data protection shall be governed by the standard contractual clauses (SCCs) set out in Commission Implementing Decision (EU) 2021/914.`,
    },
  ];

  await ingestSourcesForWorkspace(ws2Id, ws2Sources);

  // Legal Insights
  inMemoryStore.insights.set(`${ws2Id}:synthesis`, {
    overallSummary:
      'Contract review of the Master Cloud Services Agreement (MCSA) and Data Processing Addendum (DPA) reveals standard commercial enterprise terms with significant risk mitigation in Section 8 and Section 11. Crucially, while direct damages are capped at 12 months fees paid, IP indemnification and confidentiality carve-outs remain uncapped. DPA obligations require 48-hour breach notification.',
    themes: [
      { name: 'Liability Allocation', description: '12-month rolling fee cap for direct damages; gross negligence, confidentiality, and IP indemnity are explicitly uncapped.', citations: ['MCSA Section 8'] },
      { name: 'IP Indemnification', description: 'Full defense and indemnification for third-party patent/copyright claims, with standard carve-outs for customer modifications.', citations: ['MCSA Section 11'] },
      { name: 'Data Breach Notice', description: 'Strict 48-hour notification window for confirmed Personal Data breaches under GDPR Schedule B.', citations: ['DPA Section 3.3'] },
    ],
    consensus: [
      { statement: 'Provider assumes full defense obligation for third-party IP infringement claims subject to Delaware venue.', supportingSources: ['MCSA-2026'] },
      { statement: 'Customer personal data is encrypted via AES-256 at rest and TLS 1.3 in transit.', supportingSources: ['DPA-2026'] },
    ],
    conflicts: [
      {
        topic: 'Notice Timing: Breach vs. Contract Termination',
        perspectiveA: 'Security breach notification must occur within 48 hours without undue delay (DPA Section 3.3).',
        perspectiveB: 'Material breach cure period requires a 30-day notice window prior to contract termination for cause (MCSA Section 4.3).',
      },
    ],
    gaps: [
      { gap: 'Absence of specific Service Level Agreement (SLA) uptime commitments and financial credit formulas in base agreement', impact: 'High risk of dispute during cloud outages', confidence: 'High' },
      { gap: 'No specified cyber-insurance minimum policy limits ($10M customary for enterprise tier)', impact: 'Exposure in catastrophic ransomware event', confidence: 'Medium' },
    ],
  });

  // --- WORKSPACE 3: BUSINESS / REPORT MODE ---
  const ws3Id = 'ws-business-ai-capex';
  const ws3: WorkspaceRecord = {
    id: ws3Id,
    name: 'Q3 2026 Enterprise AI Infrastructure & Cloud Capex',
    description: 'Executive briefing and KPI extraction on cloud hyperscaler capital expenditures, GPU cluster deployment, and return on investment.',
    mode: 'business',
    domain: 'Economics & Business',
    settings: { plainLanguage: false, targetLanguage: 'English' },
    created_at: new Date('2026-09-20T12:00:00Z'),
    updated_at: new Date('2026-09-25T17:00:00Z'),
  };
  inMemoryStore.workspaces.set(ws3Id, ws3);

  const ws3Sources = [
    {
      id: 'src-capex-q3',
      title: 'Global Cloud Hyperscaler Capex & Silicon Roadmap (Q3 2026)',
      authors: ['Strategic Technology Research Group'],
      year: 2026,
      venue: 'Market Intelligence Brief',
      citation_count: 0,
      open_access: true,
      source_type: 'pdf' as const,
      text: `EXECUTIVE SUMMARY: Q3 2026 HYPERSCALER INFRASTRUCTURE REPORT
Capital expenditures among top 4 cloud providers (Amazon, Microsoft, Alphabet, Meta) reached an annualized run-rate of $184 billion in Q3 2026, representing a 42% year-over-year surge driven by generative AI cluster installations.

Key Findings & KPIs:
1. Aggregate Capex: $46.8 billion deployed in Q3 2026 alone. Data center power buildout and electrical substation interconnects consumed 28% of total outlays.
2. Accelerator Procurement: Over 1.2 million next-generation AI accelerators shipped during the quarter, with 68% attributed to NVIDIA Blackwell-architecture GPUs and 22% captured by custom internal ASICs (Google TPU v6 and AWS Trainium3).
3. Operating Margins: Cloud operating profit margins expanded slightly to 34.2%, up 120 basis points from Q2, as enterprise inferencing workloads matured and capacity utilization reached 88%.

Risks and Headwinds:
- Power Interconnect Delays: The average lead time for utility grid interconnects across Northern Virginia, Texas, and Ireland has stretched from 24 months in 2024 to 48 months in 2026.
- Depreciation Horizon: Hyperscalers continue to depreciate AI server assets over a 5-year useful life schedule, posing asset impairment risks if generational performance advances render 2024-era clusters uneconomic ahead of schedule.`,
    },
    {
      id: 'src-tco-survey',
      title: 'Enterprise AI ROI and Total Cost of Ownership Survey 2026',
      authors: ['Gartner & McKinsey Industry Benchmarks'],
      year: 2026,
      venue: 'Enterprise Executive Review',
      citation_count: 0,
      open_access: true,
      source_type: 'txt' as const,
      text: `ENTERPRISE AI TOTAL COST OF OWNERSHIP & PRODUCTIVITY METRICS
Survey sample: 450 Global 2000 CIOs and Chief AI Officers surveyed in August 2026.

Key Quantitative Metrics:
- Median Payback Period: 14.2 months for internal enterprise search, document review, and code assistance deployments.
- Software Engineering Productivity: Organizations report a 26% reduction in cycle time for routine feature development and bug triage.
- Legal & Contract Review Efficiency: Contract review cycle times declined by 64%, from an average of 4.8 business days to 1.7 business days when aided by verified citation extraction systems.
- Spend Distribution: Inference token spend represents 72% of recurring enterprise AI budgets, while model fine-tuning accounts for 18% and vector database infrastructure accounts for 10%.`,
    },
  ];

  await ingestSourcesForWorkspace(ws3Id, ws3Sources);

  // Business Synthesis
  inMemoryStore.insights.set(`${ws3Id}:synthesis`, {
    overallSummary:
      'Hyperscaler capital expenditures surged 42% YoY to an annualized $184B in Q3 2026, driven by high-density GPU cluster deployments. Concurrently, enterprise adoption reached a pivotal inflection point: median ROI payback dropped to 14.2 months, with legal document and contract review velocity demonstrating the highest productivity gains (64% cycle reduction).',
    themes: [
      { name: 'Hyperscaler Capex Expansion', description: '$46.8B quarterly deployment with 1.2M accelerators shipped; 28% spent on power/substation infrastructure.', citations: ['Hyperscaler Report Q3'] },
      { name: 'Enterprise ROI & Payback', description: 'Enterprise deployments achieve median 14.2 month payback; inference represents 72% of recurring budgets.', citations: ['Enterprise TCO Survey'] },
      { name: 'Grid Power Bottleneck', description: 'Utility interconnect lead times lengthened to 48 months, emerging as the dominant constraint over silicon availability.', citations: ['Hyperscaler Report Q3'] },
    ],
    consensus: [
      { statement: 'Generative AI inference has surpassed model training to become the dominant workload and recurring budget expenditure.', supportingSources: ['Hyperscaler Capex Report', 'Enterprise TCO Survey'] },
    ],
    conflicts: [
      {
        topic: 'Hardware Useful Life & Depreciation Schedules',
        perspectiveA: 'Hyperscalers maintain 5-year depreciation schedules to smooth operating earnings.',
        perspectiveB: 'Rapid generational accelerator leaps risk early economic obsolescence for 2024-era clusters.',
      },
    ],
    gaps: [
      { gap: 'Standardized metrics for enterprise agentic software reliability in mission-critical automated pipelines', impact: 'Determines pace of autonomous enterprise workflows', confidence: 'High' },
    ],
  });

  console.log('[Demo Seed] Completed successfully. 3 workspaces with 8 verified sources and analyses loaded.');
}

// Helper to chunk, embed, and store sources for a workspace
async function ingestSourcesForWorkspace(workspaceId: string, sources: any[]) {
  for (const s of sources) {
    const contentHash = crypto.createHash('sha256').update(s.text.trim()).digest('hex');
    const sourceRecord: SourceRecord = {
      id: s.id,
      workspace_id: workspaceId,
      title: s.title,
      authors: s.authors || [],
      year: s.year,
      venue: s.venue,
      citation_count: s.citation_count || 0,
      open_access: s.open_access || false,
      url: s.url,
      doi: s.doi,
      source_type: s.source_type,
      content_hash: contentHash,
      raw_text: s.text,
      metadata: {},
      ingestion_status: 'ready',
      created_at: new Date(),
    };
    inMemoryStore.sources.set(s.id, sourceRecord);

    // Chunk source
    const rawDoc = { text: s.text };
    const chunks = chunkDocument(rawDoc, 650, 80);

    for (const c of chunks) {
      const chunkId = `chk-${s.id}-${c.chunkIndex}`;
      const embedding = await embedText(c.content, 'RETRIEVAL_DOCUMENT');
      const chunkRecord: ChunkRecord = {
        id: chunkId,
        source_id: s.id,
        workspace_id: workspaceId,
        chunk_index: c.chunkIndex,
        page_number: c.pageNumber,
        section_title: c.sectionTitle,
        content: c.content,
        embedding,
        token_count: c.tokenCount,
        created_at: new Date(),
      };
      inMemoryStore.chunks.set(chunkId, chunkRecord);
    }
  }
}
