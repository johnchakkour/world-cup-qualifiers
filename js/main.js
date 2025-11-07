
const qualifiersCsv = "fifa_qualifiers.csv";
const worldGeoJSONUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const colorScale = {
    "Champion": "#fef720",
    "Final": "silver",
    "Third place": "#9bfa24",
    "Semi-finals": "#1bf118",
    "Quarter-finals": "#31db92",
    "Round of 16": "#27bbe0",
    "Group stage": "#1c6ff8",
    "Final round": "#1bf118",
    "Second group stage": "#31db92",
    "default": "transparent"
};

const strokeColor = "dimgrey";

const nameOverrides = {
    "Soviet Union": "Russian Federation",
    "Yugoslavia": "Serbia"
};

// =============================================================
// D3 setup
// =============================================================

let svg = d3.select("#mapSvg"),
    width = +svg.attr("viewBox").split(' ')[2],
    height = +svg.attr("viewBox").split(' ')[3];

let tooltip = d3.select("#tooltip"),
    yearSlider = d3.select("#yearSlider"),
    yearLabel = d3.select("#yearLabel"),
    playBtn = d3.select("#playBtn");

let worldData, qualifiersData, allYears;
let qualifiedByYear = new Map();

let projection = d3.geoNaturalEarth1().scale(230).translate([width / 2.5, height/ 2]),
    path = d3.geoPath().projection(projection);

// =============================================================
// Data loading
// =============================================================

Promise.all([
        d3.json(worldGeoJSONUrl),
        d3.csv(qualifiersCsv, d => ({
            year: +d.tournament_year,
            country: d.team_name && d.team_name.trim(),
            performance: d.performance && d.performance.trim(),
            topScorer: d.top_scorer && d.top_scorer.trim(),
            topScorerGoals: d.top_scorer_goals && d.top_scorer_goals.trim() } ))

    ]).then(([geo, data]) => {
        worldData = geo;
        qualifiersData = data.filter(d => d.country && !isNaN(d.year));
        allYears = Array.from(new Set(qualifiersData.map(d => d.year))).sort((a,b) => a-b);

        // Configure slider for 4-year increments
        yearSlider.attr("min", allYears[0])
                .attr("max", allYears[allYears.length - 1])
                .attr("step", 4)
                .property("value", allYears[0]);

        yearLabel.text(allYears[0]);

        qualifiedByYear = d3.group(qualifiersData, d => d.year);

        drawMap();
        updateMap(+yearSlider.property("value"));
    });

// =============================================================
// Draw and update map
// =============================================================

function drawMap() {
    svg.append("g")
        .attr("class", "countries")
        .selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", colorScale.default)
        .attr("stroke", strokeColor)
        .attr("stroke-width", 0.6)
        .on("mouseenter", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseleave", hideTooltip);
}

function updateMap(year) {
    yearLabel.text(year);

    let yearData = qualifiedByYear.get(year) || [];

    svg.selectAll(".countries path")
        .transition()
        .duration(500)
        .attr("fill", d => {
            let match = yearData.find(r => matchCountry(d, r.country));
            if (match) {
                let perf = match.performance;
                return colorScale[perf] || colorScale.default;
            }
            return colorScale.default;
        });
}

// =============================================================
// Matching helpers
// =============================================================

function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function matchCountry(feature, name) {
    if (!name) return false;
    let geoName = feature.properties.name || feature.properties.NAME;
    let override = nameOverrides[name] || name;
    return normalize(geoName) === normalize(override);
}

// =============================================================
// Tooltip handlers
// =============================================================

function showTooltip(event, d) {
    let currentYear = +yearSlider.property("value"),
        yearData = qualifiedByYear.get(currentYear) || [],
        match = yearData.find(r => matchCountry(d, r.country)),
        countryName = d.properties.name;

    let html = `<strong>${countryName}</strong>`;
    if (match) {
        html += `<div><em>${match.performance}</em></div>`;
    } else {
        html += `<div>Not qualified</div>`;
    }
    tooltip.html(html).style("display", "block");
    moveTooltip(event);
}

function moveTooltip(event) {
    tooltip.style("left", (event.pageX - 100) + "px")
            .style("top", (event.pageY - 120) + "px");
}

function hideTooltip() {
    tooltip.style("display", "none");
}

// =============================================================
// Slider, play controls
// =============================================================

yearSlider.on("input", function() {
    updateMap(+this.value);
});

let playTimer = null;

playBtn.on("click", function() {
    let playing = this.getAttribute("aria-pressed") === "true";
    if (playing) { stopPlay() } else { startPlay() };
});

function startPlay() {
    playBtn.attr("aria-pressed", "true").text("\u23f8");
    let currentIndex = allYears.indexOf(+yearSlider.property("value"));
    playTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % allYears.length;
        let year = allYears[currentIndex];
        yearSlider.property("value", year);
        updateMap(year);
    }, 1200);
}

function stopPlay() {
    playBtn.attr("aria-pressed", "false").text("\u25b6");
    clearInterval(playTimer);
}
