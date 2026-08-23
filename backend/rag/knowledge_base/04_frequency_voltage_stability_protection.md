# Frequency and Voltage Stability Protection Guidelines

## Purpose
Guidance for interpreting frequency deviation, voltage sag/swell, and
sequence-component imbalance readings that accompany a fault, and for
configuring under/over-frequency and under/over-voltage protection (devices
81U/81O, 27, 59).

## Interpreting Frequency Deviation
- Small, transient frequency deviations (typically under ±0.3 Hz from
  nominal, lasting a few cycles) are normal during nearby faults as
  generators respond to the disturbance and should not by themselves trigger
  load shedding.
- Larger or sustained deviations, especially when paired with a
  three-phase fault or loss of a major generation source, indicate a
  system-level power imbalance and may require staged under-frequency load
  shedding (UFLS) per the utility's load-shedding schedule.
- Frequency measurements should always be evaluated together with voltage
  magnitude: a frequency dip with normal voltage suggests a generation
  deficit elsewhere on the system, whereas a frequency dip coincident with a
  severe local voltage collapse more likely reflects a nearby fault
  affecting the measuring point rather than a system-wide imbalance.

## Interpreting Voltage Sag/Swell and Unbalance
- Voltage unbalance (the maximum deviation of any phase from the average of
  the three, expressed as a percentage) above roughly 2% during steady-state
  operation warrants investigation; unbalance above 10-15% concurrent with a
  current rise is consistent with an active unbalanced fault (LG, LL, LLG).
- A voltage swell (rise above nominal) on unfaulted phases during a
  single-line-to-ground fault is expected on ungrounded or high-impedance
  grounded systems and is not itself a fault indicator, but should be
  checked against equipment insulation withstand ratings.
- Voltage sag that recovers immediately upon fault clearance is expected
  behavior; voltage that fails to recover after the reported clearance time
  suggests the breaker did not fully interrupt the fault or that a
  second, cascading event has occurred.

## Recommended Corrective Actions
- If frequency deviation exceeds the first UFLS stage threshold, confirm
  which load-shedding stages operated and cross-check against SCADA breaker
  status before manual restoration.
- If voltage unbalance is elevated without a clear overcurrent signature,
  consider a single-phase source problem (blown fuse, open conductor, failed
  capacitor bank fuse) rather than a bolted fault, and dispatch accordingly.
- Log all frequency/voltage excursions associated with a fault event in the
  fault report so they can be correlated with generation dispatch and
  interconnection protection studies.
- Any event that approaches generator or interconnection protection limits
  (over/under-frequency, over/under-voltage ride-through curves) should be
  reported to system operations promptly, even if local protection did not
  operate, since ride-through margins may be affected for subsequent events.

## Typical Settings Reference
Under-frequency load shedding stages are commonly set starting near
59.3-59.5 Hz (60 Hz systems) or 49.0-49.3 Hz (50 Hz systems) with 0.2-0.5 Hz
steps between stages; under/over-voltage protection is typically set at
80-90% and 110-120% of nominal voltage respectively, with time delays chosen
to ride through momentary sags from remote faults.
