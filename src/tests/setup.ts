import "@testing-library/jest-dom/vitest";

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
