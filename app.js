let allCharactersData = [];
// Use a Set to remember which character IDs the user has checked, so state is not lost when filtering
const selectedIds = new Set(); 
const timelineColors = ["#ffb6c1", "#ff7f50", "#87cefa", "#98fb98", "#ffffb3"];

// --- DOM Elements Binding ---
const characterListDiv = document.getElementById('characterList');
const calculateBtn = document.getElementById('calculateBtn');
const resultSection = document.getElementById('resultSection');
const selectedCountDisplay = document.getElementById('selectedCountDisplay');
const filterTypeContainer = document.getElementById('filterTypeContainer');
const filterGroupContainer = document.getElementById('filterGroupContainer');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const clearCharactersBtn = document.getElementById('clearCharactersBtn');

// --- 1. Auto-fetch CSV Database ---
window.addEventListener('DOMContentLoaded', () => {
  fetch('character.csv')
    .then(response => {
      if (!response.ok) throw new Error("Failed to load character.csv");
      return response.text();
    })
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          allCharactersData = results.data.filter(char => char.character && char['AP cooldown']);
          
          // Automatically extract all Types and Groups from the data to generate checkbox options
          populateFilterOptions(allCharactersData);
          
          // Initial render of all characters
          renderCharacterList(allCharactersData);
        }
      });
    })
    .catch(error => {
      characterListDiv.innerHTML = `<div style="color: #ff6b6b; padding: 20px;">Failed to load database. Please ensure character.csv exists.</div>`;
      console.error(error);
    });
});

// --- 2. Filter Logic ---
function populateFilterOptions(data) {
  const types = new Set();
  const groups = new Set();

  data.forEach(char => {
    if (char.Type) types.add(String(char.Type).trim());
    if (char.group) {
      const groupArray = String(char.group).split(',');
      groupArray.forEach(g => groups.add(g.trim()));
    }
  });

  // Dynamically generate Type checkboxes
  types.forEach(type => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${type}" class="filter-type"> ${type}`;
    filterTypeContainer.appendChild(label);
  });

  // Dynamically generate Group checkboxes
  groups.forEach(group => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${group}" class="filter-group"> ${group}`;
    filterGroupContainer.appendChild(label);
  });

  // Bind event listeners to all dynamically generated (and hardcoded) filter checkboxes
  document.querySelectorAll('.filter-type, .filter-group, .filter-rarity').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  // Collect all currently checked values into arrays
  const selectedTypes = Array.from(document.querySelectorAll('.filter-type:checked')).map(cb => cb.value);
  const selectedGroups = Array.from(document.querySelectorAll('.filter-group:checked')).map(cb => cb.value);
  const selectedRarities = Array.from(document.querySelectorAll('.filter-rarity:checked')).map(cb => cb.value);

  const filteredData = allCharactersData.filter(char => {
    // Check Type: If array length is 0 (none checked), treat as select all (true); else check if it includes the character's type
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(String(char.Type).trim());
    
    // Check Group: Supports multi-label groups (e.g., Fubuki)
    let matchGroup = false;
    if (selectedGroups.length === 0) {
      matchGroup = true;
    } else if (char.group) {
      const charGroups = String(char.group).split(',').map(g => g.trim());
      // As long as one of the character's groups is in the checked list, it's a match (some)
      matchGroup = charGroups.some(g => selectedGroups.includes(g));
    }

    // Check Rarity
    const matchRarity = selectedRarities.length === 0 || selectedRarities.includes(String(char.Rarity));
    
    return matchType && matchGroup && matchRarity;
  });

  renderCharacterList(filteredData);
}

// --- Clear All Filters Button Logic ---
clearFiltersBtn.addEventListener('click', () => {
  // Find all filter checkboxes and uncheck them
  document.querySelectorAll('.filter-type, .filter-group, .filter-rarity').forEach(cb => {
    cb.checked = false;
  });
  
  // Re-run the filter logic (since 0 checkboxes are checked, it will display all characters)
  applyFilters();
});

// --- Clear All Characters Button Logic ---
clearCharactersBtn.addEventListener('click', () => {
  // 1. Clear the JavaScript memory set
  selectedIds.clear();
  
  // 2. Uncheck all character checkboxes currently visible in the UI
  document.querySelectorAll('.character-card input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  
  // 3. Reset the selected count display to 0
  selectedCountDisplay.innerText = '0';
});

// --- 3. Render Character List and State Memory ---
function renderCharacterList(characters) {
  characterListDiv.innerHTML = '';
  
  if (characters.length === 0) {
    characterListDiv.innerHTML = `<div style="padding: 20px; color: #aaa;">No characters match the selected filters.</div>`;
    return;
  }

  characters.forEach(char => {
    const stars = '★'.repeat(char.Rarity || 3) + '☆'.repeat(5 - (char.Rarity || 3));
    const label = document.createElement('label');
    label.className = 'character-card';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = char.id;
    // Check if this ID is already in the selected list
    checkbox.checked = selectedIds.has(char.id); 

    // Listen for checkbox state changes
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedIds.add(char.id);
      } else {
        selectedIds.delete(char.id);
      }
      selectedCountDisplay.innerText = selectedIds.size;
    });

    const infoDiv = document.createElement('div');
    infoDiv.className = 'char-info';
    infoDiv.innerHTML = `
      <span class="char-name">${char.character} <span class="rarity-star">${stars}</span></span>
      <span class="char-outfit">Outfit: ${char.outfit} | Group: ${char.group}</span>
      <span class="char-stats">⏱️ CD: ${char['AP cooldown']}s | ⏳ Duration: ${char['AP duration']}s</span>
    `;
    
    label.appendChild(checkbox);
    label.appendChild(infoDiv);
    characterListDiv.appendChild(label);
  });
}

// --- 4. Core Optimization Algorithm (Includes deep copy fix & flexible talent allocation) ---
function getCombinations(array, k) {
  const results = [];
  function helper(start, currentCombo) {
    if (currentCombo.length === k) { results.push([...currentCombo]); return; }
    for (let i = start; i < array.length; i++) {
      currentCombo.push(array[i]);
      helper(i + 1, currentCombo);
      currentCombo.pop();
    }
  }
  helper(0, []);
  return results;
}

function getCharacterIntervals(cooldown, duration, hasTalent, songDuration) {
  const actualCooldown = hasTalent ? cooldown * 0.96 : cooldown;
  const intervals = [];
  let triggerTime = actualCooldown;
  while (triggerTime < songDuration) {
    const endTime = Math.min(triggerTime + duration, songDuration);
    intervals.push([triggerTime, endTime]);
    triggerTime += actualCooldown;
  }
  return intervals;
}

function calculateTotalCoverage(intervals) {
  if (intervals.length === 0) return 0;
  const copiedIntervals = intervals.map(interval => [...interval]);
  copiedIntervals.sort((a, b) => a[0] - b[0]);
  const merged = [copiedIntervals[0]];
  for (let i = 1; i < copiedIntervals.length; i++) {
    const last = merged[merged.length - 1];
    const current = copiedIntervals[i];
    if (current[0] <= last[1]) last[1] = Math.max(last[1], current[1]);
    else merged.push(current);
  }
  return merged.reduce((total, interval) => total + (interval[1] - interval[0]), 0);
}

function findBestTeam(characterPool, talentPoints, songDuration) {
  const teamCombinations = getCombinations(characterPool, 5);
  let bestResult = { coverage: 0, coveragePercent: 0, team: [] };

  for (const team of teamCombinations) {
    const usableTalents = Math.min(talentPoints, 5);
    
    let allTalentDistributions = [];
    for (let k = 0; k <= usableTalents; k++) {
      allTalentDistributions.push(...getCombinations(team, k));
    }

    for (const boostedCharacters of allTalentDistributions) {
      const boostedIds = new Set(boostedCharacters.map(c => c.id));
      let allIntervals = [];
      let currentTimelineData = [];

      team.forEach((char, index) => {
        const hasTalent = boostedIds.has(char.id);
        const charIntervals = getCharacterIntervals(char['AP cooldown'], char['AP duration'], hasTalent, songDuration);
        allIntervals.push(...charIntervals);
        
        currentTimelineData.push({
          name: char.character,
          color: timelineColors[index % timelineColors.length],
          hasTalent: hasTalent,
          intervals: charIntervals
        });
      });

      const totalCoverage = calculateTotalCoverage(allIntervals);
      if (totalCoverage > bestResult.coverage) {
        bestResult = {
          coverage: Number(totalCoverage.toFixed(2)),
          coveragePercent: Number(((totalCoverage / songDuration) * 100).toFixed(2)),
          team: currentTimelineData
        };
      }
    }
  }
  return bestResult;
}

// --- 5. Trigger Calculation & Chart Rendering ---
calculateBtn.addEventListener('click', () => {
  const songDuration = Number(document.getElementById('songDuration').value);
  const talentPoints = Number(document.getElementById('talentPoints').value);
  
  if (selectedIds.size < 5) {
    alert(`You have only selected ${selectedIds.size} characters. Please select at least 5!`);
    return;
  }

  // Fetch the actual character entities checked by the user
  const selectedCharacters = allCharactersData.filter(char => selectedIds.has(char.id));

  calculateBtn.innerText = "Calculating, please wait...";
  
  setTimeout(() => {
    const bestTeam = findBestTeam(selectedCharacters, talentPoints, songDuration);
    
    document.getElementById('summary-container').innerHTML = `
      Duration: ${songDuration}s | Total Talent Points: ${talentPoints}<br>
      Max Coverage Time: <span>${bestTeam.coverage}s</span> <br>
      Overall Coverage: <span>${bestTeam.coveragePercent}%</span>
    `;

    const timelineWrapper = document.getElementById('timeline-wrapper');
    timelineWrapper.innerHTML = '';

    bestTeam.team.forEach(char => {
      const row = document.createElement('div');
      row.className = 'track-row';

      const talentHTML = char.hasTalent ? `<span class="talent-badge">+4%</span>` : '';
      const infoDiv = document.createElement('div');
      infoDiv.className = 'track-char-info';
      infoDiv.innerHTML = `${char.name} ${talentHTML}`;

      const trackDiv = document.createElement('div');
      trackDiv.className = 'track';

      char.intervals.forEach(interval => {
        const start = interval[0];
        const duration = interval[1] - interval[0];
        const bar = document.createElement('div');
        bar.className = 'skill-bar';
        bar.style.left = `${(start / songDuration) * 100}%`;
        bar.style.width = `${(duration / songDuration) * 100}%`;
        bar.style.backgroundColor = char.color;
        bar.title = `Activation: ${start.toFixed(2)}s ~ ${interval[1].toFixed(2)}s`;
        trackDiv.appendChild(bar);
      });

      row.appendChild(infoDiv);
      row.appendChild(trackDiv);
      timelineWrapper.appendChild(row);
    });

    const axis = document.createElement('div');
    axis.className = 'axis';
    for (let i = 0; i <= songDuration; i += (songDuration >= 200 ? 30 : 15)) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${(i / songDuration) * 100}%`;
      tick.innerText = `${i}s`;
      axis.appendChild(tick);
    }
    timelineWrapper.appendChild(axis);

    resultSection.style.display = 'block';
    calculateBtn.innerText = "Calculate Best 5-Member Team 🚀";
  }, 50); 
});