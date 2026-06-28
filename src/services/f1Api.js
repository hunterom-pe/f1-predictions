const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

export const fetchSchedule = async () => {
  try {
    const response = await fetch(`${JOLPICA_BASE}/current.json`);
    if (!response.ok) throw new Error("Failed to fetch schedule");
    const data = await response.json();
    return data.MRData.RaceTable.Races || [];
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return [];
  }
};

export const fetchQualifyingResult = async (round) => {
  try {
    const response = await fetch(`${JOLPICA_BASE}/current/${round}/qualifying.json`);
    if (!response.ok) throw new Error(`Failed to fetch qualifying for round ${round}`);
    const data = await response.json();
    const races = data.MRData.RaceTable.Races;
    if (races && races.length > 0) {
      const qResults = races[0].QualifyingResults;
      if (qResults && qResults.length > 0) {
        // Driver ID of the pole sitter
        return qResults[0].Driver;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching qualifying for round ${round}:`, error);
    return null;
  }
};

export const fetchRaceResult = async (round) => {
  try {
    const response = await fetch(`${JOLPICA_BASE}/current/${round}/results.json`);
    if (!response.ok) throw new Error(`Failed to fetch results for round ${round}`);
    const data = await response.json();
    const races = data.MRData.RaceTable.Races;
    if (races && races.length > 0) {
      const results = races[0].Results;
      if (results && results.length >= 3) {
        return {
          p1: results[0].Driver,
          p2: results[1].Driver,
          p3: results[2].Driver,
          allResults: results
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching race results for round ${round}:`, error);
    return null;
  }
};

// Helper to fetch list of all drivers for predictions dropdowns
export const fetchDrivers = async () => {
  try {
    const response = await fetch(`${JOLPICA_BASE}/current/drivers.json`);
    if (!response.ok) throw new Error("Failed to fetch drivers");
    const data = await response.json();
    return data.MRData.DriverTable.Drivers || [];
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return [];
  }
};
