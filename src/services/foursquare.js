// Foursquare Places API integration with offline fallback simulation

const FOURSQUARE_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;

// Predefined local database of real venues for Phoenix and New York zones
export const MOCK_VENUES = [
  // Phoenix - Downtown
  {
    fsq_id: "venue_cobra",
    name: "Cobra Arcade Bar",
    address: "801 N 2nd St",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "801 N 2nd St, Phoenix, AZ 85004"
  },
  {
    fsq_id: "venue_valley",
    name: "Valley Bar",
    address: "130 N Central Ave",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "130 N Central Ave, Phoenix, AZ 85004"
  },
  {
    fsq_id: "venue_lost",
    name: "The Lost Leaf",
    address: "914 N 5th St",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "914 N 5th St, Phoenix, AZ 85004"
  },
  {
    fsq_id: "venue_linger",
    name: "Linger Longer Lounge",
    address: "6522 N 16th St",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "6522 N 16th St, Phoenix, AZ 85016"
  },
  // Phoenix - Tempe
  {
    fsq_id: "venue_caseys",
    name: "Casey Moore's Oyster House",
    address: "850 S Ash Ave",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "850 S Ash Ave, Tempe, AZ 85281"
  },
  {
    fsq_id: "venue_yucca",
    name: "Yucca Tap Room",
    address: "29 W Southern Ave",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "29 W Southern Ave, Tempe, AZ 85282"
  },
  {
    fsq_id: "venue_sunbar",
    name: "Sunbar Tempe",
    address: "24 W 5th St",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "24 W 5th St, Tempe, AZ 85281"
  },
  // Phoenix - Old Town
  {
    fsq_id: "venue_bottled",
    name: "Bottled Blonde",
    address: "7340 E Indian Plaza",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "7340 E Indian Plaza, Scottsdale, AZ 85251"
  },
  {
    fsq_id: "venue_riot",
    name: "Riot House",
    address: "4425 N Saddlebag Trail",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "4425 N Saddlebag Trail, Scottsdale, AZ 85251"
  },
  {
    fsq_id: "venue_coach",
    name: "Coach House",
    address: "7011 E Indian School Rd",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "7011 E Indian School Rd, Scottsdale, AZ 85251"
  },
  // New York - Manhattan
  {
    fsq_id: "venue_pdt",
    name: "Please Don't Tell (PDT)",
    address: "113 St Marks Pl",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "113 St Marks Pl, New York, NY 10009"
  },
  {
    fsq_id: "venue_deathco",
    name: "Death & Co",
    address: "433 E 6th St",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "433 E 6th St, New York, NY 10009"
  },
  {
    fsq_id: "venue_mcsorleys",
    name: "McSorley's Old Ale House",
    address: "15 E 7th St",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "15 E 7th St, New York, NY 10003"
  },
  // New York - Brooklyn
  {
    fsq_id: "venue_union",
    name: "Union Pool",
    address: "484 Union Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "484 Union Ave, Brooklyn, NY 11211"
  },
  {
    fsq_id: "venue_brooklynbowl",
    name: "Brooklyn Bowl",
    address: "61 Wythe Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "61 Wythe Ave, Brooklyn, NY 11249"
  },
  {
    fsq_id: "venue_houseofyes",
    name: "House of Yes",
    address: "2 Wyckoff Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "2 Wyckoff Ave, Brooklyn, NY 11237"
  }
];

/**
 * Searches Foursquare Places API. Falls back to mock data if key is missing or call fails.
 * @param {string} query Search terms (venue name)
 * @param {string} filterCity Optional city filter
 * @returns {Promise<Array>} List of venues with id, name, address, city, zone
 */
export async function searchVenues(query, filterCity = "") {
  const cleanQuery = (query || "").trim().toLowerCase();

  // If no API key or default dummy key, use simulated search
  if (!FOURSQUARE_API_KEY || FOURSQUARE_API_KEY === "YOUR_FOURSQUARE_API_KEY") {
    console.log(`[Foursquare API] Key not configured. Performing offline simulation search for: "${query}"`);
    return getOfflineSearchResults(cleanQuery, filterCity);
  }

  try {
    // Categories: Nightlife (10032), Dining and Drinking (13000)
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&categories=13000,10032&limit=10`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: FOURSQUARE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Map Foursquare results to our layout schema
    return data.results.map(place => {
      // Deduce zone based on locality or assign a generic one
      const city = place.location.locality || "Phoenix";
      const address = place.location.address || "No Address Provided";
      
      // Auto-assign zone based on address/name or defaults
      let zone = "Downtown";
      if (city.toLowerCase() === "phoenix" || city.toLowerCase() === "scottsdale" || city.toLowerCase() === "tempe") {
        const lowerName = place.name.toLowerCase();
        const lowerAddress = address.toLowerCase();
        if (lowerAddress.includes("ash") || lowerAddress.includes("tempe") || lowerName.includes("tempe")) {
          zone = "Tempe";
        } else if (lowerAddress.includes("indian school") || lowerAddress.includes("saddlebag") || lowerAddress.includes("scottsdale") || lowerName.includes("blonde")) {
          zone = "Old Town";
        }
      } else if (city.toLowerCase() === "new york" || city.toLowerCase() === "brooklyn") {
        const lowerAddress = address.toLowerCase();
        if (lowerAddress.includes("brooklyn") || lowerAddress.includes("union ave") || lowerAddress.includes("wythe") || lowerAddress.includes("wyckoff")) {
          zone = "Brooklyn";
        } else {
          zone = "Manhattan";
        }
      }

      return {
        fsq_id: place.fsq_id,
        name: place.name,
        address: address,
        city: city,
        zone: zone,
        formatted_address: place.location.formatted_address || `${address}, ${city}`
      };
    });

  } catch (err) {
    console.warn("Foursquare fetch failed, falling back to local simulation database:", err);
    return getOfflineSearchResults(cleanQuery, filterCity);
  }
}

// Local mock filter search function
function getOfflineSearchResults(query, filterCity) {
  let results = MOCK_VENUES;
  
  if (filterCity) {
    results = results.filter(v => v.city.toLowerCase() === filterCity.toLowerCase());
  }

  if (query) {
    results = results.filter(v => 
      v.name.toLowerCase().includes(query) || 
      v.zone.toLowerCase().includes(query) ||
      v.address.toLowerCase().includes(query)
    );
  }

  return Promise.resolve(results);
}
