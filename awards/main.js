
const worldCupVideos = {
  '1930': '3gELBavbzWQ',
  '1934': 'EBwZv0eFrCM',
  '1938': 'dbJIqjny2Jk',
  '1950': 'Pu1WanatiAM',
  '1954': '7KQc2W8DNog',
  '1958': 'JE2xPzeSiBc',
  '1962': 'FnV_ezpSMI0',
  '1966': 'FMDuHPvNtgg',
  '1970': 'kBJVZ5k-F3M',
  '1974': 'qSznZ9spb6A',
  '1978': '2EwfHjbeNV8',
  '1982': 'Tv4SDyOBB9E',
  '1986': 'f2_VbbIq6Hw',
  '1990': 'hu1meVUoIKQ',
  '1994': 'pLPM_JSbGvI',
  '1998': 'tmjFa9LB7Pg',
  '2002': 'O8dUhMGtUtw',
  '2006': 'Nlsm0RlC8zI',
  '2010': 'aKSHgMqCwbQ',
  '2014': 'ffAYByv2pLc',
  '2018': 'GrsEAvRerTg',
  '2022': 'zhEWqfP6V_w'
};

function codeToFlag(code) {
  if (!code || code.length !== 3) return '';
  
  const countryMap = {
    'ARG': 'AR', 'URY': 'UY', 'USA': 'US', 'CSK': 'CZ', 'DEU': 'DE', 'ITA': 'IT',
    'BRA': 'BR', 'HUN': 'HU', 'ESP': 'ES', 'AUT': 'AT', 'FRA': 'FR', 'SUN': 'RU',
    'CHL': 'CL', 'YUG': 'RS', 'PRT': 'PT', 'ENG': 'GB', 'POL': 'PL', 'NLD': 'NL',
    'PER': 'PE', 'CHE': 'CH', 'DNK': 'DK', 'BEL': 'BE', 'CMR': 'CM', 'BGR': 'BG',
    'RUS': 'RU', 'SWE': 'SE', 'HRV': 'HR', 'KOR': 'KR', 'COL': 'CO'
  };
  
  const iso2 = countryMap[code] || '';
  if (!iso2) return '';
  
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 127397 + c.charCodeAt()));
}

function getHostCountry(year) {
  const hosts = {
    '1930': 'Uruguay', '1934': 'Italy', '1938': 'France', '1950': 'Brazil',
    '1954': 'Switzerland', '1958': 'Sweden', '1962': 'Chile', '1966': 'England',
    '1970': 'Mexico', '1974': 'West Germany', '1978': 'Argentina', '1982': 'Spain',
    '1986': 'Mexico', '1990': 'Italy', '1994': 'United States', '1998': 'France',
    '2002': 'South Korea/Japan', '2006': 'Germany', '2010': 'South Africa',
    '2014': 'Brazil', '2018': 'Russia', '2022': 'Qatar'
  };
  return hosts[year] || '';
}

function getFinalResult(year) {
  const finals = {
    '1930': 'Uruguay 4-2 Argentina',
    '1934': 'Italy 2-1 Czechoslovakia',
    '1938': 'Italy 4-2 Hungary',
    '1950': 'Uruguay 2-1 Brazil',
    '1954': 'West Germany 3-2 Hungary',
    '1958': 'Brazil 5-2 Sweden',
    '1962': 'Brazil 3-1 Czechoslovakia',
    '1966': 'England 4-2 West Germany',
    '1970': 'Brazil 4-1 Italy',
    '1974': 'West Germany 2-1 Netherlands',
    '1978': 'Argentina 3-1 Netherlands',
    '1982': 'Italy 3-1 West Germany',
    '1986': 'Argentina 3-2 West Germany',
    '1990': 'West Germany 1-0 Argentina',
    '1994': 'Brazil 0-0 Italy (3-2 pens)',
    '1998': 'France 3-0 Brazil',
    '2002': 'Brazil 2-0 Germany',
    '2006': 'Italy 1-1 France (5-3 pens)',
    '2010': 'Spain 1-0 Netherlands',
    '2014': 'Germany 1-0 Argentina',
    '2018': 'France 4-2 Croatia',
    '2022': 'Argentina 3-3 France (4-2 pens)'
  };
  return finals[year] || 'Final match';
}

// Load data
d3.csv("data/data.csv").then(awardData => {
  awardData.forEach(d => d.Year = d["Tournament Name"].split(" ")[0]);
  const grouped = d3.group(awardData, d => d.Year);

  const container = d3.select("#years-container");

  // Sort years in ascending order (1930 first)
  const sortedYears = Array.from(grouped.keys()).sort((a, b) => a - b);

  sortedYears.forEach(year => {
    const yearBox = container.append("div")
      .attr("class", "year-box")
      .style("animation-delay", `${sortedYears.indexOf(year) * 0.1}s`);
    
    const header = yearBox.append("div").attr("class", "year-header");
    header.append("div").attr("class", "year-title").text(year);
    header.append("div").attr("class", "year-subtitle").text(getHostCountry(year));

    // Create content container
    const content = yearBox.append("div").attr("class", "year-content");

    // Awards container (this will hold the scrollable awards)
    const awardsContainer = content.append("div").attr("class", "awards-container");

    // Awards list (scrollable)
    const list = awardsContainer.append("div").attr("class", "awards-list");

    const awards = grouped.get(year);
    awards.forEach(a => {
      const card = list.append("div")
        .attr("class", "award-card")
        .attr("data-award", a["Award Name"]);
      
      const awardLine = card.append("div").attr("class", "award-line");
      
      awardLine.append("span")
        .attr("class", "award-name")
        .text(a["Award Name"].replace("Golden", "🥇")
                          .replace("Silver", "🥈")
                          .replace("Bronze", "🥉")
                          .replace("Ball", "⚽")
                          .replace("Glove", "🧤") + ":");
      
      awardLine.append("span")
        .attr("class", "winner-name")
        .text(a["Name"]);
      
      awardLine.append("span")
        .attr("class", "country-flag")
        .text(codeToFlag(a["Team Code"]));
    });

    // Video section (always at bottom - outside the awards container)
    const videoSection = content.append("div").attr("class", "video-section");

    // Add final match highlight section with REAL YouTube thumbnails
    const videoId = worldCupVideos[year];
    if (videoId) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      const finalSection = videoSection.append("div")
        .attr("class", "best-goal-section");
      
      finalSection.append("div")
        .attr("class", "best-goal-title")
        .html('🏆 <span>Final Highlights</span>');
      
      const thumbnailContainer = finalSection.append("div")
        .attr("class", "thumbnail-container");
      
      // Create clickable thumbnail with REAL YouTube thumbnail
      const thumbnailLink = thumbnailContainer.append("a")
        .attr("href", videoUrl)
        .attr("target", "_blank")
        .attr("class", "thumbnail-link");
      
      thumbnailLink.append("img")
        .attr("src", `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
        .attr("alt", `${year} World Cup Final Highlights`)
        .attr("class", "thumbnail-image")
        .on("error", function() {
          // If thumbnail fails, show generic placeholder
          d3.select(this).style("display", "none");
          thumbnailLink.append("div")
            .attr("class", "generic-thumbnail")
            .html(`
              <div class="thumbnail-placeholder">
                <div class="world-cup-icon">🏆</div>
                <div class="thumbnail-text">${year} Final Highlights</div>
                <div class="play-button">▶</div>
              </div>
            `);
        });
      
      // Play button overlay
      thumbnailLink.append("div")
        .attr("class", "play-button")
        .html('▶');
      
      finalSection.append("div")
        .attr("class", "goal-description")
        .html(`<strong>${getFinalResult(year)}</strong><br>Click to watch on YouTube`);
    }
  });
});
