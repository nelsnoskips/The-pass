# Direction 2 asset library

The 24 delivered assets for `/orravan-v3` live here. Filenames must match
`lib/images.ts` exactly:

    01-hero-blueprint-background.webp     13-service-inventory-fabrication.webp
    02-hero-facility-leader-cutout.webp   14-software-operations-center.webp
    03-hero-building-cutaway-cutout.webp  15-senior-field-specialist.webp
    04-one-view-building-section.webp     16-team-careers.webp
    05-software-people-plate.webp         17-industry-healthcare.webp
    06-response-remote-specialist.webp    18-industry-commercial.webp
    07-response-field-technician.webp     19-industry-education.webp
    08-response-facility-leader.webp      20-industry-hospitality.webp
    09-verified-outcome-lobby.webp        21-industry-restaurants.webp
    10-service-building-automation.webp   22-industry-mission-critical.webp
    11-service-hvac-systems.webp          23-official-logo-reverse.png
    12-service-remote-monitoring.webp     24-official-logo-on-light.png

Each direction keeps its own library. v3 shared v2's for a while, which
meant the published bundle carried 35MB of photography it never
referenced — enough to fail the deploy. A slot with no file renders a
labelled placeholder, so the page stays reviewable while these land.
