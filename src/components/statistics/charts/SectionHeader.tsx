interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader = ({ title, description, action }: SectionHeaderProps) => (
  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h3 className="text-base font-semibold tracking-tight md:text-lg">{title}</h3>
      {description && <p className="text-xs text-muted-foreground md:text-sm">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
