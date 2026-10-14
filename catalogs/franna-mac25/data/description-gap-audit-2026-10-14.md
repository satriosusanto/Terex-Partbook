# Franna MAC25 Description Gap Audit — updated 2026-10-14

## Summary after matching the additional H2 database

- Part rows after duplicate cleanup: 3284
- Part rows with blank description: 12 (includes the zero/placeholder row)
- Actual part rows with blank description: 11
- Unique remaining blank part numbers: 10
- Hotspot rows with blank description: 48
- Blank-description hotspots retaining a part number or part ID: 9
- Hotspots with neither part number nor part ID: 39

## Source and matching method

The additional `Data(2).zip` includes `PPData.h2.db` and five H2 LOB files. H2 recovery produced a SQL dump containing `MAT`, `KATALOG`, and `SPRACHE` data. Exact part-number and text-key matches were used to backfill 64 unique part numbers (69 part rows) and 52 hotspot rows. Existing nonblank descriptions were not overwritten.

Ten unique part numbers remain unresolved; these are not assigned guessed descriptions. Hotspots without part links remain a separate diagram/callout-linking issue and require confirmation against the OEM diagram/callout list.

## Part rows still requiring source lookup

| Catalog | Position | Part number | Qty | Record ID |
|---|---:|---|---:|---|
| PLMXA1059P | 20 | T179246A | 1 | PLMXA1059P:00020 |
| T185887A | 39 | T169272 | 1 | T185887A:00039 |
| T185887A | 40 | T171930 | 1 | T185887A:00040 |
| T164544 | 9 | T143156 | 1 | T164544:00009 |
| T143124B | 6 | T139153A | 1 | T143124B:00006 |
| T172822A | 17 | T178561 | 1 | T172822A:00017 |
| T172822A | 18 | T178561 | 1 | T172822A:00018 |
| T177756B | 83 | T134440 | 1 | T177756B:00083 |
| T177771B | 1 | 16C2185B | 1 | T177771B:00001 |
| T177772C | 2 | 16P0620A | 1 | T177772C:00002 |
| T177772C | 3 | 16P2527A | 1 | T177772C:00003 |
| 0 |  | 0 |  | 0:00000 |

## Blank-description hotspots without part number or part ID

These entries need comparison with the original diagram/callout list before assigning a part number. Position alone is not enough to infer a link.

| Image | Catalog | Position |
|---|---|---:|
| T185951B.TIF | T185951B | 14 |
| T191277A.TIF | T191277A | 51 |
| T191850A.TIF | T191850 | 2 |
| PLMXA5010C.TIF | PLMXA5010C | 6 |
| PLMXA5010C.TIF | PLMXA5010C | 5 |
| T191249A.TIF | T191249A | 4 |
| T191249A.TIF | T191249A | 6 |
| T191249A.TIF | T191249A | 5 |
| T191249A.TIF | T191249A | 9 |
| T191249A.TIF | T191249A | 9 |
| T191249A.TIF | T191249A | 7 |
| T191249A.TIF | T191249A | 7 |
| T191255A.TIF | T191255A | 6 |
| T191256A.TIF | T191256A | 9 |
| T191256A.TIF | T191256A | 9 |
| T191256A.TIF | T191256A | 11 |
| T191256A.TIF | T191256A | 10 |
| T191256A.TIF | T191256A | 12 |
| T139169A.TIF | T139169A | 6 |
| T191725A.TIF | T191725A | 8 |
| PLMXA8115B.TIF | PLMXA8115B | 6 |
| PLMXA8115B.TIF | PLMXA8115B | 6 |
| PLMXA8115B.TIF | PLMXA8115B | 3 |
| PLMXA8115B.TIF | PLMXA8115B | 4 |
| PLMXA8115B.TIF | PLMXA8115B | 2 |
| PLMXA8115B.TIF | PLMXA8115B | 5 |
| T159265B.TIF | T159265B | 7 |
| T181694B.TIF | T181694B | 7 |
| T181694B.TIF | T181694B | 6 |
| T181694B.TIF | T181694B | 2 |
| T181694B.TIF | T181694B | 5 |
| T181694B.TIF | T181694B | 4 |
| T181694B.TIF | T181694B | 3 |
| T181694B.TIF | T181694B | 8 |
| T181694B.TIF | T181694B | 9 |
| T177771B.TIF | T177771B | 4 |
| T177771B.TIF | T177771B | 4 |
| T177771B.TIF | T177771B | 3 |
| T177772C.TIF | T177772C | 4 |

## Blank-description hotspots that retain a part reference

| Image | Catalog | Position | Part number | Part ID |
|---|---|---:|---|---|
| PLMXA1059P.TIF | PLMXA1059P | 20 | T179246A | PLMXA1059P:00020 |
| T185887A.TIF | T185887A | 39 | T169272 | T185887A:00039 |
| T185887A.TIF | T185887A | 40 | T171930 | T185887A:00040 |
| T143124B.TIF | T143124B | 6 | T139153A | T143124B:00006 |
| T172822A.TIF | T172822A | 17 | T178561 | T172822A:00017 |
| T172822A.TIF | T172822A | 18 | T178561 | T172822A:00018 |
| T177771B.TIF | T177771B | 1 | 16C2185B | T177771B:00001 |
| T177772C.TIF | T177772C | 3 | 16P2527A | T177772C:00003 |
| T177772C.TIF | T177772C | 2 | 16P0620A | T177772C:00002 |

## Additional integrity checks — hotspot linkage

- Initial integrity scan found 24 repeated record IDs in 3308 rows. Removed 24 redundant/misattributed rows, leaving 3284 BOM rows and no repeated part IDs.
- Three conflicting self-rows were removed from their own subcatalogs because their matching parent assembly rows are already represented correctly in the parent BOM: `PLMXS1022C` at position 5 under `T177667`, `T136472` at position 2 under `T185887A`, and `PL16A3067A` at position 60 under `T137360D` / `MXC3147A`.
- Exact duplicate child records were deduplicated in both `parts.json` and `catalogs.json`; both now contain 3284 child/part rows.
- The MAC25 root assembly has 9 immediate assembly references; all 9 resolve to existing catalog records.
- Hotspot click handling now resolves by catalog + callout position + part number first, and only falls back to `part_id` when that lookup is unambiguous. Conflicting ambiguous rows are not selected arbitrarily.
- These data cleanup and lookup changes reduce the risk of duplicated BOM lines or a hotspot opening the wrong row. The 39 unlinked callouts still need confirmation against the OEM diagram.

## Data integrity notes

- Existing descriptions were not overwritten.
- Descriptions were filled only where the recovered part master and text table provided a matching key.
- Ten unique part numbers remain unresolved and should be verified against the OEM catalog or an authoritative export.
- The 39 unlinked hotspots are a separate data-link problem; do not infer their part numbers from position alone.
- The application labels any remaining blank description as unavailable in source data.
