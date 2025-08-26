**Point Tracking Column:**

*   Given that typical "available points" lists from data sources (connectors) are well north of 50 points, I'd try to make the center rows even tighter... perhaps show minimal point information by default, but allow expanding a point row for additional information.
*   What min info to share...
*   will want to highlight assumed navName (equal to incoming/scanned bacnetDis from contractor), but that be editable to whatever alias they want when mapping.
*   will want to highlight bacnetCur (AV23, BI7, etc)
*   will want to highlight bacnetDesc that comes from contractor (often a phrase like "Computer room temperature")
*   will want to highlight Units from contractor as well (may want this editable here too, for selected points)
*   Perhaps make which key items/facets/markers show up a customizable thing (ie, hide bacnetDesc but show kind tag). The above facets (dis, desc, cur, units) are most useful in practice, but sometimes other choices could be helpful.
*   If we allow edits (in initial onboarding and modifications) here in this tool/view (like I routinely do to points after seeing what comes through from mapping, such as changing/adding units or changing navName... other common changes like adding writeable tag, connTuningRef, bacnetWrite, bacnetWriteLevel, enum conversions, etc could remain behind the scenes), somehow note that it's been changed from what came through from the contractor. It would seem like only mapped points should be editable.
*   We'll want filtering for the points as well, such as show all points with units=CFM, or string contains "SF".

**Left Column (aka Available Data Sources):**

*   Change the name to "Data Sources" rather than SkySpark Equipment
*   When selecting a data source on the left that's already been mapped, just highlight the single (or multiple) CxAlloy asset(s) in the right column and bring it to the top of the list. One data source to multiple equips is common so it should support multiple equipment being mapped to a single datasource
*   If a selected data source on the left hasn't been mapped yet,  highlight the "smart"/likely CxAlloy asset target on the right column and bring it to the top. "Sugguested equipment” such that selecting VAV-7 on the left would match to VAV-07, VAV-7, VAV\_7, etc on the right, if such an asset name exists. If no match, perhaps suggest "create new CxAlloy asset".

Right column (CxAlloy equipment):

*   Please add search bar here just like in left column

**Bulk Mapping thoughts:**

Most productive and common user prompt/thought/need/request will be to... apply already curated mapping I've done from CxAlloy's VAV\_01 to all CxAlloy VAV's (VAV\_02, VAV\_03, etc), using appropriate data source (VAV-2, VAV-3, etc), based on bacnetCur, such that each CxAlloy VAV will now have a Space-Temp mapped from it's associated data source's point AV24, OccCoolSP from AV10, OccHeatSP from AV11, Occupancy from BV03, etc.

In step by step version...

Select any already mapped CxAlloy Asset to be the Template...

Select one or more data sources and match to CxAlloy Asset targets (not sure how to accomplish this graphically, but need to make pairings in bulk... could also suggest pairings.. VAV-7 --> VAV\_07, etc)...

select what facet to match from template CxAlloy Asset... bacnetDis, or bacnetCur, or  bacnetDesc"...

select what facet to copy... presumably the navName/alias...