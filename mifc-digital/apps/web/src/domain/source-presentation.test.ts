import { describe, expect, it } from "vitest";
import { getSourcePresentation } from "./source-presentation";

describe("getSourcePresentation", () => {
  it("mantém somente INPUT editável", () => {
    expect(getSourcePresentation("INPUT").editable).toBe(true);
    expect(getSourcePresentation("CALCULATED").editable).toBe(false);
    expect(getSourcePresentation("ORACLE_MES").editable).toBe(false);
  });

  it("deixa clara a origem MES", () => {
    expect(getSourcePresentation("ORACLE_MES").label).toBe("MES");
    expect(getSourcePresentation("ORACLE_MES").description).toContain("Oracle MES");
  });
});
