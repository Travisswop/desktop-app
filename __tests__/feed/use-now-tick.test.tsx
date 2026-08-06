/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { useNowTick } from "@/components/feed/useNowTick";

function TickProbe() {
  const now = useNowTick();
  return <span data-testid="now">{now}</span>;
}

describe("useNowTick", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("re-renders subscribers on each 30s tick", () => {
    render(<TickProbe />);
    const first = Number(screen.getByTestId("now").textContent);

    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    const second = Number(screen.getByTestId("now").textContent);
    expect(second).toBeGreaterThan(first);
  });

  it("shares one interval across subscribers and stops when all unmount", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const { unmount: unmountA } = render(<TickProbe />);
    const { unmount: unmountB } = render(<TickProbe />);

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    unmountA();
    unmountB();
    expect(jest.getTimerCount()).toBe(0);
  });
});
