# LOCUS-SF thesis use case diagrams

Figure 2 and two focused detail diagrams were generated locally from editable PlantUML source. The evidence table was prepared before drawing. Current repository files are the evidence and scope reference, following the user's clarification. Application functionality was not changed.

## Files

| Diagram | Editable source | SVG | High-resolution PNG |
| --- | --- | --- | --- |
| Figure 2. Use Case Diagram of LOCUS-SF | [PlantUML](figure-2-use-case-overview.puml) | [SVG](figure-2-use-case-overview.svg) | [PNG](figure-2-use-case-overview.png) |
| Property Submission and Assessment — detail scope | [PlantUML](detail-property-submission-assessment.puml) | [SVG](detail-property-submission-assessment.svg) | [PNG](detail-property-submission-assessment.png) |
| Broker Review and Administration — detail scope | [PlantUML](detail-administration.puml) | [SVG](detail-administration.svg) | [PNG](detail-administration.png) |

- [Actor/use-case evidence table](evidence.md), with code locations and implementation statuses.
- [CSV evidence table](evidence.csv), for Word/Excel table import.
- [Figure explanation and unresolved discrepancies](manuscript-notes.md), including why document decisions/listing publication and configuration administration are excluded.
- [Export verification](export-verification.json), with dimensions, PNG density metadata and source/SVG/PNG digests.
- [Local renderer](tools/render.ps1).

## Word insertion

Insert the SVG when the Word version supports it; this keeps text and UML symbols sharp when resized. The PNG alternatives use a white background and 320 DPI export settings. Preserve the aspect ratio and use a landscape page if needed for the detail diagrams. The title is included in the overview image; avoid duplicating it as an additional visible caption unless the thesis template requires that.

Verified raster sizes: overview **2240 × 3212**, property detail **2385 × 2928**, administration detail **2139 × 3360** pixels. All three carry approximately 320 DPI physical-size metadata. A 5.6-inch insertion width keeps the tall administration figure under 8.8 inches high; check the final thesis margins before increasing its size. The current layouts also fit portrait pages when resized proportionally.

Copy the figure explanation from `manuscript-notes.md` into the manuscript. Keep its scope and exclusion notes available to reviewers: reachable permission checks, partial API paths and planned configuration are distinguished rather than silently combined. Use the generated source files to adjust typography or spacing to the final thesis page size.

## Re-render locally

The session downloaded public Java/PlantUML binaries into the ignored workspace directory `.ui-audit/uml-renderer/`. Diagram content was never submitted to a public rendering service. The local renderer is PlantUML 1.2025.7, Java 17 and PlantUML's bundled Graphviz. The PNG/SVG files are actual generated exports, not placeholders.

When Node.js is available, the renderer also runs `tools/verify-exports.mjs`. That utility checks PNG integrity and actual geometry, adds DPI metadata without changing pixels, and refreshes the CSV evidence table and verification record. It does not import application code.

From the repository root in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/uml-locus-sf/tools/render.ps1
```

On another machine with Java and a local PlantUML jar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/uml-locus-sf/tools/render.ps1 -JavaPath 'C:\path\to\java.exe' -PlantUmlPath 'C:\path\to\plantuml-1.2025.7.jar'
```

Alternatively run the local jar directly, from this diagram directory:

```powershell
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=14000 -jar C:\path\to\plantuml.jar -checkonly -charset UTF-8 *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=14000 -jar C:\path\to\plantuml.jar -tsvg -charset UTF-8 *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=14000 -jar C:\path\to\plantuml.jar -tpng -charset UTF-8 *.puml
node tools/verify-exports.mjs
```

The PowerShell renderer runs syntax checking before exporting. It reads only the diagram source; it does not load the application or change data. UML associations are solid and have no arrowheads. The only visible use-case dependency is the optional boundary-drawing extension; its dashed arrow points to the base submission/editing use case. Hidden source links guide placement and are not UML relationships in the rendered figure. No login includes or actor generalizations are used.
