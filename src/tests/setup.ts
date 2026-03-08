import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// graphology-layout-forceatlas2/worker uses Web Workers + URL.createObjectURL
// which jsdom doesn't support. Mock the worker module globally.
vi.mock("graphology-layout-forceatlas2/worker", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      kill: vi.fn(),
    })),
  };
});

// Sigma.js requires WebGL2RenderingContext which jsdom doesn't provide.
// Mock the sigma module so components that import it can load in tests.
// Real WebGL rendering is tested via Playwright E2E.
vi.mock("sigma", () => {
  const mockCamera = {
    animatedZoom: vi.fn(),
    animatedUnzoom: vi.fn(),
    animatedReset: vi.fn(),
  };
  const MockSigma = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    refresh: vi.fn(),
    kill: vi.fn(),
    getCamera: vi.fn().mockReturnValue(mockCamera),
    getGraph: vi.fn(),
  }));
  return { default: MockSigma };
});

// d3-zoom calls SVGSVGElement.width.baseVal.value and height.baseVal.value
// inside its defaultExtent() function when a zoom gesture fires. jsdom does
// not implement SVGAnimatedLength on SVG elements, so we stub those properties
// to return zero-value objects.  This prevents the unhandled TypeError that
// d3-zoom throws via the d3-timer flush path during DataView tests.
function makeSVGAnimatedLength(value = 0) {
  return { baseVal: { value, valueInSpecifiedUnits: value, unitType: 1 } };
}

if (typeof SVGSVGElement !== "undefined") {
  Object.defineProperty(SVGSVGElement.prototype, "width", {
    get() {
      return makeSVGAnimatedLength(
        this.getAttribute("width") ? Number(this.getAttribute("width")) : 0,
      );
    },
    configurable: true,
  });
  Object.defineProperty(SVGSVGElement.prototype, "height", {
    get() {
      return makeSVGAnimatedLength(
        this.getAttribute("height") ? Number(this.getAttribute("height")) : 0,
      );
    },
    configurable: true,
  });
}
