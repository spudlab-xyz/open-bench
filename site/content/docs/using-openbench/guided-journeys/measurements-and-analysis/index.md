---
title: Record measurements and analyse
description: Capture observation context, missingness, corrections, and reproducible analysis snapshots.
weight: 30
---

## 5. Record observations and missingness honestly

Open **Data → Add reading**. For the first foam reading, a plausible record could be:

- **Specimen:** `Foam assembly 1`
- **Run:** `Cooling run 10`
- **Elapsed time:** `0 min`
- **Water temperature:** `79.4 °C`
- **Value kind:** `Raw observation`
- **Quality:** `Valid under recorded checks`
- **Instrument:** the exact registered probe
- **Calibration:** the calibration applicable at acquisition
- **Operator/recorder:** the person who entered or acquired it
- **Acquired at:** the observation time, which can differ from entry time

{{< screenshot src="measurement-fields.png" alt="Add measurement form showing identity, value, quality, uncertainty, source, timestamp, instrument, calibration, location, and rationale fields" caption="Measurement context preserves how a number was obtained. Leave unknown optional values empty rather than guessing." >}}

Use **Record missing** when an expected reading was not obtained. Select a reason such as instrument
failure or lost sample. Do not enter zero: zero is a measured value, while missingness is an evidence
state.

{{< screenshot src="measurement-data.png" alt="Measurement table with filters and a selected reading inspector showing value, quality, source, and acquisition context" caption="Filters help inspect the data, while the selected-reading panel exposes provenance and creates an audited correction when a value changes." >}}

If a value is corrected, OpenBench preserves the prior value and requires a revision note. Explain
the reason, for example `Transcription checked against probe log; 61.5 replaced with 67.5 °C.` Do
not use a correction to hide an inconvenient observation; change its quality state and explain why.

## 6. Save a reproducible analysis snapshot

Open **Analysis** and choose:

1. the outcome variable;
2. observed value at an exact point, or final minus baseline;
3. included conditions, specimens, and runs;
4. any excluded measurements, each with a reason;
5. a meaningful analysis name.

{{< screenshot src="analysis-settings.png" alt="Analysis view showing calculated chart, condition summaries, and analysis settings" caption="The analysis groups by assigned condition and records exact points and exclusions. It does not overwrite observations." >}}

Example: save `Water temperature at 30 min` using the exact 30-minute point. If data later changes,
that snapshot becomes stale. Review and save a new analysis revision rather than assuming the old
result still represents current evidence.
