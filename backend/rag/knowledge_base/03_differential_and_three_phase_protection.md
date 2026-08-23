# Differential and Three-Phase Fault Protection Guidelines

## Purpose
Covers transformer/bus/line differential protection (device 87) and the
handling of symmetrical three-phase faults (LLL, LLLG), which are the most
severe fault type in terms of fault current magnitude and system stability
impact.

## Applicable Fault Signatures
- Three-phase faults (LLL) show a near-equal, severe voltage collapse on all
  three phases (commonly below 20% of nominal at the fault point) and a
  symmetrical current rise on all phases with negligible negative- or
  zero-sequence content, since the fault itself is balanced.
- Three-phase-to-ground faults (LLLG) resemble LLL faults but also present a
  measurable zero-sequence component from the ground connection; current
  magnitudes are typically the highest of all fault types.
- A large, sudden differential current between the two sides of a protected
  zone (transformer, bus, or line segment) with currents in phase indicates
  an internal fault within the protected equipment rather than a
  through-fault, which differential protection is specifically designed to
  distinguish.

## Relay Settings
1. Percentage-restrained differential elements should use a minimum pickup
   of 20-30% of rated current with a slope of 25-40% to accommodate CT
   mismatch and transformer magnetizing inrush without misoperation.
2. Second-harmonic restraint (or blocking) should be applied to prevent
   tripping on transformer energization inrush current, which is rich in
   second-harmonic content and can otherwise resemble an internal fault.
3. Because three-phase faults produce the highest fault currents on the
   system, breaker interrupting ratings and instantaneous relay elements
   must be verified against the maximum three-phase fault MVA at each bus.

## Recommended Corrective Actions
- Confirm differential trip against both sides' CT secondary currents; a
  differential operation with matching through-current on both sides but no
  restraint should be treated as a possible CT wiring or saturation issue
  and investigated before re-energizing.
- For LLL/LLLG events with severe voltage collapse and high current on all
  three phases, assume major equipment or conductor damage; block automatic
  reclosing and require visual line/equipment inspection prior to
  restoration, since these faults are frequently bolted faults from
  equipment failure or structural events.
- Cross-check the event with system frequency and rate-of-change-of-frequency
  (ROCOF) records: a three-phase fault near a generating unit can cause
  frequency excursions and may trigger under-frequency load shedding or
  generator protection; coordinate the fault report with generation
  operators.
- Where a three-phase fault trips a tie or interconnection, evaluate the
  islanding risk and confirm protection schemes (e.g., 81U/81O, loss of
  mains) operated as expected.

## Typical Clearance Times
High-magnitude three-phase faults should be cleared by primary protection
in 2-5 cycles (40-100 ms) given their severe impact on stability; backup
protection should clear within 0.15-0.5 seconds with appropriate breaker
failure protection (device 50BF) initiated if the primary breaker fails to
interrupt within its rated time.
