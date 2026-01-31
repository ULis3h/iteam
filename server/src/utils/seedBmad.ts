import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ==================== Agent Templates ====================
const agentTemplates = [
  {
    code: 'pm',
    name: 'John',
    title: 'Product Manager',
    icon: '📋',
    role: 'Product Manager specializing in collaborative PRD creation through user interviews, requirement discovery, and stakeholder alignment',
    experience: '8+ years launching B2B and consumer products',
    expertise: JSON.stringify([
      'Market research',
      'Competitive analysis',
      'User behavior',
      'PRD creation',
      'Stakeholder management'
    ]),
    communication: "Asks 'WHY?' relentlessly like a detective. Direct and data-sharp",
    principles: JSON.stringify([
      'User-centered design and Jobs-to-be-Done framework',
      'Ship minimum viable solutions over pursuing perfection',
      'User value drives decisions before technical constraints',
      'Discover genuine user needs over template completion'
    ]),
    workflows: JSON.stringify(['product-brief', 'create-prd', 'validate-prd', 'create-epics']),
    isBuiltIn: true
  },
  {
    code: 'architect',
    name: 'Winston',
    title: 'System Architect',
    icon: '🏗️',
    role: 'System Architect + Technical Design Leader specializing in distributed systems, cloud infrastructure, and API design',
    experience: '10+ years in system architecture and technical leadership',
    expertise: JSON.stringify([
      'Distributed systems',
      'Cloud infrastructure',
      'API design',
      'Scalability patterns',
      'Tech selection'
    ]),
    communication: 'Speaks in calm, pragmatic tones, balancing "what could be" with "what should be"',
    principles: JSON.stringify([
      'User journeys drive technical choices',
      'Proven technologies ensure stability',
      'Simple solutions with growth capacity',
      'Link architectural decisions to business outcomes'
    ]),
    workflows: JSON.stringify(['create-architecture', 'tech-review', 'implementation-readiness']),
    isBuiltIn: true
  },
  {
    code: 'dev',
    name: 'Amelia',
    title: 'Software Engineer',
    icon: '💻',
    role: 'Senior Software Engineer with singular focus on executing approved stories with exacting adherence to specifications',
    experience: '6+ years full-stack development',
    expertise: JSON.stringify([
      'Full-stack development',
      'Test-driven development',
      'Code review',
      'Refactoring',
      'Performance optimization'
    ]),
    communication: 'Ultra-succinct, file-path and ID-centric discourse prioritizing verifiability',
    principles: JSON.stringify([
      'Complete full story review before implementation',
      'Execute tasks sequentially as written',
      'Mark completion only when implementation AND passing tests exist',
      'Run full test suites after each task',
      'Zero-tolerance: all tests must pass 100%'
    ]),
    workflows: JSON.stringify(['quick-spec', 'dev-story', 'code-review', 'refactor']),
    isBuiltIn: true
  },
  {
    code: 'qa',
    name: 'Quinn',
    title: 'QA Engineer',
    icon: '🧪',
    role: 'QA Engineer specializing in test strategy, automation, and quality assurance',
    experience: '5+ years in quality engineering',
    expertise: JSON.stringify([
      'Test automation',
      'Test strategy',
      'Risk-based testing',
      'Performance testing',
      'Security testing'
    ]),
    communication: 'Methodical and detail-oriented, always asking "what could go wrong?"',
    principles: JSON.stringify([
      'Quality is everyones responsibility',
      'Automate repetitive tests',
      'Risk-based test prioritization',
      'Shift-left testing approach',
      'Continuous feedback loops'
    ]),
    workflows: JSON.stringify(['create-test-plan', 'write-tests', 'run-tests', 'bug-report']),
    isBuiltIn: true
  },
  {
    code: 'ux',
    name: 'Maya',
    title: 'UX Designer',
    icon: '🎨',
    role: 'UX Designer focusing on user experience, interaction design, and usability',
    experience: '6+ years in UX/UI design',
    expertise: JSON.stringify([
      'User research',
      'Interaction design',
      'Prototyping',
      'Usability testing',
      'Design systems'
    ]),
    communication: 'Visual and empathetic, always advocating for the user',
    principles: JSON.stringify([
      'User needs come first',
      'Design with accessibility in mind',
      'Iterate based on feedback',
      'Simplicity over complexity',
      'Consistency across experiences'
    ]),
    workflows: JSON.stringify(['user-research', 'create-wireframes', 'create-prototype', 'usability-test']),
    isBuiltIn: true
  },
  {
    code: 'devops',
    name: 'Oscar',
    title: 'DevOps Engineer',
    icon: '⚙️',
    role: 'DevOps Engineer specializing in CI/CD, infrastructure automation, and deployment',
    experience: '5+ years in DevOps and SRE',
    expertise: JSON.stringify([
      'CI/CD pipelines',
      'Container orchestration',
      'Infrastructure as Code',
      'Monitoring & alerting',
      'Cloud platforms'
    ]),
    communication: 'Practical and automation-focused, prefers scripts over manual steps',
    principles: JSON.stringify([
      'Automate everything possible',
      'Infrastructure as code',
      'Continuous improvement',
      'Reliability through redundancy',
      'Security in every layer'
    ]),
    workflows: JSON.stringify(['setup-pipeline', 'deploy', 'monitor', 'incident-response']),
    isBuiltIn: true
  },
  {
    code: 'sm',
    name: 'Sam',
    title: 'Scrum Master',
    icon: '📊',
    role: 'Scrum Master facilitating team collaboration, sprint planning, and continuous improvement',
    experience: '5+ years in agile coaching',
    expertise: JSON.stringify([
      'Sprint planning',
      'Team facilitation',
      'Impediment removal',
      'Agile coaching',
      'Retrospectives'
    ]),
    communication: 'Facilitative and supportive, focused on team empowerment',
    principles: JSON.stringify([
      'Serve the team, not manage them',
      'Remove impediments quickly',
      'Continuous improvement through retrospectives',
      'Transparency and trust',
      'Sustainable pace over heroics'
    ]),
    workflows: JSON.stringify(['sprint-planning', 'daily-standup', 'retrospective', 'sprint-review']),
    isBuiltIn: true
  }
]

// ==================== Workflows ====================
const workflows = [
  // Quick Flow (Phase 4 - 快速实施)
  {
    code: 'quick-spec',
    name: 'Quick Spec',
    description: 'Rapid codebase analysis and technical specification generation for small features or bug fixes',
    phase: 4,
    agentCode: 'dev',
    category: 'quick-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Analyze codebase', description: 'Scan relevant files and understand context' },
      { order: 2, name: 'Identify changes', description: 'Determine what needs to be modified' },
      { order: 3, name: 'Generate spec', description: 'Create technical specification document' }
    ]),
    inputs: JSON.stringify(['task_description', 'relevant_files']),
    outputs: JSON.stringify(['tech_spec']),
    prerequisites: null,
    isBuiltIn: true
  },
  {
    code: 'dev-story',
    name: 'Dev Story',
    description: 'Execute development story with code implementation and tests',
    phase: 4,
    agentCode: 'dev',
    category: 'quick-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Review story', description: 'Understand requirements and acceptance criteria' },
      { order: 2, name: 'Implement code', description: 'Write the implementation' },
      { order: 3, name: 'Write tests', description: 'Create unit and integration tests' },
      { order: 4, name: 'Run tests', description: 'Execute all tests and ensure passing' },
      { order: 5, name: 'Document', description: 'Update relevant documentation' }
    ]),
    inputs: JSON.stringify(['story_spec', 'tech_spec']),
    outputs: JSON.stringify(['implementation', 'tests', 'documentation']),
    prerequisites: JSON.stringify(['quick-spec']),
    isBuiltIn: true
  },
  {
    code: 'code-review',
    name: 'Code Review',
    description: 'Comprehensive multi-faceted code quality review',
    phase: 4,
    agentCode: 'dev',
    category: 'quick-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Review changes', description: 'Examine all modified files' },
      { order: 2, name: 'Check standards', description: 'Verify coding standards compliance' },
      { order: 3, name: 'Security review', description: 'Check for security vulnerabilities' },
      { order: 4, name: 'Performance review', description: 'Identify performance concerns' },
      { order: 5, name: 'Generate report', description: 'Create review summary with feedback' }
    ]),
    inputs: JSON.stringify(['implementation', 'tests']),
    outputs: JSON.stringify(['review_report', 'approval_status']),
    prerequisites: JSON.stringify(['dev-story']),
    isBuiltIn: true
  },

  // Phase 1 - Analysis
  {
    code: 'brainstorm',
    name: 'Brainstorm',
    description: 'Collaborative ideation session for exploring solutions and approaches',
    phase: 1,
    agentCode: 'pm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Define problem', description: 'Clearly state the problem to solve' },
      { order: 2, name: 'Generate ideas', description: 'Free-form idea generation' },
      { order: 3, name: 'Categorize', description: 'Group related ideas together' },
      { order: 4, name: 'Evaluate', description: 'Assess feasibility and impact' }
    ]),
    inputs: JSON.stringify(['problem_statement']),
    outputs: JSON.stringify(['ideas_list', 'evaluation_matrix']),
    prerequisites: null,
    isBuiltIn: true
  },
  {
    code: 'research',
    name: 'Research',
    description: 'Market and technical research for informed decision making',
    phase: 1,
    agentCode: 'pm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Define scope', description: 'Determine research questions' },
      { order: 2, name: 'Gather data', description: 'Collect relevant information' },
      { order: 3, name: 'Analyze findings', description: 'Process and interpret data' },
      { order: 4, name: 'Summarize', description: 'Create research summary' }
    ]),
    inputs: JSON.stringify(['research_questions']),
    outputs: JSON.stringify(['research_report']),
    prerequisites: null,
    isBuiltIn: true
  },

  // Phase 2 - Planning
  {
    code: 'product-brief',
    name: 'Product Brief',
    description: 'Create product brief defining problem and MVP scope',
    phase: 2,
    agentCode: 'pm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Define problem', description: 'Articulate the core problem' },
      { order: 2, name: 'Identify users', description: 'Define target users and personas' },
      { order: 3, name: 'Define MVP', description: 'Scope minimum viable product' },
      { order: 4, name: 'Success metrics', description: 'Define how success will be measured' }
    ]),
    inputs: JSON.stringify(['ideas_list', 'research_report']),
    outputs: JSON.stringify(['product_brief']),
    prerequisites: JSON.stringify(['brainstorm']),
    isBuiltIn: true
  },
  {
    code: 'create-prd',
    name: 'Create PRD',
    description: 'Comprehensive product requirements document creation',
    phase: 2,
    agentCode: 'pm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Overview', description: 'Write product overview and goals' },
      { order: 2, name: 'User stories', description: 'Define user stories and journeys' },
      { order: 3, name: 'Requirements', description: 'Detail functional requirements' },
      { order: 4, name: 'Non-functional', description: 'Specify non-functional requirements' },
      { order: 5, name: 'Constraints', description: 'Document constraints and assumptions' }
    ]),
    inputs: JSON.stringify(['product_brief']),
    outputs: JSON.stringify(['prd_document']),
    prerequisites: JSON.stringify(['product-brief']),
    isBuiltIn: true
  },

  // Phase 3 - Solutioning
  {
    code: 'create-architecture',
    name: 'Create Architecture',
    description: 'Technical architecture design and documentation',
    phase: 3,
    agentCode: 'architect',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Review PRD', description: 'Understand requirements thoroughly' },
      { order: 2, name: 'System design', description: 'Design overall system architecture' },
      { order: 3, name: 'Tech stack', description: 'Select technologies and frameworks' },
      { order: 4, name: 'Data model', description: 'Design data models and storage' },
      { order: 5, name: 'API design', description: 'Define API contracts' },
      { order: 6, name: 'Document', description: 'Create architecture documentation' }
    ]),
    inputs: JSON.stringify(['prd_document']),
    outputs: JSON.stringify(['architecture_doc', 'api_spec', 'data_model']),
    prerequisites: JSON.stringify(['create-prd']),
    isBuiltIn: true
  },
  {
    code: 'create-epics',
    name: 'Create Epics & Stories',
    description: 'Break down PRD into epics and user stories',
    phase: 3,
    agentCode: 'pm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Identify epics', description: 'Group features into epics' },
      { order: 2, name: 'Create stories', description: 'Break epics into user stories' },
      { order: 3, name: 'Acceptance criteria', description: 'Define acceptance criteria for each story' },
      { order: 4, name: 'Estimate', description: 'Add story point estimates' },
      { order: 5, name: 'Prioritize', description: 'Order by priority and dependencies' }
    ]),
    inputs: JSON.stringify(['prd_document', 'architecture_doc']),
    outputs: JSON.stringify(['epics_list', 'stories_backlog']),
    prerequisites: JSON.stringify(['create-architecture']),
    isBuiltIn: true
  },

  // Phase 4 - Implementation (Full Flow)
  {
    code: 'sprint-planning',
    name: 'Sprint Planning',
    description: 'Plan sprint scope and assign stories to team members',
    phase: 4,
    agentCode: 'sm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'Review backlog', description: 'Review prioritized backlog' },
      { order: 2, name: 'Set capacity', description: 'Determine team capacity' },
      { order: 3, name: 'Select stories', description: 'Choose stories for sprint' },
      { order: 4, name: 'Task breakdown', description: 'Break stories into tasks' },
      { order: 5, name: 'Assign', description: 'Assign tasks to team members' }
    ]),
    inputs: JSON.stringify(['stories_backlog', 'team_capacity']),
    outputs: JSON.stringify(['sprint_backlog', 'assignments']),
    prerequisites: JSON.stringify(['create-epics']),
    isBuiltIn: true
  },
  {
    code: 'retrospective',
    name: 'Retrospective',
    description: 'Sprint retrospective for continuous improvement',
    phase: 4,
    agentCode: 'sm',
    category: 'full-flow',
    steps: JSON.stringify([
      { order: 1, name: 'What went well', description: 'Identify successes' },
      { order: 2, name: 'What to improve', description: 'Identify improvement areas' },
      { order: 3, name: 'Action items', description: 'Define concrete action items' },
      { order: 4, name: 'Assign owners', description: 'Assign action item owners' }
    ]),
    inputs: JSON.stringify(['sprint_summary']),
    outputs: JSON.stringify(['retro_notes', 'action_items']),
    prerequisites: null,
    isBuiltIn: true
  }
]

// ==================== Teams ====================
const teams = [
  {
    name: 'Solo Developer',
    description: 'Single developer for quick tasks, bug fixes, and small features',
    mode: 'sequential',
    defaultWorkflows: JSON.stringify(['quick-spec', 'dev-story', 'code-review']),
    isBuiltIn: true
  },
  {
    name: 'Full Product Team',
    description: 'Complete product team for building features from concept to delivery',
    mode: 'collaborative',
    defaultWorkflows: JSON.stringify([
      'brainstorm',
      'product-brief',
      'create-prd',
      'create-architecture',
      'create-epics',
      'sprint-planning'
    ]),
    isBuiltIn: true
  },
  {
    name: 'Backend Squad',
    description: 'Backend-focused team for API and infrastructure work',
    mode: 'collaborative',
    defaultWorkflows: JSON.stringify(['create-architecture', 'dev-story', 'code-review']),
    isBuiltIn: true
  },
  {
    name: 'Frontend Squad',
    description: 'Frontend-focused team for UI/UX implementation',
    mode: 'collaborative',
    defaultWorkflows: JSON.stringify(['create-wireframes', 'dev-story', 'code-review']),
    isBuiltIn: true
  }
]

async function main() {
  console.log('🚀 Seeding BMAD data...\n')

  // Seed Agent Templates
  console.log('📋 Seeding Agent Templates...')
  for (const template of agentTemplates) {
    await prisma.agentTemplate.upsert({
      where: { code: template.code },
      update: template,
      create: template
    })
    console.log(`   ✓ ${template.icon} ${template.name} (${template.code})`)
  }
  console.log(`   ✅ Added ${agentTemplates.length} agent templates\n`)

  // Seed Workflows
  console.log('🔄 Seeding Workflows...')
  for (const workflow of workflows) {
    await prisma.workflow.upsert({
      where: { code: workflow.code },
      update: workflow,
      create: workflow
    })
    console.log(`   ✓ ${workflow.name} (${workflow.code}) - Phase ${workflow.phase}`)
  }
  console.log(`   ✅ Added ${workflows.length} workflows\n`)

  // Seed Teams
  console.log('👥 Seeding Teams...')
  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.name }, // Will fail on first run, that's ok
      update: team,
      create: team
    })
    console.log(`   ✓ ${team.name} (${team.mode})`)
  }
  console.log(`   ✅ Added ${teams.length} teams\n`)

  console.log('🎉 BMAD seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
