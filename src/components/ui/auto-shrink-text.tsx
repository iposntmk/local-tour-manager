import * as React from "react";
import { cn } from "@/lib/utils";

interface AutoShrinkTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  minFontSizePx?: number;
  step?: number;
}

export function AutoShrinkText({
  className,
  minFontSizePx = 8,
  step = 0.5,
  style,
  children,
  ...props
}: AutoShrinkTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.removeProperty("font-size");
      let fontSize = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.offsetWidth && fontSize > minFontSizePx) {
        fontSize -= step;
        el.style.fontSize = `${fontSize}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, minFontSizePx, step]);

  return (
    <span
      ref={ref}
      className={cn("whitespace-nowrap", className)}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}
