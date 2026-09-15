import { describe, expect, it } from 'vitest';
import {
  isUsingFallbackRender,
  resolveDisplayRenderState,
} from '../playground-display-state';

describe('playground display state helpers', () => {
  it('keeps current render state when available', () => {
    const current = {
      doc: {} as never,
      resolvedData: {} as never,
      svgContent: '<svg />',
    };
    const fallback = {
      doc: null,
      resolvedData: null,
      svgContent: '',
    };

    expect(
      resolveDisplayRenderState({
        current,
        fallback,
      })
    ).toBe(current);
  });

  it('falls back to the last successful render when current compile state is empty', () => {
    const fallback = {
      doc: {} as never,
      resolvedData: {} as never,
      svgContent: '<svg>last-good</svg>',
    };

    expect(
      resolveDisplayRenderState({
        current: {
          doc: null,
          resolvedData: null,
          svgContent: '',
        },
        fallback,
      })
    ).toBe(fallback);
  });

  it('falls back when a partial response has data but no SVG preview', () => {
    const fallback = {
      doc: {} as never,
      resolvedData: {} as never,
      svgContent: '<svg>last-good</svg>',
    };

    expect(
      resolveDisplayRenderState({
        current: {
          doc: {} as never,
          resolvedData: {} as never,
          svgContent: '',
        },
        fallback,
      })
    ).toBe(fallback);

    expect(
      isUsingFallbackRender({
        current: {
          doc: {} as never,
          resolvedData: {} as never,
          svgContent: '',
        },
        fallback,
      })
    ).toBe(true);
  });

  it('detects when fallback render is being used', () => {
    expect(
      isUsingFallbackRender({
        current: {
          doc: null,
          resolvedData: null,
          svgContent: '',
        },
        fallback: {
          doc: {} as never,
          resolvedData: {} as never,
          svgContent: '<svg>last-good</svg>',
        },
      })
    ).toBe(true);
  });
});
