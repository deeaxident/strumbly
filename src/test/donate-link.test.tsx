import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DonateLink } from "@/components/donate-link";

describe("DonateLink", () => {
  it("points the heart button at the Stripe donation page in a new tab", () => {
    render(<DonateLink />);

    const link = screen.getByRole("link", { name: /donate/i });

    expect(link).toHaveAttribute(
      "href",
      "https://buy.stripe.com/8x23co3ps4WscTjdD05ZC00",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});
