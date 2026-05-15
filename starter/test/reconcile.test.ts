import { describe, it, expect } from "vitest";
import { buildReconcileReport } from "@/lib/reconcile";
import type { Asset, FacilitiesRecord, FinanceRecord } from "@/lib/types";

function makeAsset(overrides: Partial<Asset>): Asset {
  return {
    asset_tag: "C0000001",
    serial: "SN-001",
    model: "Model X",
    manufacturer: "Acme",
    asset_class: "instrument",
    state: "in_service",
    location: { site: "SEA-1", room: "Lab-1", row: "R01", rack: "Rack-A", ru: "4" },
    custodian: "tech-jane",
    parent_asset_tag: null,
    procurement_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeFacility(overrides: Partial<FacilitiesRecord>): FacilitiesRecord {
  return {
    space_id: "fac-001",
    tagged_id: "C0000001",
    rack_location: "SEA-1/Lab-1/R01/Rack-A/4",
    last_observed: new Date().toISOString(),
    ...overrides,
  };
}

function makeFinance(overrides: Partial<FinanceRecord>): FinanceRecord {
  return {
    finance_id: "EQ-001",
    tag: "C0000001",
    site: "SEA-1",
    book_value_usd: 50000,
    status: "capitalized",
    capitalized_on: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildReconcileReport", () => {
  it("returns empty items when all systems agree", () => {
    const asset = makeAsset({});
    const fac = makeFacility({ rack_location: "SEA-1/Lab-1/R01/Rack-A/4" });
    const fin = makeFinance({ status: "capitalized" });
    const report = buildReconcileReport([asset], [fac], [fin]);
    expect(report.items).toHaveLength(0);
  });

  it("flags missing facilities record for in_service asset", () => {
    const asset = makeAsset({ state: "in_service" });
    const fin = makeFinance({ status: "capitalized" });
    const report = buildReconcileReport([asset], [], [fin]);
    expect(report.items).toHaveLength(1);
    expect(report.items[0].category).toBe("missing_facilities");
  });

  it("flags orphan facilities record", () => {
    const fac = makeFacility({ tagged_id: "C9999999" });
    const report = buildReconcileReport([], [fac], []);
    expect(report.items).toHaveLength(1);
    expect(report.items[0].category).toBe("orphan_facilities");
  });

  it("flags orphan finance record", () => {
    const fin = makeFinance({ tag: "C9999999" });
    const report = buildReconcileReport([], [], [fin]);
    expect(report.items).toHaveLength(1);
    expect(report.items[0].category).toBe("orphan_finance");
  });

  it("flags disposed asset still capitalized in finance", () => {
    const asset = makeAsset({ state: "disposed" });
    const fin = makeFinance({ tag: "C0000001", status: "capitalized" });
    const report = buildReconcileReport([asset], [], [fin]);
    const mismatch = report.items.find((i) => i.category === "finance_status_mismatch");
    expect(mismatch).toBeDefined();
  });

  it("does not flag stored asset with capitalized finance (normal state)", () => {
    const asset = makeAsset({ state: "stored" });
    const fin = makeFinance({ tag: "C0000001", status: "capitalized" });
    const report = buildReconcileReport([asset], [], [fin]);
    expect(report.items).toHaveLength(0);
  });

  it("includes correct counts", () => {
    const asset1 = makeAsset({ asset_tag: "C0000001", state: "in_service" });
    const asset2 = makeAsset({ asset_tag: "C0000002", state: "in_service" });
    const fac1 = makeFacility({ tagged_id: "C0000001" });
    const report = buildReconcileReport([asset1, asset2], [fac1], []);
    expect(report.counts.missing_facilities).toBe(1);
    expect(report.total_assets).toBe(2);
  });
});
