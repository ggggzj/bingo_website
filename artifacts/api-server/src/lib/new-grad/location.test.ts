/**
 * Reading a location string that nobody normalised.
 *
 * `BrowseQuery` carries no country (`../h1_checker/.harness/backlogs/011`, still open),
 * so all there is to read is whatever the provider wrote: `Irving Texas United States`,
 * `US-Remote`, `2 Locations`. Three states rather than two, which is what the owner's own
 * spreadsheet settled on when it met the same wall — its 在美国 column holds 是 / 否 / ?.
 *
 * The invariant that matters more than any single case: **a string this cannot read must
 * never come back `us`.** Listing a marked row costs the reader a glance. Listing a
 * London role as American costs them an application.
 */

import { describe, expect, it } from "vitest";

import { readLocation } from "./location";

describe("readLocation", () => {
  it("reads the US out of the shapes providers actually write", () => {
    for (const location of [
      "Irving Texas United States",
      "US-Remote",
      "San Jose / LA",
      "Malvern, PA",
      "Berkeley, CA",
      "New York, NY, United States",
      "Remote - United States",
      "Foster City, CA",
    ]) {
      expect(readLocation(location), location).toBe("us");
    }
  });

  it("reads a posting that is plainly somewhere else", () => {
    for (const location of [
      "London, UK",
      "Bengaluru",
      "Toronto, Canada",
      "Dublin, Ireland",
      "Singapore",
      "Tel Aviv, Israel",
      "Berlin, Germany",
    ]) {
      expect(readLocation(location), location).toBe("elsewhere");
    }
  });

  it("admits when it cannot tell", () => {
    for (const location of ["2 Locations", "", "   ", "Multiple Locations", "Remote"]) {
      expect(readLocation(location), JSON.stringify(location)).toBe("unknown");
    }
  });

  it("a null location is unknown, not US", () => {
    expect(readLocation(null)).toBe("unknown");
    expect(readLocation(undefined)).toBe("unknown");
  });

  it("never resolves an unreadable string to US", () => {
    // The invariant, stated as a test so a later widening of the US list cannot quietly
    // break it: anything that is not positively recognised is unknown or elsewhere.
    for (const location of ["Zzyzx Province", "Somewhere", "TBD", "—"]) {
      expect(readLocation(location), location).not.toBe("us");
    }
  });

  it("does not read a country out of a company or role name that contains one", () => {
    // `US` inside a word is not a country. This is the class of bug that put
    // Google Operations Center into a list as Google.
    expect(readLocation("Bus Station Road, Bengaluru")).toBe("elsewhere");
    expect(readLocation("Campus Drive, Dublin, Ireland")).toBe("elsewhere");
  });
});
