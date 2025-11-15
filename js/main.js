
// =============================================================
// FIFA World Cup Qualifiers Visualization
// =============================================================

const qualifiersCsv = "data/fifa_qualifiers.csv";
const awardsCsv = "data/awards.csv";
const worldGeoJSONUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

let awardsDataByYear = new Map();

// =============================================================
// Color scale — performance --> color mapping
// =============================================================

let colorScale = {
    "champion": "#fef720",
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

let normalizedColorScale = {};
for (let key in colorScale) {
    normalizedColorScale[normalize(key)] = colorScale[key];
}

let strokeColor = "dimgrey";

// Name overrides for inconsistent country naming
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
// Successor state logic (modern and historical)
// =============================================================

let successorCountries = {
    // USSR: all former republics
    "Soviet Union": [
        "Russia", "Ukraine", "Belarus", "Estonia", "Latvia", "Lithuania",
        "Moldova", "Armenia", "Azerbaijan", "Georgia",
        "Kazakhstan", "Kyrgyzstan", "Tajikstan", "Turkmenistan", "Uzbekistan"
    ],

    // Yugoslavia
    "Yugoslavia": [
        "Republic of Serbia", "Croatia", "Slovenia", "Bosnia and Herzegovina",
        "Macedonia", "Montenegro", "Kosovo"
    ],

    "Serbia and Montenegro": ["Republic of Serbia", "Montenegro", "Kosovo"],

    // Czechoslovakia → Czech Republic + Slovakia
    "Czechoslovakia": ["Czech Republic", "Slovakia"]
};

function getHistoricalName(modernName, year) {
    // Modern to historical name rules
    if (modernName === "Indonesia" && year < 1950) return "Dutch East Indies";
    if (modernName === "Democratic Republic of the Congo" && year < 1997) return "Zaire";
    if (modernName === "Swaziland" && year > 2017) return "Eswatini";
    if (modernName === "Burkina Faso" && year < 1984) return "Upper Volta";
    if (modernName === "Belize" && year < 1973) return "British Honduras";
    if (modernName === "Western Sahara" && year < 1976) return "Spanish Sahara";
    if (modernName === "Zimbabwe" && year < 1979) return "Rhodesia";
    if (modernName === "Djibouti" && year < 1967) return "French Somaliland";
    if (modernName === "Benin" && year < 1975) return "Dahomey";
    if (modernName === "Sri Lanka" && year < 1972) return "Ceylon";
    if (modernName === "United Arab Emirates" && year < 1971) return "Trucial States";
    if (modernName === "Bangladesh" && year < 1971) return "Pakistan";
    if (modernName === "Equatorial Guinea" && year < 1968) return "Spanish Guiana";
    if (modernName === "Syria" && year == 1958) return "United Arab Republic";
    if (modernName === "Egypt" && year == 1958) return "United Arab Republic";
    if (modernName === "Ghana" && year < 1957) return "Gold Coast";
    if (modernName === "Jordan" && year < 1949) return "Transjordan";
    if (modernName === "Israel" && year < 1948) return "Mandatory Palestine";
    if (modernName === "West Bank" && year < 1948) return "Mandatory Palestine";
    if (modernName === "West Bank" && year > 1947) return "Palestine";
    if (modernName === "Thailand" && year < 1939) return "Siam";
    if (modernName === "Iran" && year < 1937) return "Persia";

    // USSR republics before 1991
    let ussr = [
        "Russia", "Kazakhstan", "Kyrgyzstan", "Armenia", "Azerbaijan", "Belarus",
        "Estonia", "Georgia", "Latvia", "Lithuania", "Moldova", "Tajikstan",
        "Turkmenistan", "Ukraine", "Uzbekistan"
    ];
    if (ussr.includes(modernName) && year < 1991) return "Soviet Union";

    let czechoslovakia = ["Czech Republic", "Slovakia"];
    if (czechoslovakia.includes(modernName) && year < 1993) return "Czechoslovakia";

    let yugoslavia = [
        "Republic of Serbia", "Croatia", "Slovenia", "Bosnia and Herzegovina",
        "Macedonia", "Montenegro", "Kosovo"
    ]
    if (yugoslavia.includes(modernName) && year < 1991) return "Yugoslavia"

    if (modernName === "Macedonia" && year > 2018) return "North Macedonia";
    if (modernName === "Kosovo" && year < 2002) return "Yugoslavia";
    if (modernName === "Republic of Serbia" && year < 2002) return "Yugoslavia";
    if (modernName === "Montenegro" && year < 2002) return "Yugoslavia";
    if (modernName === "Kosovo" && year > 2002 && year < 2007) return "Serbia and Montenegro";
    if (modernName === "Republic of Serbia" && year > 2002 && year < 2007) return "Serbia and Montenegro";
    if (modernName === "Montenegro" && year > 2002 && year < 2007) return "Serbia and Montenegro";
    if (modernName === "Republic of Serbia") return "Serbia";

    return modernName;
}

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
    })),
    d3.csv(awardsCsv)
]).then(([geo, data, awards]) => {

    worldData = geo;
    qualifiersData = data.filter(d => d.country && !isNaN(d.year));

    allYears = Array.from(new Set(qualifiersData.map(d => d.year)))
                        .sort((a, b) => a - b);

    yearSlider
        .attr("min", allYears[0])
        .attr("max", allYears[allYears.length - 1])
        .attr("step", 4)
        .property("value", allYears[0]);

    yearLabel.text(allYears[0]);

    qualifiedByYear = d3.group(qualifiersData, d => d.year);

    awards.forEach(d => {
        let year = +d["Tournament Name"].split(" ")[0];
        if (!awardsDataByYear.has(year)) awardsDataByYear.set(year, []);
        awardsDataByYear.get(year).push(d);
    });

    drawMap();
    updateMap(+yearSlider.property("value"));
    buildLegend();
});

// =============================================================
// Draw map
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
        .attr("stroke-width", 0.6);

    bindTooltipEvents();
}

// =============================================================
// Helper functions
// =============================================================

function normalize(s) {
    return s?.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function matchCountry(geoName, csvName) {
    if (!csvName) return false;

    let override = nameOverrides[csvName] || csvName;
    return normalize(geoName) === normalize(override);
}

// Main fill logic for updateMap + tooltips
function countryQualifies(geoName, year) {
    let yearData = qualifiedByYear.get(year) || [];

    return yearData.find(r => {
        let override = nameOverrides[r.country] || r.country;

        // Direct match
        if (normalize(override) === geoName) return true;

        // Successor match
        if (successorCountries[r.country]) {
            return successorCountries[r.country].some(succ => {
                let succOverride = nameOverrides[succ] || succ;
                return normalize(succOverride) === geoName;
            });
        }
        return false;
    });
}

function fillForCountry(feature, year) {
    let geoName = normalize(feature.properties.name || feature.properties.NAME);
    let match = countryQualifies(geoName, year);

    if (match) {
        let perf = normalize(match.performance);
        return normalizedColorScale[perf] || "#transparent";
    }

    return "transparent";  // Never qualified
}

// =============================================================
// Update map (with robust tooltip refresh and rebindings)
// =============================================================

let hoveredFeature = null;
let lastMousePos = { x: 0, y: 0 };

function updateMap(year) {
    yearLabel.text(year);

    let paths = svg.selectAll(".countries path");

    paths.transition("fillTransition")
        .duration(500)
        .attr("fill", d => fillForCountry(d, year))
        .on("end", function(_, i, nodes) {
            if (i === nodes.length - 1 && hoveredFeature) {
                let fakeEvent = { pageX: lastMousePos.x, pageY: lastMousePos.y };
                showTooltip(fakeEvent, hoveredFeature);
            }
        });

    bindTooltipEvents();

    updateAwardsPanel(year);
}

// =============================================================
// Tooltip binding
// =============================================================

function bindTooltipEvents() {
    svg.selectAll(".countries path")
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

// =============================================================
// Tooltip renderer
// =============================================================

function showTooltip(event, d) {
    let year = +yearSlider.property("value");

    let geoName = normalize(d.properties.name || d.properties.NAME);
    let match = countryQualifies(geoName, year);

    let modernName = d.properties.name;
    let countryName = getHistoricalName(modernName, year);

    let html = `<strong>${countryName}</strong>`;

    if (match) {
        html += `<div><em>${match.performance}</em></div>`;
        if (match.topScorer) {
            let g = match.topScorerGoals;
            let label = g == 1 ? "goal" : "goals";
            html += `<div>Top scorer: ${match.topScorer} (${g} ${label})</div>`;
        }
    } else {
        html += `<div>Not qualified</div>`;
    }

    tooltip.html(html).style("display", "block");
    moveTooltip(event);
}

function moveTooltip(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 100) + "px");
}

function hideTooltip() {
    tooltip.style("display", "none");
}

// =============================================================
// Slider and play controls
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

// =============================================================
// Legend
// =============================================================

function buildLegend() {
    let legend = d3.select(".legend");
    legend.selectAll("*").remove();

    const orderedKeys = [
        "champion", "runner-up", "third place", "semi-finals",
        "quarter-finals", "round of 16", "group stage"
    ];

    orderedKeys.forEach(k => {
        let color = colorScale[k];
        if (color) {
            legend.append("div")
                .html(`<span class="sw" style="background:${color}"></span>${k}`);
        }
    });
}

// =============================================================
// Helpers
// =============================================================

// Map World Cup 1930–2022 to YouTube video IDs
const worldCupVideos = {
  '1930': '3gELBavbzWQ', '1934': 'EBwZv0eFrCM', '1938': 'dbJIqjny2Jk',
  '1950': 'Pu1WanatiAM', '1954': '7KQc2W8DNog', '1958': 'JE2xPzeSiBc',
  '1962': 'FnV_ezpSMI0', '1966': 'FMDuHPvNtgg', '1970': 'kBJVZ5k-F3M',
  '1974': 'qSznZ9spb6A', '1978': '2EwfHjbeNV8', '1982': 'Tv4SDyOBB9E',
  '1986': 'f2_VbbIq6Hw', '1990': 'hu1meVUoIKQ', '1994': 'pLPM_JSbGvI',
  '1998': 'tmjFa9LB7Pg', '2002': 'O8dUhMGtUtw', '2006': 'Nlsm0RlC8zI',
  '2010': 'aKSHgMqCwbQ', '2014': 'ffAYByv2pLc', '2018': 'GrsEAvRerTg',
  '2022': 'zhEWqfP6V_w'
};

// World Cup hosts
const worldCupHosts = {
  "1930": "Uruguay",
  "1934": "Italy",
  "1938": "France",
  "1950": "Brazil",
  "1954": "Switzerland",
  "1958": "Sweden",
  "1962": "Chile",
  "1966": "England",
  "1970": "Mexico",
  "1974": "West Germany",
  "1978": "Argentina",
  "1982": "Spain",
  "1986": "Mexico",
  "1990": "Italy",
  "1994": "United States",
  "1998": "France",
  "2002": "Japan, South Korea",
  "2006": "Germany",
  "2010": "South Africa",
  "2014": "Brazil",
  "2018": "Russia",
  "2022": "Qatar"
};

// World Cup final scorelines
const finalScores = {
  "1930": "Uruguay 4-2 Argentina",
  "1934": "Italy 2-1 Czechoslovakia",
  "1938": "Italy 4-2 Hungary",
  "1950": "Uruguay 2-1 Brazil",
  "1954": "West Germany 3-2 Hungary",
  "1958": "Brazil 5-2 Sweden",
  "1962": "Brazil 3-1 Czechoslovakia",
  "1966": "England 4-2 West Germany",
  "1970": "Brazil 4-1 Italy",
  "1974": "West Germany 2-1 Netherlands",
  "1978": "Argentina 3-1 Netherlands",
  "1982": "Italy 3-1 West Germany",
  "1986": "Argentina 3-2 West Germany",
  "1990": "West Germany 1-0 Argentina",
  "1994": "Brazil 0-0 Italy (3-2 pens)",
  "1998": "France 3-0 Brazil",
  "2002": "Brazil 2-0 Germany",
  "2006": "Italy 1-1 France (5-3 pens)",
  "2010": "Spain 1-0 Netherlands",
  "2014": "Germany 1-0 Argentina",
  "2018": "France 4-2 Croatia",
  "2022": "Argentina 3-3 France (4-2 pens)"
};

// Helper to convert 3-letter country codes to flag emojis
function codeToFlag(code) {
    if (!code || code.length !== 3) return '';
    const countryMap = {
        'ARG':'AR','URY':'UY','USA':'US','CSK':'CZ','DEU':'DE','ITA':'IT',
        'BRA':'BR','HUN':'HU','ESP':'ES','AUT':'AT','FRA':'FR','SUN':'RU',
        'CHL':'CL','YUG':'RS','PRT':'PT','ENG':'GB','POL':'PL','NLD':'NL',
        'PER':'PE','CHE':'CH','DNK':'DK','BEL':'BE','CMR':'CM','BGR':'BG',
        'RUS':'RU','SWE':'SE','HRV':'HR','KOR':'KR','COL':'CO'
    };
    const iso2 = countryMap[code] || '';
    if (!iso2) return '';
    return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 127397 + c.charCodeAt()));
}

// Update awards panel for a given year
function updateAwardsPanel(year) {
    let panel = d3.select("#awardsPanel"),
        content = d3.select("#awardsContent"),
        title = d3.select("#awardsYear");

    let host = worldCupHosts[String(year)];
    title.text(`${year} World Cup ${host}`)
        .style("font-weight", "500")
        .style("font-size", "1.2em")
    content.html(""); // clear previous content

    let awards = awardsDataByYear.get(year);
    if (!awards) {
        content.html("<p>No award data for this year.</p>");
        panel.classed("visible", true);
        return;
    }

    // Scrollable list of awards
    awards.forEach(a => {
        let card = content.append("div").attr("class","award-card");

        // Award name with emoji
        let awardName = a["Award Name"]
                          .replace("Golden Ball", "Golden Ball 🥇")
                          .replace("Silver Ball", "Silver Ball 🥈")
                          .replace("Bronze Ball", "Bronze Ball 🥉")
                          .replace("Golden Boot", "Golden Boot ⚽⚽⚽")
                          .replace("Silver Boot", "Silver Boot ⚽⚽")
                          .replace("Bronze Boot", "Bronze Boot ⚽")
                          .replace("Golden Glove", "Golden Glove 🧤");
        card.append("div").attr("class","award-name").html(`<em>${awardName}</em>`);

        // Winner name
        card.append("div").attr("class","award-winner").text(a["Name"] + " " + codeToFlag(a["Team Code"]));
    });

    // Add final match thumbnail
    let videoId = worldCupVideos[year];
    if (videoId) {
        let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        let videoCard = content.append("div").attr("class","award-card video-card");

        videoCard.append("div")
            .attr("class","video-title")
            .html("🏆 Final Highlights");

        let scoreline = finalScores[String(year)] || "";
        videoCard.append("div")
            .attr("class","final-scoreline")
            .style("font-size", "0.9em")
            .style("font-weight", "500")
            .style("margin-bottom", "4px")
            .style("margin-left", "40px")
            .text(scoreline);

        videoCard.append("a")
            .attr("href", videoUrl)
            .attr("target","_blank")
            .append("img")
            .attr("src", `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
            .attr("alt", `${year} World Cup Final Highlights`)
            .attr("class","thumbnail-image")
            .style("width","100%")
            .style("border-radius","6px")
            .style("margin-top","8px");
    }

    panel.classed("visible", true);
}

// =============================================================
// Draggable Awards Panel
// =============================================================

(function enableDragging() {
    const panel = document.getElementById("awardsPanel");

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // Mouse Down → start drag
    panel.addEventListener("mousedown", (e) => {
        isDragging = true;
        panel.classList.add("dragging");

        const rect = panel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        e.preventDefault();
    });

    // Mouse Move → drag
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // Optional: prevent dragging off-screen
        const maxLeft = window.innerWidth - panel.offsetWidth;
        const maxTop = window.innerHeight - panel.offsetHeight;

        newLeft = Math.max(0, Math.min(maxLeft, newLeft));
        newTop = Math.max(0, Math.min(maxTop, newTop));

        panel.style.left = newLeft + "px";
        panel.style.top = newTop + "px";
    });

    // Mouse Up → stop drag
    document.addEventListener("mouseup", () => {
        isDragging = false;
        panel.classList.remove("dragging");
    });
})();
