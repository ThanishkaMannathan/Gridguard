# Overcurrent Protection Guidelines

## Purpose
This guideline covers detection and clearance strategy for phase overcurrent
conditions on distribution and sub-transmission feeders protected by
inverse-definite-minimum-time (IDMT) relays and fuses.

## Applicable Fault Signatures
- Line-to-line faults (LL) typically produce current on two phases rising to
  3-6x nominal load current, with the third phase remaining close to normal.
- Three-phase faults (LLL) produce a near-symmetrical rise on all three
  phases, often 6-12x nominal current, with minimal negative-sequence
  component.
- Sustained overcurrent without a corresponding voltage dip usually points to
  overload rather than a fault and should not trip instantaneous elements.

## Relay Settings
1. Pickup current for the 51 (time overcurrent) element should be set at
   1.25-1.5x maximum expected load current to avoid nuisance tripping during
   cold-load pickup or motor starting.
2. Instantaneous element (50) pickup should be set above the maximum
   through-fault current seen from downstream faults, typically 1.25-1.3x
   the calculated maximum fault current at the far end of the protected zone.
3. Time-dial settings should be coordinated with downstream devices to
   maintain a minimum coordination time interval (CTI) of 0.2-0.4 seconds
   between adjacent relays.

## Recommended Corrective Actions
- If unbalanced two-phase overcurrent is detected with normal frequency and
  no zero-sequence current, dispatch a line crew to inspect for a
  phase-to-phase fault (tree contact, conductor clash, or insulator failure)
  along the protected section.
- If three-phase symmetrical overcurrent is detected with severe voltage
  collapse on all phases, treat as a bolted three-phase fault; block
  automatic reclosing until the faulted section is visually inspected, since
  three-phase faults are frequently associated with structural damage
  (broken pole, fallen conductor).
- Verify relay target/event records against SCADA breaker status to confirm
  correct operation before returning the circuit to service.
- After any overcurrent trip, review fault current magnitude against the
  time-current curve to confirm the operating relay matches the coordination
  study; miscoordination (wrong device operated first) should be logged for
  a protection review.

## Typical Clearance Times
Instantaneous overcurrent elements should clear the fault in under 100 ms
(5-6 cycles at 50 Hz) for close-in faults. Time-overcurrent backup should
clear within 0.5-2.0 seconds depending on coordination margin, consistent
with IEC 60255-151 curve standards.
