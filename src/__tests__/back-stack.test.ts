/**
 * back-stack: the system back button closes the top-most layer, UI closes drop
 * their history entry without closing anything else.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pushLayer, removeLayer, isTopLayer, LAYER_RANK, _layerCount, _resetBackStack } from '@/lib/back-stack';

const settle = () => new Promise(r => setTimeout(r, 30));
const back = async () => { window.history.back(); await settle(); };

describe('back-stack', () => {
  beforeEach(async () => {
    _resetBackStack();
    window.history.replaceState(null, '');
    await settle();
  });

  it('back closes the top layer only, then the next one', async () => {
    const tool = vi.fn(), sheet = vi.fn();
    pushLayer(tool, LAYER_RANK.tool);
    pushLayer(sheet);
    await back();
    expect(sheet).toHaveBeenCalledTimes(1);
    expect(tool).not.toHaveBeenCalled();
    await back();
    expect(tool).toHaveBeenCalledTimes(1);
    expect(_layerCount()).toBe(0);
  });

  it('closing in the UI drops the history entry without closing the layer below', async () => {
    const tool = vi.fn(), sheet = vi.fn();
    pushLayer(tool, LAYER_RANK.tool);
    const len = window.history.length;
    const s = pushLayer(sheet);
    expect(window.history.length).toBe(len + 1);
    removeLayer(s);
    await settle();
    expect(sheet).not.toHaveBeenCalled();
    expect(tool).not.toHaveBeenCalled();
    expect(_layerCount()).toBe(1);
    await back();
    expect(tool).toHaveBeenCalledTimes(1);
  });

  it('two layers closed in the same tick cost one traversal and close nothing', async () => {
    const a = vi.fn(), b = vi.fn(), base = vi.fn();
    pushLayer(base, LAYER_RANK.tab);
    const x = pushLayer(a, LAYER_RANK.tool);
    const y = pushLayer(b);
    removeLayer(y);
    removeLayer(x);
    await settle();
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(base).not.toHaveBeenCalled();
    await back();
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('a layer opened while a UI close is in flight is not popped by it', async () => {
    const tool = vi.fn(), next = vi.fn();
    const t = pushLayer(tool, LAYER_RANK.tool);
    removeLayer(t);
    pushLayer(next, LAYER_RANK.tool); // e.g. a sheet closes and opens another tool
    await settle();
    expect(next).not.toHaveBeenCalled();
    expect(_layerCount()).toBe(1);
    await back();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ranks decide the order, not registration order (reload restores tab + tool together)', async () => {
    const tab = vi.fn(), tool = vi.fn();
    const toolId = pushLayer(tool, LAYER_RANK.tool);
    pushLayer(tab, LAYER_RANK.tab);
    expect(isTopLayer(toolId)).toBe(true);
    await back();
    expect(tool).toHaveBeenCalledTimes(1);
    expect(tab).not.toHaveBeenCalled();
  });

  it('removing an already-popped layer is a no-op', async () => {
    const tool = vi.fn();
    const id = pushLayer(tool, LAYER_RANK.tool);
    await back();
    const len = window.history.length;
    removeLayer(id);
    await settle();
    expect(window.history.length).toBe(len);
    expect(_layerCount()).toBe(0);
  });
});
