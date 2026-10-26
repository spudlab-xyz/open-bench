---
title: Import measurements from CSV
description: Map a CSV safely, inspect rejected rows, and preserve source and permission provenance.
weight: 20
---

Use CSV import when rows already identify a known specimen, run, observation point, value, and unit.
Create the experiment design, specimens, and runs first; import does not invent those identities.

## 1. Prepare or download an example

Open **Data → Import CSV** and select **Download example** if you need the expected shape. Quoted fields
are supported. Keep one header row and use the exact specimen and run identities shown in OpenBench.

Required mappings are:

- specimen identity;
- run identity;
- elapsed time or observation date;
- measured value;
- unit.

Notes are optional. The unit in every accepted row must match the experiment's outcome unit.

## 2. Choose and map the file

After choosing a file, check every proposed mapping. Automatic mapping is only a convenience; select
**Not mapped** or the correct column where a heading was interpreted incorrectly. OpenBench calculates
a SHA-256 hash of the file bytes in this browser.

## 3. Review valid and rejected rows

The preview never silently converts an invalid row. Common rejection causes include:

{{< screenshot src="csv-mapping-preview.png" alt="CSV import dialog showing mapped columns, one valid row, one rejected unknown specimen, source fields, and permission acknowledgement" caption="Review mappings and every rejected row before committing. Accepted and rejected source rows remain part of the import provenance record." >}}

| Problem | Recovery |
|---|---|
| Unknown specimen or run | Correct the CSV identity or create the intended record, then choose the file again. |
| Specimen does not belong to the mapped run | Correct the row or the run's specimen association before measurements exist. |
| Missing or non-numeric value | Restore the source value, or record an explicit missing observation instead of importing zero. |
| Unit does not match | Correct the source unit. Do not relabel a number without performing and documenting a valid conversion. |
| Duplicate or invalid observation point | Correct the source row and re-import; do not delete a legitimate existing reading to force acceptance. |
| CSV parse error | Correct malformed quoting, columns, or line structure before committing. |

Valid rows can be committed while rejected rows, their row numbers, errors, the original rows, mapping,
filename, and file hash remain in the import provenance record.

## 4. Record source rights

Enter a recognisable source name, required attribution, and the actual permission status. The required
acknowledgement confirms that processing data does not grant redistribution rights. It does not turn a
restricted or prohibited source into a permitted one.

## 5. Verify after import

1. Confirm the accepted count in **Data**.
2. Open **Overview → Scientific record → Sources** and inspect the import details and rejected rows.
3. Inspect representative measurements for run, specimen, point, value, and source context.
4. Resolve any quality warnings before refreshing a saved analysis.

Importing the corrected file again creates additional measurements; it is not an automatic merge or
replacement. Correct existing measurements through their audit-preserving edit action when appropriate.
