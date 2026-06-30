import type { IdeaLoopPhase } from '../../shared/types';

interface Props {
  phase: IdeaLoopPhase;
}

interface Step {
  id: string;
  label: string;
  phases: IdeaLoopPhase[];
}

const STEPS: Step[] = [
  {
    id: 'understanding',
    label: 'Understanding your idea',
    phases: ['intake', 'brief-ready'],
  },
  {
    id: 'reviewing',
    label: 'Reviewing with the team',
    phases: ['executive-review', 'decision-ready'],
  },
  {
    id: 'designing',
    label: 'Designing the architecture',
    phases: ['architecture'],
  },
];

type StepState = 'complete' | 'active' | 'pending';

function getStepState(step: Step, phase: IdeaLoopPhase): StepState {
  const allPhases: IdeaLoopPhase[] = [
    'intake',
    'brief-ready',
    'executive-review',
    'decision-ready',
    'architecture',
    'complete',
    'stopped',
  ];

  if (step.phases.includes(phase)) return 'active';

  const stepEnd = Math.max(...step.phases.map((p) => allPhases.indexOf(p)));
  const current = allPhases.indexOf(phase);

  if (current > stepEnd) return 'complete';
  return 'pending';
}

export function PipelineProgress({ phase }: Props) {
  if (phase === 'idle' || phase === 'error') return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {STEPS.map((step, i) => {
        const state = getStepState(step, phase);
        return (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors ${
                  state === 'complete' ? 'bg-accent' : 'bg-border-subtle'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  state === 'active'
                    ? 'bg-accent animate-pulse'
                    : state === 'complete'
                      ? 'bg-accent'
                      : 'bg-border'
                }`}
              />
              <span
                className={`text-[11px] transition-colors ${
                  state === 'active'
                    ? 'text-text-primary font-medium'
                    : state === 'complete'
                      ? 'text-accent'
                      : 'text-text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
