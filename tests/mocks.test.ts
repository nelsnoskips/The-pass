import { describe, expect, it } from "vitest";
import { mocksFor, parseMocks } from "@/lib/studio/review";
import type { Project } from "@/lib/studio/types";

const project = (over: Partial<Project>): Project =>
  ({
    id: "p", client_id: "c", name: "Site", stage: "in_review",
    mock_path: null, mocks: [], live_url: null, status_token: null,
    monthly_fee: null, created_at: "", updated_at: "", ...over,
  }) as Project;

describe("parseMocks", () => {
  it("reads a label and a path off one line", () => {
    expect(parseMocks("Direction one /orravan-v1")).toEqual([
      { label: "Direction one", path: "/orravan-v1" },
    ]);
  });

  it("keeps the order the lines were typed in", () => {
    expect(
      parseMocks("One /orravan-v1\nTwo /orravan-v2\nThree /orravan-v3").map((m) => m.path),
    ).toEqual(["/orravan-v1", "/orravan-v2", "/orravan-v3"]);
  });

  it("lets a bare path stand as its own label", () => {
    expect(parseMocks("/orravan-v2")).toEqual([{ label: "/orravan-v2", path: "/orravan-v2" }]);
  });

  it("drops the dash people put between a label and a path", () => {
    expect(parseMocks("Every signal — /orravan-v2")[0].label).toBe("Every signal");
  });

  it("ignores blank lines and lines with no path", () => {
    expect(parseMocks("\n  \nno path here\nGood /a")).toEqual([
      { label: "Good", path: "/a" },
    ]);
  });
});

describe("mocksFor", () => {
  it("falls back to the single mock_path when no list is set", () => {
    expect(mocksFor(project({ mock_path: "/orravan-v3" }))).toEqual([
      { label: "The mock", path: "/orravan-v3" },
    ]);
  });

  it("prefers the list once one exists", () => {
    const p = project({ mock_path: "/old", mocks: [{ label: "One", path: "/orravan-v1" }] });
    expect(mocksFor(p)).toEqual([{ label: "One", path: "/orravan-v1" }]);
  });

  it("is empty when there is nothing to show, so the page can say so", () => {
    expect(mocksFor(project({}))).toEqual([]);
  });

  it("survives a row whose jsonb is not the shape we expect", () => {
    const p = project({ mocks: [{ label: "ok", path: "/a" }, { label: "x" }] as never });
    expect(mocksFor(p)).toEqual([{ label: "ok", path: "/a" }]);
  });
});
