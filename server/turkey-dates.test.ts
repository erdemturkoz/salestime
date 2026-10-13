import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateInputTurkish,
  getDefaultIstanbulDateRange,
  istanbulDateInputsToUtcRange,
} from "../shared/turkey-dates";

test("default range follows the Istanbul calendar and starts on day one", () => {
  assert.deepEqual(
    getDefaultIstanbulDateRange(new Date("2026-10-13T00:00:00.000Z")),
    { start: "2026-10-01", end: "2026-10-13" },
  );
  assert.deepEqual(
    getDefaultIstanbulDateRange(new Date("2027-01-01T00:00:00.000Z")),
    { start: "2027-01-01", end: "2027-01-01" },
  );
  assert.deepEqual(
    getDefaultIstanbulDateRange(new Date("2026-12-31T21:00:00.000Z")),
    { start: "2027-01-01", end: "2027-01-01" },
  );
});

test("converts Istanbul calendar boundaries to a start-inclusive/end-exclusive UTC range", () => {
  const range = istanbulDateInputsToUtcRange("2026-10-01", "2026-10-13");
  assert.equal(range.start?.toISOString(), "2026-09-30T21:00:00.000Z");
  assert.equal(range.endExclusive?.toISOString(), "2026-10-13T21:00:00.000Z");

  const yearChange = istanbulDateInputsToUtcRange("2026-12-31", "2027-01-01");
  assert.equal(yearChange.start?.toISOString(), "2026-12-30T21:00:00.000Z");
  assert.equal(yearChange.endExclusive?.toISOString(), "2027-01-01T21:00:00.000Z");

  const startMs = range.start!.getTime();
  const endMs = range.endExclusive!.getTime();
  const boundaryRecords = [startMs - 1, startMs, endMs - 1, endMs];
  assert.deepEqual(
    boundaryRecords.filter((at) => at >= startMs && at < endMs),
    [startMs, endMs - 1],
  );
});

test("rejects impossible dates and formats visible input values for Turkish users", () => {
  assert.throws(() => istanbulDateInputsToUtcRange("2026-02-30", "2026-03-01"));
  assert.equal(formatDateInputTurkish("2026-10-01"), "01.10.2026");
  assert.equal(formatDateInputTurkish(""), "Tarih seçilmedi");
});
