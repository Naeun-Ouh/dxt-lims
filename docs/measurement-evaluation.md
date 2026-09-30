# Measurement to Evaluation

The controlled Evaluation slice keeps three concepts separate:

1. `MeasurementValue` and `WaferMeasurementSummary` are observed evidence.
2. Target Achievement is a recalculated projection over an immutable `SeriesTarget` configuration and one explicitly referenced representative result.
3. Engineer Evaluation is a human interpretation record with its own disposition, rationale, evaluator, timestamp, Target reference, and Measurement Summary reference.

Target Achievement is never stored as independent scientific truth. The projection records the Target, Measurement Summary, Dataset, and MeasurementExecution identities that produced the status. Supported statuses are `ACHIEVED`, `NOT_ACHIEVED`, `MISSING_RESULT`, and `NOT_EVALUABLE`.

The current binding selects a `SUBJECT_SUMMARY` and an explicit aggregation method and Measurement Point. Site observations remain source evidence underneath that summary. They are never silently substituted for a Subject-level result. This also keeps CMP PRE and POST results distinct.

Engineer Evaluation may disagree with computational Target Achievement. An achieved target can still be marked Needs review, Unsuitable, or Informative, and a missed target can still represent useful learning. Neither status automatically determines overall experiment success, failure, Decision, or Next Action.

The Engineering Grid adds an Evaluation projection beside Plan, Actual, and Measurement. The dense grid shows Target, rule, exact result selection, achievement, and engineer disposition by Subject. The Inspector exposes Target, summary, Dataset, MeasurementExecution, result grain, Measurement Point, evaluator, rationale, and timestamp.
