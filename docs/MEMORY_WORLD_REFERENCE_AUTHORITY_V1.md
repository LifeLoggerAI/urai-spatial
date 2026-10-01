# URAI Memory World Reference Authority V1

Status: IMPLEMENTED POLICY CATALOG / ITEM-LEVEL INGESTION STILL REQUIRED

## Rule

A source being visible on the public internet does not make it a production asset.

The registry classifies institutional defaults, then requires item-level review before a reference becomes a runtime asset.

## Current authority classes

### Smithsonian Open Access

Items explicitly marked CC0 are production candidates for copyright purposes. Smithsonian notes that privacy, publicity, trademark and other third-party rights can still apply. The catalog therefore retains an item-level review gate even for CC0.

Policy:
- https://www.si.edu/openaccess/faq
- https://www.si.edu/termsofuse

### Library of Congress

Default handling is reference-only until the specific item's Rights and Access / Rights Advisory has been inspected.

Policy:
- https://www.loc.gov/legal/security-copyright-and-privacy/understanding-copyright/

### U.S. National Archives

Federal works created by U.S. Government employees in official duties are generally public domain in the United States, but NARA holdings also include third-party and restricted material. Item-level review remains mandatory.

Policy:
- https://www.archives.gov/research/still-pictures/permissions

### Europeana

Rights are expressed per digital object using standardized rights statements. Metadata and media can have different reuse status. Never promote an object based only on the Europeana collection page.

Policy:
- https://pro.europeana.eu/page/available-rights-statements

### Wikimedia Commons

Reuse rights vary per file. The production pipeline must capture file identity, author, exact license, license version, attribution and any non-copyright restrictions before promotion.

Policy:
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia

### OpenStreetMap

OSM is useful for geographic context but has ODbL attribution and database obligations. Raw OSM data, derived databases and rendered tiles are distinct licensing surfaces.

Policy:
- https://www.openstreetmap.org/copyright

## Production gate

No reference may enter GOLD or GOLD MASTER merely because its institution appears in this catalog.

Required per-item evidence:

1. stable source identifier;
2. source URL or archive locator;
3. rights statement / license;
4. author or institution where applicable;
5. attribution text where required;
6. derivative/commercial/redistribution decision;
7. privacy/publicity/cultural review where relevant;
8. checksum of the exact downloaded source;
9. transformation lineage;
10. final production asset checksum.
