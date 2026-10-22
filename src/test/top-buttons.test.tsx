import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DonateLink } from "@/components/donate-link";
import { TOP_BUTTON_CLASS } from "@/components/top-button";
import { ThemeToggle } from "@/components/theme-toggle";

describe("top corner controls", () => {
  it("gives the donate and theme buttons the same size and rounded-rectangle shape", () => {
    render(
      <>
        <DonateLink />
        <ThemeToggle />
      </>,
    );

    const donate = screen.getByRole("link", { name: /donate/i });
    const theme = screen.getByRole("button", { name: /switch to (light|dark) mode/i });

    // One shared box: same height, same width, same corner radius.
    expect(donate.className).toContain(TOP_BUTTON_CLASS);
    expect(theme.className).toContain(TOP_BUTTON_CLASS);
    expect(TOP_BUTTON_CLASS).toContain("h-12");
    expect(TOP_BUTTON_CLASS).toContain("w-32");
    expect(TOP_BUTTON_CLASS).toContain("rounded-2xl");

    // Neither may drift back to a circle or pill.
    expect(donate.className).not.toContain("rounded-full");
    expect(theme.className).not.toContain("rounded-full");
  });
});
