import { describe, expect, it } from "vitest";
import { PRESSABLE, clickSoundFor, type ElementLike } from "@/lib/audio/click-sound";

/** A tiny element tree that understands the simple selectors the resolver uses: tag, [attr], [attr="value"], tag[attr]. */
class El implements ElementLike {
  constructor(readonly tag: string, readonly attrs: Record<string, string> = {}, readonly parent: El | null = null) {}
  child(tag: string, attrs: Record<string, string> = {}) { return new El(tag, attrs, this); }
  getAttribute(name: string) { return name in this.attrs ? this.attrs[name] : null; }
  hasAttribute(name: string) { return name in this.attrs; }
  private matchesOne(selector: string): boolean {
    const match = selector.trim().match(/^([a-z]*)((?:\[[^\]]+\])*)$/);
    if (!match) throw new Error(`unsupported selector ${selector}`);
    if (match[1] && match[1] !== this.tag) return false;
    for (const [, name, value] of match[2].matchAll(/\[([a-z-]+)(?:="([^"]*)")?\]/g)) {
      if (!this.hasAttribute(name)) return false;
      if (value !== undefined && this.getAttribute(name) !== value) return false;
    }
    return true;
  }
  closest(selector: string): El | null {
    const parts = selector.split(",");
    if (parts.some((p) => this.matchesOne(p))) return this;
    return this.parent ? this.parent.closest(selector) : null;
  }
}

const page = () => new El("main");

describe("generic click sound", () => {
  it("plays a click for buttons, links, menu items and selects, including clicks on an icon inside them", () => {
    const root = page();
    expect(clickSoundFor(root.child("button"))).toBe("ui.click");
    expect(clickSoundFor(root.child("button").child("svg").child("path"))).toBe("ui.click");
    expect(clickSoundFor(root.child("a", { href: "/x" }))).toBe("ui.click");
    expect(clickSoundFor(root.child("div", { role: "menuitem" }))).toBe("ui.click");
    expect(clickSoundFor(root.child("select"))).toBe("ui.click");
    expect(clickSoundFor(root.child("summary"))).toBe("ui.click");
  });
  it("plays the toggle sound for switches", () => {
    expect(clickSoundFor(page().child("button", { role: "switch" }).child("span"))).toBe("ui.toggle");
  });
  it("makes no sound for text, inputs, plain containers, links without href, or disabled controls", () => {
    const root = page();
    expect(clickSoundFor(root.child("p"))).toBeNull();
    expect(clickSoundFor(root.child("input", { type: "text" }))).toBeNull();
    expect(clickSoundFor(root.child("textarea"))).toBeNull();
    expect(clickSoundFor(root.child("a"))).toBeNull();
    expect(clickSoundFor(root.child("button", { disabled: "" }))).toBeNull();
    expect(clickSoundFor(root.child("div", { role: "button", "aria-disabled": "true" }))).toBeNull();
    expect(clickSoundFor(null)).toBeNull();
  });
  it("honours data-sound on the control or an ancestor, and data-sound=none silences", () => {
    const root = page();
    expect(clickSoundFor(root.child("button", { "data-sound": "ui.open" }).child("svg"))).toBe("ui.open");
    expect(clickSoundFor(root.child("button", { "data-sound": "none" }))).toBeNull();
    expect(clickSoundFor(root.child("section", { "data-sound": "none" }).child("button"))).toBeNull();
    expect(clickSoundFor(root.child("button", { role: "switch", "data-sound": "ui.close" }))).toBe("ui.close");
  });
  it("ignores unknown or ambient data-sound values and falls back to the normal sound", () => {
    expect(clickSoundFor(page().child("button", { "data-sound": "ui.explode" }))).toBe("ui.click");
    expect(clickSoundFor(page().child("button", { "data-sound": "ambience.bed" }))).toBe("ui.click");
  });
  it("covers the controls the app uses", () => {
    expect(PRESSABLE).toContain('[role="switch"]');
    expect(PRESSABLE).toContain('[role="menuitem"]');
    expect(PRESSABLE).not.toContain("input[type=\"text\"]");
  });
});
