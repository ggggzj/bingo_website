# new-grad-list Specification (delta)

## MODIFIED Requirements

### Requirement: A location that cannot be read is marked, never assumed

Each posting SHALL resolve to exactly one of: reads as US, cannot be read, plainly elsewhere.
A posting that reads as US SHALL be listed. One that cannot be read SHALL be listed **and
marked as unconfirmed**. One that is plainly elsewhere SHALL be absent.

A location string that cannot be read SHALL NOT resolve to US. A comma followed by two letters
SHALL count as US only when the location names no foreign place; a named US place (the country,
a state's full name, a known US city) SHALL still win over a foreign one.

#### Scenario: A location naming several places without saying where
- **WHEN** a posting's location is `2 Locations`
- **THEN** it is listed and marked as unconfirmed

#### Scenario: A posting abroad
- **WHEN** a posting's location is `London, UK`
- **THEN** it is not listed

#### Scenario: A posting abroad whose country code is also a state code
- **WHEN** a posting's location is `Toronto, ON, CA` or `Berlin, DE`
- **THEN** it is not listed
  (was: listed as US)

#### Scenario: Regression guard — a real US place beside a foreign one
- **WHEN** a posting's location is `New York, NY - Hybrid; Toronto, Ontario - Remote` or
  `US-CA-Dublin`
- **THEN** it is listed as US, as before
