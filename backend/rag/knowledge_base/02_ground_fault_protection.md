# Ground (Earth) Fault Protection Guidelines

## Purpose
Guidance for detecting and responding to single line-to-ground (LG) and
double line-to-ground (LLG) faults using zero-sequence and residual
overcurrent protection (device 51N/50N and 59N for neutral overvoltage).

## Applicable Fault Signatures
- LG faults show a voltage sag on one phase (often to 15-50% of nominal),
  a large current rise on the same phase (3-9x nominal), and a nonzero
  zero-sequence voltage/current that would otherwise sum to zero under
  balanced conditions.
- LLG faults show sag on two phases with elevated zero-sequence current on
  both, generally larger in magnitude than a single LG fault, reflecting the
  additional ground-return path.
- A rising zero-sequence voltage (3V0) without a matching current rise can
  indicate a high-impedance ground fault, broken/downed conductor into
  high-resistance terrain, or an open neutral -- these can be difficult for
  standard overcurrent elements to detect and may need sensitive earth-fault
  (SEF) protection.

## Relay Settings
1. Residual ground overcurrent (51N) pickup is typically set lower than
   phase overcurrent, often 10-25% of phase pickup, since load current
   should not normally produce significant zero-sequence current.
2. For high-impedance grounded or ungrounded systems, sensitive
   earth-fault relays with pickup as low as 1-5 A may be required to detect
   high-resistance faults.
3. Neutral overvoltage protection (59N) should be coordinated to alarm
   before tripping where possible, allowing operators to locate a developing
   ground fault before automatic isolation on radial feeders.

## Recommended Corrective Actions
- Single-phase voltage sag with matching zero-sequence current: dispatch to
  inspect for a downed conductor, tree contact, or failed insulator on the
  affected phase; treat downed conductors as energized until confirmed
  de-energized and grounded per safety procedure.
- Two-phase sag with strong zero-sequence signature (LLG): this pattern
  often follows storm damage or equipment failure involving two phases and
  ground; prioritize crew dispatch and consider blocking reclose given the
  higher likelihood of conductor-on-ground contact.
- Persistent low-level zero-sequence current without a trip may indicate a
  degrading insulator or vegetation intermittently contacting a conductor;
  schedule a line inspection rather than waiting for a hard fault.
- Confirm proper operation of the neutral grounding device (resistor,
  reactor, or solid ground) after any ground fault event, since a failed
  grounding device can mask or exaggerate zero-sequence readings on the
  next event.

## Typical Clearance Times
Ground faults on distribution feeders are typically cleared within
0.3-1.0 second by 51N elements; sensitive/high-impedance earth fault
detection is usually alarmed rather than instantly tripped, per utility
practice, to avoid nuisance outages from transient contacts.
