import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Index } from "@/routes/index";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function mockAudio() {
  const stop = vi.fn();
  const raw = vi.fn((buffer: Float32Array) => {
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.sin(2 * Math.PI * 82.4 * i / 44100) * 0.2;
  });
  const bins = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  const gain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn() });
  vi.stubGlobal("AudioContext", class {
    currentTime = 0; sampleRate = 44100; destination = {};
    createAnalyser = () => ({ fftSize: 2048, getFloatTimeDomainData: raw, getFloatFrequencyData: bins });
    createMediaStreamSource = () => ({ connect: vi.fn() });
    createGain = gain;
    createOscillator = () => ({ frequency: { value: 0 }, connect: () => ({ connect: vi.fn() }), start: vi.fn(), stop: vi.fn() });
    close = vi.fn();
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return { stop, raw, bins, stream };
}

it("reads raw time-domain audio rather than FFT bins", async () => {
  const { raw, bins } = mockAudio();
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "Start Microphone" }));
  await waitFor(() => expect(raw).toHaveBeenCalled());
  expect(bins).not.toHaveBeenCalled();
});

it("does not automatically select reference buttons during microphone detection", async () => {
  const { raw } = mockAudio();
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "Start Microphone" }));
  await waitFor(() => expect(raw).toHaveBeenCalled());
  for (const button of screen.getAllByRole("button", { name: /^Play string/ })) expect(button).toHaveAttribute("aria-pressed", "false");
});

it("stops microphone capture when a reference note is played", async () => {
  const { raw, stop } = mockAudio();
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "Start Microphone" }));
  await waitFor(() => expect(raw).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Play string 6: E" }));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Start Microphone" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Play string 6: E" })).toHaveAttribute("aria-pressed", "true");
});

it("discards a pending microphone request after a reference note is played", async () => {
  const { stop, stream, raw } = mockAudio();
  let resolve: (() => void) | undefined;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(() => new Promise((done) => { resolve = () => done(stream as unknown as MediaStream); }));
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "Start Microphone" }));
  fireEvent.click(screen.getByRole("button", { name: "Play string 5: A" }));
  resolve?.();
  await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  expect(raw).not.toHaveBeenCalled();
});