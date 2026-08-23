# Fault Reporting, Restoration, and Safety Procedure

## Purpose
Standardizes the information captured in a fault event report and the
decision process for restoration, so that diagnosis output is consistent and
usable by field crews and protection engineers.

## Required Fault Report Contents
1. Fault identifier, timestamp, and affected feeder/bus/equipment.
2. Classified fault type (e.g., LG, LL, LLG, LLL, LLLG) with the confidence
   of the classification.
3. Measured per-phase RMS voltage and current, system frequency, voltage and
   current unbalance percentages, and zero-sequence quantities at the time
   of the event.
4. Estimated fault location (percentage of line length or GPS/section ID)
   and estimated fault impedance where available from traveling-wave or
   impedance-based fault locators.
5. Protective devices that operated (relay element, breaker) and time to
   clearance, cross-checked against SCADA/DFR (digital fault recorder)
   records.
6. Recommended corrective action and restoration guidance, and whether
   automatic reclosing should be blocked pending inspection.

## Restoration Decision Guidance
- For faults with normal-magnitude fault current, a single clean trip, and
  successful reclose, treat as a transient fault (e.g., lightning, brief
  vegetation contact) and monitor; no crew dispatch is typically required
  unless the feeder has a pattern of repeated transient trips.
- For faults involving very high current magnitude (three-phase or
  multi-phase-to-ground), sustained duration, or a failed reclose, block
  further automatic reclose attempts and require field verification before
  re-energizing, since these are frequently associated with permanent
  damage (broken conductor, failed equipment) that could be hazardous to
  re-energize blind.
- Where fault location estimates are available, prioritize crew dispatch to
  the estimated section first; if two independent methods (impedance-based
  and traveling-wave) disagree by more than the typical uncertainty (roughly
  1-2% of line length for traveling-wave methods, higher for impedance-based
  methods on multi-tap lines), inspect the wider estimated range.
- Repeated faults at or near the same location within a short time window
  should be flagged for a root-cause investigation (vegetation management,
  equipment condition, or design issue) rather than treated as independent
  transient events.

## Safety Notes
- All field responses to a reported fault should assume conductors may be
  energized until confirmed de-energized, grounded, and tested per the
  utility's lockout/tagout and grounding procedures, regardless of what
  automated diagnosis indicates.
- Automated diagnosis and recommended actions from this system are decision
  support only and do not replace utility protection engineering review,
  established switching procedures, or applicable regulatory/safety
  requirements.
