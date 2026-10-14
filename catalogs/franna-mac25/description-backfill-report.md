# Franna MAC25 — Description Recovery Report

## Recovery sources and matching rules

Descriptions were backfilled only when a non-empty description was recovered from the supplied H2 catalog export and matched an exact part number. Existing descriptions were preserved. Rows with a conflicting existing description were not overwritten, and no description was inferred from a diagram or guessed.

The recovered master contains 696 unique part numbers with non-empty descriptions. Those descriptions were applied only to blank description fields in the MAC25 dataset.

## Latest backfill results

Additional changes from the supplied database recovery:

- `parts.json`: 1,186 blank part-row descriptions populated.
- `catalogs.json`: 1,186 blank BOM child descriptions populated.
- `hotspots.json`: 1,070 blank hotspot descriptions populated.

These are row counts, not unique part-number counts; repeated part numbers in different BOMs are updated separately.

## Remaining gaps after this recovery

- `parts.json`: 81 rows still have no recovered description for their exact part number.
- `catalogs.json`: 81 child rows still have no recovered description for their exact part number.
- `hotspots.json`: 61 hotspot records still have no recovered description for their exact part number.
- Existing descriptions with a different value from the recovered master were preserved for manual review: 13 part/BOM rows and 10 hotspot records were not overwritten.

## Limitations

The supplied database export includes multiple catalog variants and does not provide a complete, unambiguous description for every part number. Exact part-number matches are used as evidence; missing descriptions and conflicts require further source review. The application should not display invented descriptions as if they were OEM data.
