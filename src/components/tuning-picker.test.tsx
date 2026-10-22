import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TuningPicker } from "./tuning-picker";

afterEach(cleanup);

function setup() {
  const standard = { id: "standard", name: "Standard", free: true, notes: [40, 45, 50, 55, 59, 64] };
  const dropD = { id: "dropd", name: "Drop D", free: true, notes: [38, 45, 50, 55, 59, 64] };
  const onChoose = vi.fn();
  render(<><TuningPicker tuning={standard} tunings={[standard, dropD]} examples={{}} onChoose={onChoose} /><button type="button">Outside</button></>);
  fireEvent.click(screen.getByRole("button", { name: /Tuning Standard/ }));
  return { dropD, onChoose };
}

it("allows selection after Safari-style blur with a null relatedTarget", () => {
  const { dropD, onChoose } = setup();
  fireEvent.blur(screen.getByRole("menuitemradio", { name: /Standard/ }), { relatedTarget: null });
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Drop D/ }));
  expect(onChoose).toHaveBeenCalledExactlyOnceWith(dropD);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("closes when keyboard focus moves outside the picker", () => {
  setup();
  screen.getByRole("button", { name: "Outside" }).focus();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("closes on an outside pointer interaction", () => {
  setup();
  fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("preserves arrow navigation and Escape dismissal", () => {
  setup();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
  expect(screen.getByRole("menuitemradio", { name: /Drop D/ })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Tuning Standard/ })).toHaveFocus();
});