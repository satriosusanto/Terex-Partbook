# Franna MAC25 — Description Recovery Report

## Changes made

Descriptions were backfilled only when recoverable from existing repository data:
- Verified assembly names already maintained in the MAC25 interface, taking precedence where they conflict with the extracted catalog title.
- Exact catalog title matching the part number.
- A single unambiguous description already recorded for the exact same part number elsewhere in the extracted dataset.

No description was guessed from visual proximity or fabricated.

## Backfill results

- Part rows updated in `parts.json`: 605
- BOM child rows updated in `catalogs.json`: 616
- Hotspot records updated in `hotspots.json`: 288

## Remaining gaps

- Part rows still without a source-backed description: 1267
- Catalog child rows still without a source-backed description: 1267
- Hotspots still without a source-backed description: 1170

The remaining gaps cannot be reliably reconstructed from the current JSON records alone. To fill those accurately, the corresponding original OEM catalogue pages or a corrected source export containing the descriptions are required. The application should not display invented part descriptions as if they were OEM data.
