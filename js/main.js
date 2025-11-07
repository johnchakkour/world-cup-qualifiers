// =============================================================
// FIFA World Cup Qualifiers Visualization
// =============================================================

const qualifiersCsv = "fifa_qualifiers.csv";
const worldGeoJSONUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// =============================================================
// Color scale — performance --> color mapping
// =============================================================

let colorScale = {
    "champion": "#fef720",
    "final": "silver",
    "runner-up": "silver",
    "third place": "#cd7f32",
    "semi-finals": "#1bf118",
    "semi finals": "#1bf118",
    "quarter-finals": "#31db92",
    "quarter finals": "#31db92",
    "round of 16": "#27bbe0",
    "group stage": "#1c6ff8",
    "final round": "#1bf118",
    "second group stage": "#31db92",
    "default": "transparent"
};

// Taking into account hyphens in "semi-finals" and "quarter-finals"
let normalizedColorScale = {};
for (let key in colorScale) {
    normalizedColorScale[normalize(key)] = colorScale[key];
}

let strokeColor = "dimgrey";

// Name overrides for inconsistent country naming between GeoJSON and CSV files
let nameOverrides = {
    "Czechoslovakia": "Czech Republic",
    "Dutch East Indies": "Indonesia",
    "Soviet Union": "Russia",
    "Serbia": "Republic of Serbia",
    "Serbia and Montenegro": "Republic of Serbia",
    "United States": "USA",
    "West Germany": "Germany",
    "Yugoslavia": "Republic of Serbia",
    "Zaire": "Democratic Republic of the Congo"
};

// =============================================================
// D3 setup
// =============================================================

let svg = d3.select("#mapSvg"),
    width = +svg.attr("viewBox").split(" ")[2],
    height = +svg.attr("viewBox").split(" ")[3];

let tooltip = d3.select("#tooltip"),
    yearSlider = d3.select("#yearSlider"),
    yearLabel = d3.select("#yearLabel"),
    playBtn = d3.select("#playBtn");

let worldData, qualifiersData, allYears;
let qualifiedByYear = new Map();

// Projection & path
let projection = d3.geoNaturalEarth1()
                    .scale(261.5)
                    .translate([width / 2.5, height / 1.75]);
let path = d3.geoPath().projection(projection);

// =============================================================
// Data loading
// =============================================================

Promise.all([
    d3.json(worldGeoJSONUrl),
    d3.csv(qualifiersCsv, d => ({
        year: +d.tournament_year,
        country: d.team_name?.trim(),
        performance: d.performance?.trim(),
        topScorer: d.top_scorer?.trim(),
        topScorerGoals: d.top_scorer_goals?.trim()
        }))
    ]).then(([geo, data]) => {
    worldData = geo;
    qualifiersData = data.filter(d => d.country && !isNaN(d.year));

    allYears = Array.from(new Set(qualifiersData.map(d => d.year))).sort((a, b) => a - b);

    // Slider setup: discrete every 4 years
    yearSlider.attr("min", allYears[0])
                .attr("max", allYears[allYears.length - 1])
                .attr("step", 4)
                .property("value", allYears[0]);
    yearLabel.text(allYears[0]);

    qualifiedByYear = d3.group(qualifiersData, d => d.year);

    drawMap();
    updateMap(+yearSlider.property("value"));
    buildLegend();
});

// =============================================================
// Draw and update map
// =============================================================

let hoveredFeature = null;          // country currently hovered
let lastMousePos = { x: 0, y: 0 };  // remember last mouse position

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
        .on("mouseenter", function(event, d) {
            hoveredFeature = d;
            lastMousePos = { x: event.pageX, y: event.pageY };
            showTooltip(event, d);
        })
        .on("mousemove", function(event) {
            lastMousePos = { x: event.pageX, y: event.pageY };
            moveTooltip(event);
        })
        .on("mouseleave", function() {
            hoveredFeature = null;
            hideTooltip();
        });
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
                let perf = normalize(match.performance);
                return normalizedColorScale[perf] || colorScale.default;
            }
            return colorScale.default;
        })
        .on("end", () => {
            // Keep tooltip in sync if hovering
            if (hoveredFeature) {
                let fakeEvent = { pageX: lastMousePos.x, pageY: lastMousePos.y };
                showTooltip(fakeEvent, hoveredFeature);
            }
        });
} 

// =============================================================
// Country name matching helpers
// =============================================================

function normalize(s) {
    return s?.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function matchCountry(feature, name) {
    if (!name) return false;
    let geoName = feature.properties.name || feature.properties.NAME;
    let override = nameOverrides[name] || name;
    return normalize(geoName) === normalize(override);
}

// =============================================================
// Country flag emoji helper
// =============================================================
function getFlagEmoji(countryName) {
    // ISO 3166 country codes for key matches
    let flags = {
        "Argentina": "🇦🇷",
        "Australia": "🇦🇺",
        "Austria": "🇦🇹",
        "Belgium": "🇧🇪",
        "Brazil": "🇧🇷",
        "Bolivia": "🇧🇴",
        "Cameroon": "🇨🇲",
        "Canada": "🇨🇦",
        "Chile": "🇨🇱",
        "China": "🇨🇳",
        "Colombia": "🇨🇴",
        "Costa Rica": "🇨🇷",
        "Croatia": "🇭🇷",
        "Czech Republic": "🇨🇿",
        "Democratic Republic of the Congo": "🇨🇩",
        "Denmark": "🇩🇰",
        "Ecuador": "🇪🇨",
        "Egypt": "🇪🇬",
        "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "Finland": "🇫🇮",
        "France": "🇫🇷",
        "Germany": "🇩🇪",
        "Ghana": "🇬🇭",
        "Greece": "🇬🇷",
        "Haiti": "🇭🇹",
        "Hungary": "🇭🇺",
        "Iceland": "🇮🇸",
        "Iran": "🇮🇷",
        "Iraq": "🇮🇶",
        "Ireland": "🇮🇪",
        "Italy": "🇮🇹",
        "Japan": "🇯🇵",
        "Mexico": "🇲🇽",
        "Morocco": "🇲🇦",
        "Netherlands": "🇳🇱",
        "Nigeria": "🇳🇬",
        "Norway": "🇳🇴",
        "Paraguay": "🇵🇾",
        "Peru": "🇵🇪",
        "Poland": "🇵🇱",
        "Portugal": "🇵🇹",
        "Qatar": "🇶🇦",
        "Republic of Serbia": "🇷🇸",
        "Romania": "🇷🇴",
        "Russia": "🇷🇺",
        "Saudi Arabia": "🇸🇦",
        "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
        "Senegal": "🇸🇳",
        "Slovakia": "🇸🇰",
        "Slovenia": "🇸🇮",
        "South Africa": "🇿🇦",
        "South Korea": "🇰🇷",
        "Spain": "🇪🇸",
        "Sweden": "🇸🇪",
        "Switzerland": "🇨🇭",
        "Tunisia": "🇹🇳",
        "Turkey": "🇹🇷",
        "Ukraine": "🇺🇦",
        "USA": "🇺🇸",
        "Uruguay": "🇺🇾",
        "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿"
    };

    return flags[countryName] || "";
}

// =============================================================
// Tooltip handlers
// =============================================================

function showTooltip(event, d) {
    let currentYear = +yearSlider.property("value");
    let yearData = qualifiedByYear.get(currentYear) || [];
    let match = yearData.find(r => matchCountry(d, r.country));
    let countryName = d.properties.name;
    let flag = getFlagEmoji(countryName);
    let html = `<strong>${countryName}${flag ? " " + flag : ""}</strong>`;

    if (match) {
        html += `<div><em>${match.performance}</em></div>`;
        if (match.topScorer) {
            html += `<div>Top scorer: ${match.topScorer}`;
            if (match.topScorerGoals) {
                let g = match.topScorerGoals;
                let label = g === "1" || g === 1 ? "goal" : "goals";
                html += ` (${g} ${label})`;
            }
            html += `</div>`;
        }
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
// Slider + play controls
// =============================================================

yearSlider.on("input", function() {
    updateMap(+this.value);
});

let playTimer = null;

playBtn.on("click", function() {
    let playing = this.getAttribute("aria-pressed") === "true";
    if (playing) stopPlay();
    else startPlay();
});

function startPlay() {
    playBtn.attr("aria-pressed", "true").text("\u23f8"); // Pause symbol
    let currentIndex = allYears.indexOf(+yearSlider.property("value"));
    playTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % allYears.length;
        const year = allYears[currentIndex];
        yearSlider.property("value", year);
        updateMap(year);
    }, 1200);
}

function stopPlay() {
    playBtn.attr("aria-pressed", "false").text("\u25b6"); // Play symbol
    clearInterval(playTimer);
}

// =============================================================
// Legend (dynamic, built from colorScale)
// =============================================================

function buildLegend() {
    let legendContainer = d3.select(".legend");
    legendContainer.selectAll("*").remove(); // clear existing

    const orderedKeys = [
        "champion", "runner-up", "third place", "semi-finals",
        "quarter-finals", "round of 16", "group stage"
    ];

    orderedKeys.forEach(k => {
        let color = colorScale[k];
        if (color) {
            legendContainer.append("div")
                                .html(`<span class="sw" style="background:
                    ${color}"></span>${k.replace(/\b\w/g, c => c.toUpperCase())}`);
        }
    });
}
