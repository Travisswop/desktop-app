import { pauseVideoWhenOutsideViewport } from "@/components/feed/view/VisibilityPausedVideo";

describe("pauseVideoWhenOutsideViewport", () => {
  it("pauses a playing video once it leaves the viewport", () => {
    const pause = jest.fn();

    pauseVideoWhenOutsideViewport(
      { paused: false, pause },
      { isIntersecting: false },
    );

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("does not pause a visible playing video", () => {
    const pause = jest.fn();

    pauseVideoWhenOutsideViewport(
      { paused: false, pause },
      { isIntersecting: true },
    );

    expect(pause).not.toHaveBeenCalled();
  });

  it("does not pause a video that is already paused", () => {
    const pause = jest.fn();

    pauseVideoWhenOutsideViewport(
      { paused: true, pause },
      { isIntersecting: false },
    );

    expect(pause).not.toHaveBeenCalled();
  });
});
