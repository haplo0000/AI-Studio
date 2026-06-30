import type { DecisionPackage } from '../../departments/shared/types';

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DocParagraph({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-text-muted italic">Not recorded.</p>;
  return <p className="text-sm text-text-secondary leading-relaxed">{text}</p>;
}

function DocList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-text-muted italic">None identified.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
          <span className="text-text-muted mt-0.5 shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const DECISION_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  'Build Now':        { label: 'Build Now',        color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: '✅' },
  'Prototype':        { label: 'Prototype',         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',       icon: '🔬' },
  'Research Further': { label: 'Research Further',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',     icon: '🔭' },
  'Delay':            { label: 'Delay',             color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20',     icon: '⏳' },
  'Reject':           { label: 'Reject',            color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',         icon: '⛔' },
};

export function DecisionPackageContent({ content }: { content: DecisionPackage }) {
  const decisionConfig = DECISION_CONFIG[content.decision] ?? {
    label: content.decision,
    color: 'text-text-primary',
    bg: 'bg-surface-overlay border-border-subtle',
    icon: '📌',
  };

  return (
    <div className="space-y-7">
      {/* Decision verdict */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${decisionConfig.bg}`}>
        <span className="text-3xl">{decisionConfig.icon}</span>
        <div>
          <p className={`text-xl font-bold ${decisionConfig.color}`}>{decisionConfig.label}</p>
          <p className="text-xs text-text-muted mt-0.5">{content.confidence}% board confidence</p>
        </div>
      </div>

      <DocSection title="Executive Recommendation">
        <DocParagraph text={content.recommendation} />
      </DocSection>

      <DocSection title="Reasoning">
        <DocParagraph text={content.reasoning} />
      </DocSection>

      {content.opportunityCost && (
        <DocSection title="Opportunity Cost">
          <DocParagraph text={content.opportunityCost} />
        </DocSection>
      )}

      {content.risks.length > 0 && (
        <DocSection title="Risks">
          <DocList items={content.risks} />
        </DocSection>
      )}

      {content.opportunities.length > 0 && (
        <DocSection title="Opportunities">
          <DocList items={content.opportunities} />
        </DocSection>
      )}

      {content.openQuestions.length > 0 && (
        <DocSection title="Open Questions">
          <DocList items={content.openQuestions} />
        </DocSection>
      )}
    </div>
  );
}
