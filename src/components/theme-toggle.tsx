import { Moon, Sun } from "lucide-react";

import { TOP_BUTTON_CLASS } from "@/components/top-button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";
  // The icon always shows the mode this press will switch to.
  const Icon = isDark ? Sun : Moon;
  const label = `Switch to ${next} mode`;

  return (
    <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setTheme(next)}
        className={`${TOP_BUTTON_CLASS} text-foreground hover:border-primary/60 hover:text-primary active:scale-95`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
