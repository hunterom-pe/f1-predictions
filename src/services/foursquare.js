// Foursquare Places API integration with offline fallback simulation.
//
// The Foursquare API key is NOT shipped in the client bundle. Live searches are
// proxied through the `searchVenuesSecure` Cloud Function, which holds the key
// as a server secret. If the proxy is unavailable or returns nothing, we fall
// back to the offline venue catalog below.

// Predefined local database of real venues for Phoenix and New York zones
export const MOCK_VENUES = [
  // Phoenix - Downtown
  {
    fsq_id: "venue_cobra",
    name: "Cobra Arcade Bar",
    address: "801 N 2nd St",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "801 N 2nd St, Phoenix, AZ 85004",
    price: 2,
    rating: 8.7,
    categories: ["Arcade Bar", "Nightlife"],
    open_start: 16,
    open_end: 2,
    hours_display: "Open Daily 4 PM - 2 AM",
    amenities: ["Retro Arcades", "Outdoor Patio", "DJ Beats", "Credit Cards"]
  },
  {
    fsq_id: "venue_valley",
    name: "Valley Bar",
    address: "130 N Central Ave",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "130 N Central Ave, Phoenix, AZ 85004",
    price: 2,
    rating: 9.1,
    categories: ["Speakeasy", "Cocktail Lounge", "Music Venue"],
    open_start: 18,
    open_end: 2,
    hours_display: "Open Daily 6 PM - 2 AM",
    amenities: ["Basement Entry", "Live Stage", "Board Games", "Cozy Booths"]
  },
  {
    fsq_id: "venue_gracies",
    name: "Gracies Tax Bar",
    address: "711 N 7th Ave",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "711 N 7th Ave, Phoenix, AZ 85007",
    price: 1,
    rating: 8.5,
    categories: ["Dive Bar", "Neighborhood Spot"],
    open_start: 16,
    open_end: 2,
    hours_display: "Open Daily 4 PM - 2 AM",
    amenities: ["Huge Patio", "Jukebox", "Cheap Beer", "Late Night Menu"]
  },
  {
    fsq_id: "venue_linger",
    name: "Linger Longer Lounge",
    address: "6522 N 16th St",
    city: "Phoenix",
    zone: "Downtown",
    formatted_address: "6522 N 16th St, Phoenix, AZ 85016",
    price: 2,
    rating: 8.2,
    categories: ["Lounge", "Neighborhood Pub"],
    open_start: 16,
    open_end: 0,
    hours_display: "Open 4 PM - Midnight",
    amenities: ["Outdoor Courtyard", "DJs", "Trivia Nights", "Pool Table"]
  },
  // Phoenix - Tempe
  {
    fsq_id: "venue_caseys",
    name: "Casey Moore's Oyster House",
    address: "850 S Ash Ave",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "850 S Ash Ave, Tempe, AZ 85281",
    price: 2,
    rating: 8.9,
    categories: ["Irish Pub", "Beer Garden", "Seafood Restaurant"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Haunted Vibe", "Spacious Garden", "Local Drafts", "Historic Building"]
  },
  {
    fsq_id: "venue_yucca",
    name: "Yucca Tap Room",
    address: "29 W Southern Ave",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "29 W Southern Ave, Tempe, AZ 85282",
    price: 1,
    rating: 8.6,
    categories: ["Dive Bar", "Music Venue", "Arcade"],
    open_24h: true,
    open_start: 0,
    open_end: 0,
    hours_display: "Open 24 Hours / Live Shows 6 PM - 2 AM",
    amenities: ["Live Bands", "Pinball Arcade", "Craft Beer", "No Cover Charge"]
  },
  {
    fsq_id: "venue_sunbar",
    name: "Sunbar Tempe",
    address: "24 W 5th St",
    city: "Phoenix",
    zone: "Tempe",
    formatted_address: "24 W 5th St, Tempe, AZ 85281",
    price: 2,
    rating: 8.0,
    categories: ["Sports Bar", "Dance Club"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Huge Patio", "Big Screens", "DJs", "College Crowd"]
  },
  // Phoenix - Old Town
  {
    fsq_id: "venue_bottled",
    name: "Bottled Blonde",
    address: "7340 E Indian Plaza",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "7340 E Indian Plaza, Scottsdale, AZ 85251",
    price: 3,
    rating: 7.8,
    categories: ["Beer Garden", "Pizzeria", "Nightclub"],
    open_start: 15,
    open_end: 2,
    hours_display: "Open Daily 3 PM - 2 AM",
    amenities: ["Lively Atmosphere", "Outdoor Seating", "Valet Parking", "High Energy"]
  },
  {
    fsq_id: "venue_riot",
    name: "Riot House",
    address: "4425 N Saddlebag Trail",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",
    price: 3,
    rating: 7.9,
    categories: ["Nightclub", "Lounge"],
    open_start: 21,
    open_end: 2,
    hours_display: "Open Daily 9 PM - 2 AM",
    amenities: ["DJs", "VIP Bottle Service", "Light Show", "Trendy Crowd"]
  },
  {
    fsq_id: "venue_coach",
    name: "Coach House",
    address: "7011 E Indian School Rd",
    city: "Phoenix",
    zone: "Old Town",
    formatted_address: "7011 E Indian School Rd, Scottsdale, AZ 85251",
    price: 1,
    rating: 8.4,
    categories: ["Dive Bar", "Historic Tavern"],
    open_start: 10,
    open_end: 2,
    hours_display: "Open Daily 10 AM - 2 AM",
    amenities: ["Christmas Lights Year-Round", "Historic Vibe", "Outdoor Patio", "Cheap Drinks"]
  },
  // New York - Manhattan
  {
    fsq_id: "venue_pdt",
    name: "Please Don't Tell (PDT)",
    address: "113 St Marks Pl",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "113 St Marks Pl, New York, NY 10009",
    price: 3,
    rating: 9.3,
    categories: ["Speakeasy", "Cocktail Bar"],
    open_start: 17,
    open_end: 2,
    hours_display: "Open Daily 5 PM - 2 AM",
    amenities: ["Phone Booth Entrance", "Hot Dogs", "Reservations Required", "Intimate Spot"]
  },
  {
    fsq_id: "venue_deathco",
    name: "Death & Co",
    address: "433 E 6th St",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "433 E 6th St, New York, NY 10009",
    price: 4,
    rating: 9.5,
    categories: ["Cocktail Lounge", "High-End Cocktail Bar"],
    open_start: 18,
    open_end: 2,
    hours_display: "Open Daily 6 PM - 2 AM",
    amenities: ["Craft Cocktails", "Intimate Setting", "Strict Door Limits", "Award-Winning Menu"]
  },
  {
    fsq_id: "venue_mcsorleys",
    name: "McSorley's Old Ale House",
    address: "15 E 7th St",
    city: "New York",
    zone: "Manhattan",
    formatted_address: "15 E 7th St, New York, NY 10003",
    price: 1,
    rating: 9.0,
    categories: ["Historic Irish Pub", "Tavern"],
    open_start: 11,
    open_end: 1,
    hours_display: "Open Daily 11 AM - 1 AM",
    amenities: ["Sawdust Floors", "Light & Dark Ale Only", "Historic Memorabilia", "Cash Only"]
  },
  // New York - Brooklyn
  {
    fsq_id: "venue_union",
    name: "Union Pool",
    address: "484 Union Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "484 Union Ave, Brooklyn, NY 11211",
    price: 2,
    rating: 8.8,
    categories: ["Music Venue", "Beer Garden", "Patio Bar"],
    open_start: 12,
    open_end: 2,
    hours_display: "Open Daily 12 PM - 2 AM",
    amenities: ["Large Courtyard", "Taco Truck", "Live Shows", "Fire Pit"]
  },
  {
    fsq_id: "venue_brooklynbowl",
    name: "Brooklyn Bowl",
    address: "61 Wythe Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "61 Wythe Ave, Brooklyn, NY 11249",
    price: 3,
    rating: 9.2,
    categories: ["Bowling Alley", "Concert Venue", "Restaurant & Bar"],
    open_start: 17,
    open_end: 0,
    hours_display: "Open Daily 5 PM - Midnight",
    amenities: ["Bowling Lanes", "Live Concerts", "Blue Ribbon Fried Chicken", "Huge Space"]
  },
  {
    fsq_id: "venue_houseofyes",
    name: "House of Yes",
    address: "2 Wyckoff Ave",
    city: "New York",
    zone: "Brooklyn",
    formatted_address: "2 Wyckoff Ave, Brooklyn, NY 11237",
    price: 3,
    rating: 9.4,
    categories: ["Dance Club", "Nightclub", "Art Space"],
    open_start: 22,
    open_end: 4,
    open_days: [4, 5, 6, 0],
    hours_display: "Open Thu-Sun 10 PM - 4 AM",
    amenities: ["Aerial Performers", "Themed Costumes Required", "Outdoor Deck", "Vibrant Decor"]
  },
  // Cupertino - App Store Reviewer Mode
  {
    fsq_id: "venue_cafemacs",
    name: "Caffe Macs",
    address: "1 Infinite Loop",
    city: "Cupertino",
    zone: "HQ",
    formatted_address: "1 Infinite Loop, Cupertino, CA 95014",
    price: 2,
    rating: 8.9,
    categories: ["Corporate Cafe", "Lounge"],
    open_start: 8,
    open_end: 17,
    open_days: [1, 2, 3, 4, 5],
    hours_display: "Open Mon-Fri 8 AM - 5 PM",
    amenities: ["Apple Employees Only", "Scenic Seating", "Reviewer Mode", "Gourmet Foods"]
  },
  {
    fsq_id: "venue_infiniteloop",
    name: "Infinite Loop Lounge",
    address: "2 Infinite Loop",
    city: "Cupertino",
    zone: "HQ",
    formatted_address: "2 Infinite Loop, Cupertino, CA 95014",
    price: 3,
    rating: 9.0,
    categories: ["Developer Hangout", "Cocktail Bar"],
    open_start: 16,
    open_end: 22,
    hours_display: "Open Daily 4 PM - 10 PM",
    amenities: ["Apple History Trivia", "Craft Beer on Tap", "Developer Network", "Outdoor Deck"]
  },
  {
    fsq_id: "venue_applepark",
    name: "Apple Park Visitor Center Cafe",
    address: "10600 N Tantau Ave",
    city: "Cupertino",
    zone: "Campus",
    formatted_address: "10600 N Tantau Ave, Cupertino, CA 95014",
    price: 3,
    rating: 9.2,
    categories: ["Modern Cafe", "Sightseeing Spot"],
    open_start: 9,
    open_end: 18,
    hours_display: "Open Daily 9 AM - 6 PM",
    amenities: ["Scenic Terrace", "Apple Merchandise Shop", "Pour-Over Coffee", "iPads for AR Campus Tour"]
  },
  // Nashville
  {
    fsq_id: "venue_santas",
    name: "Santa's Pub",
    address: "2225 Bransford Ave",
    city: "Nashville",
    zone: "South Nashville",
    formatted_address: "2225 Bransford Ave, Nashville, TN 37204",
    price: 1,
    rating: 8.8,
    categories: ["Dive Bar", "Karaoke"],
    open_start: 16,
    open_end: 2,
    hours_display: "Open Daily 4 PM - 2 AM",
    amenities: ["Cash Only", "Cold Beer", "Karaoke Stage", "Double-wide Trailer"]
  },
  {
    fsq_id: "venue_dinos",
    name: "Dino's Bar",
    address: "411 Gallatin Ave",
    city: "Nashville",
    zone: "East Nashville",
    formatted_address: "411 Gallatin Ave, Nashville, TN 37206",
    price: 1,
    rating: 9.0,
    categories: ["Dive Bar", "Burgers"],
    open_start: 12,
    open_end: 3,
    hours_display: "Open Daily Noon - 3 AM",
    amenities: ["Late Night Kitchen", "Jukebox", "Outdoor Back Garden", "Legendary Burgers"]
  },
  {
    fsq_id: "venue_fivespot",
    name: "The 5 Spot",
    address: "1006 Forrest Ave",
    city: "Nashville",
    zone: "East Nashville",
    formatted_address: "1006 Forrest Ave, Nashville, TN 37206",
    price: 2,
    rating: 8.6,
    categories: ["Music Venue", "Neighborhood Pub"],
    open_start: 17,
    open_end: 2,
    hours_display: "Open Daily 5 PM - 2 AM",
    amenities: ["Live Stage", "Dance Floor", "Keepin' It Weird Retro Vibe"]
  },
  // San Francisco
  {
    fsq_id: "venue_cinch",
    name: "The Cinch Saloon",
    address: "1723 Polk St",
    city: "San Francisco",
    zone: "Polk Gulch",
    formatted_address: "1723 Polk St, San Francisco, CA 94109",
    price: 1,
    rating: 8.5,
    categories: ["Historic Bar", "Neighborhood Pub"],
    open_start: 12,
    open_end: 2,
    hours_display: "Open Daily 12 PM - 2 AM",
    amenities: ["Pool Table", "Smoking Patio", "Retro Jukebox", "Credit Cards"]
  },
  {
    fsq_id: "venue_lipo",
    name: "Li Po Cocktail Lounge",
    address: "916 Grant Ave",
    city: "San Francisco",
    zone: "Chinatown",
    formatted_address: "916 Grant Ave, San Francisco, CA 94108",
    price: 2,
    rating: 8.9,
    categories: ["Cocktail Lounge", "Chinese Restaurant"],
    open_start: 14,
    open_end: 2,
    hours_display: "Open Daily 2 PM - 2 AM",
    amenities: ["Famous Chinese Mai Tais", "Historic Neon Lantern", "Cozy Red Booths"]
  },
  {
    fsq_id: "venue_zeitgeist",
    name: "Zeitgeist",
    address: "199 Valencia St",
    city: "San Francisco",
    zone: "Mission",
    formatted_address: "199 Valencia St, San Francisco, CA 94103",
    price: 2,
    rating: 9.1,
    categories: ["Beer Garden", "Neighborhood Dive"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Massive Beer Garden", "Huge Draft List", "Bicycle Racks", "Bloody Marys"]
  },
  // Austin
  {
    fsq_id: "venue_chalmers",
    name: "Chalmers",
    address: "1700 E Cesar Chavez St",
    city: "Austin",
    zone: "East Austin",
    formatted_address: "1700 E Cesar Chavez St, Austin, TX 78702",
    price: 2,
    rating: 8.8,
    categories: ["Beer Garden", "Cocktail Bar", "Tex-Mex"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Spacious Patio", "Margaritas", "Taco Truck", "Dog Friendly"]
  },
  {
    fsq_id: "venue_central_machine",
    name: "Central Machine Works",
    address: "4824 E Cesar Chavez St",
    city: "Austin",
    zone: "East Austin",
    formatted_address: "4824 E Cesar Chavez St, Austin, TX 78702",
    price: 2,
    rating: 9.0,
    categories: ["Brewery", "Beer Garden", "Industrial Space"],
    open_start: 11,
    open_end: 0,
    hours_display: "Open 11 AM - Midnight",
    amenities: ["House Brews", "Massive Outdoor Area", "Live Music Stage", "Art Gallery Vibe"]
  },
  {
    fsq_id: "venue_dainty_dillo",
    name: "Dainty Dillo",
    address: "3201 E Cesar Chavez St",
    city: "Austin",
    zone: "East Austin",
    formatted_address: "3201 E Cesar Chavez St, Austin, TX 78702",
    price: 2,
    rating: 8.7,
    categories: ["Neighborhood Bar", "Cocktail Lounge"],
    open_start: 12,
    open_end: 2,
    hours_display: "Open Daily 12 PM - 2 AM",
    amenities: ["Nostalgic Vibe", "Craft Cocktails", "Shaded Patio", "Comfort Food"]
  },
  {
    fsq_id: "venue_armadillo_den",
    name: "Armadillo Den",
    address: "10001 Menchaca Rd",
    city: "Austin",
    zone: "South Austin",
    formatted_address: "10001 Menchaca Rd, Austin, TX 78748",
    price: 2,
    rating: 9.1,
    categories: ["Beer Garden", "Live Music Venue"],
    open_start: 12,
    open_end: 2,
    hours_display: "Open Daily 12 PM - 2 AM",
    amenities: ["Off-Leash Dog Park", "Food Trucks", "Huge Oak Trees", "Cold Drafts"]
  },
  {
    fsq_id: "venue_moontower",
    name: "Moontower Saloon",
    address: "10203 Menchaca Rd",
    city: "Austin",
    zone: "South Austin",
    formatted_address: "10203 Menchaca Rd, Austin, TX 78748",
    price: 1,
    rating: 8.9,
    categories: ["Dive Bar", "Beer Garden", "Sports Bar"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Sand Volleyball Courts", "Live Bands", "Dog Friendly", "Cheap Pitchers"]
  },
  {
    fsq_id: "venue_little_darlin",
    name: "The Little Darlin'",
    address: "6507 Circle S Rd",
    city: "Austin",
    zone: "South Austin",
    formatted_address: "6507 Circle S Rd, Austin, TX 78745",
    price: 2,
    rating: 9.2,
    categories: ["Neighborhood Tavern", "Beer Garden"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Spacious Backyard", "Horseshoes & Washers", "Southern Eats", "Local Taps"]
  },
  {
    fsq_id: "venue_star_bar",
    name: "Star Bar",
    address: "600 W 6th St",
    city: "Austin",
    zone: "Downtown",
    formatted_address: "600 W 6th St, Austin, TX 78701",
    price: 2,
    rating: 8.6,
    categories: ["Sports Bar", "Dive Bar", "Neighborhood Spot"],
    open_start: 16,
    open_end: 2,
    hours_display: "Open Daily 4 PM - 2 AM",
    amenities: ["Famous Bloody Marys", "Patio", "TVs for Games", "Historic 6th St Vibe"]
  },
  {
    fsq_id: "venue_parlor_yard",
    name: "Parlor & Yard",
    address: "601 W 6th St",
    city: "Austin",
    zone: "Downtown",
    formatted_address: "601 W 6th St, Austin, TX 78701",
    price: 2,
    rating: 8.8,
    categories: ["Lounge", "Sports Bar", "Arcade"],
    open_start: 15,
    open_end: 2,
    hours_display: "Open Daily 3 PM - 2 AM",
    amenities: ["Backyard Games", "Craft Cocktails", "Lively Crowd", "Big Screens"]
  },
  {
    fsq_id: "venue_little_woodrows",
    name: "Little Woodrow’s",
    address: "520 W 6th St",
    city: "Austin",
    zone: "Downtown",
    formatted_address: "520 W 6th St, Austin, TX 78701",
    price: 2,
    rating: 8.7,
    categories: ["Sports Bar", "Beer Garden"],
    open_start: 12,
    open_end: 2,
    hours_display: "Open Daily 12 PM - 2 AM",
    amenities: ["Turtle Racing Events", "Huge Draft Wall", "Outdoor Deck", "Ping Pong"]
  },
  {
    fsq_id: "venue_golden_goose",
    name: "The Golden Goose",
    address: "2034 S Lamar Blvd",
    city: "Austin",
    zone: "South Lamar",
    formatted_address: "2034 S Lamar Blvd, Austin, TX 78704",
    price: 2,
    rating: 9.0,
    categories: ["Retro Lounge", "Cocktail Bar", "Dive Bar"],
    open_start: 16,
    open_end: 2,
    hours_display: "Open Daily 4 PM - 2 AM",
    amenities: ["Vintage Jukebox", "70s Decor Vibe", "Craft Old Fashioneds", "Red Booths"]
  },
  {
    fsq_id: "venue_black_sheep",
    name: "Black Sheep Lodge",
    address: "2108 S Lamar Blvd",
    city: "Austin",
    zone: "South Lamar",
    formatted_address: "2108 S Lamar Blvd, Austin, TX 78704",
    price: 2,
    rating: 9.1,
    categories: ["Sports Bar", "Burger Joint", "Neighborhood Pub"],
    open_start: 11,
    open_end: 0,
    hours_display: "Open Daily 11 AM - Midnight",
    amenities: ["Award-Winning Burgers", "Frozen Margaritas", "Shuffleboard", "Draft Craft Beers"]
  },
  {
    fsq_id: "venue_barton_springs_saloon",
    name: "Barton Springs Saloon",
    address: "424 S Lamar Blvd",
    city: "Austin",
    zone: "South Lamar",
    formatted_address: "424 S Lamar Blvd, Austin, TX 78704",
    price: 1,
    rating: 8.8,
    categories: ["Dive Bar", "Neighborhood Spot"],
    open_start: 14,
    open_end: 2,
    hours_display: "Open Daily 2 PM - 2 AM",
    amenities: ["Cheap Cans", "Relaxed Vibe", "Dog Friendly Patio", "Classic Jukebox"]
  },
  {
    fsq_id: "venue_bouldin_acres",
    name: "Bouldin Acres",
    address: "2027 S Lamar Blvd",
    city: "Austin",
    zone: "South Lamar",
    formatted_address: "2027 S Lamar Blvd, Austin, TX 78704",
    price: 2,
    rating: 9.3,
    categories: ["Beer Garden", "Sports Bar", "Restaurant"],
    open_start: 11,
    open_end: 2,
    hours_display: "Open Daily 11 AM - 2 AM",
    amenities: ["Pickleball Courts", "Food Trucks", "Yard Games", "Playground Area"]
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

  let results;
  try {
    // Proxy the search through the Cloud Function (which holds the API key).
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(getFunctions(), "searchVenuesSecure");
    const res = await fn({ query, filterCity });
    results = res.data?.results || [];
  } catch (err) {
    console.warn("[Foursquare] Proxy unavailable, using offline simulation:", err);
    return getOfflineSearchResults(cleanQuery, filterCity);
  }

  // No live results (key not configured server-side, or empty) → offline catalog.
  if (!results.length) {
    return getOfflineSearchResults(cleanQuery, filterCity);
  }

  try {
    // Filter Foursquare results to make sure they reside in the requested city/metro zone
    const targetResults = results.filter(place => {
      if (!filterCity) return true;
      const locality = (place.location?.locality || "").toLowerCase();
      const region = (place.location?.region || "").toLowerCase();
      
      if (filterCity.toLowerCase() === "phoenix") {
        return (
          locality === "phoenix" || 
          locality === "tempe" || 
          locality === "scottsdale" || 
          region === "az" || 
          region === "arizona"
        );
      }
      if (filterCity.toLowerCase() === "new york") {
        return (
          locality === "new york" || 
          locality === "brooklyn" || 
          locality === "manhattan" || 
          region === "ny" || 
          region === "new york"
        );
      }
      return locality === filterCity.toLowerCase();
    });

    // Map Foursquare results to our layout schema
    return targetResults.map(place => {
      // Deduce zone based on locality or assign a generic one
      const city = place.location?.locality || (filterCity.toLowerCase() === "new york" ? "New York" : "Phoenix");
      const address = place.location?.address || "No Address Provided";
      
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
      } else if (city.toLowerCase() === "austin") {
        const lowerAddress = address.toLowerCase();
        const lowerName = place.name.toLowerCase();
        if (lowerAddress.includes("cesar chavez") || lowerName.includes("chalmers") || lowerName.includes("machine") || lowerName.includes("dillo")) {
          zone = "East Austin";
        } else if (lowerAddress.includes("menchaca") || lowerAddress.includes("circle s") || lowerName.includes("armadillo") || lowerName.includes("moontower") || lowerName.includes("darlin")) {
          zone = "South Austin";
        } else if (lowerAddress.includes("6th st") || lowerAddress.includes("woodrow") || lowerName.includes("star bar") || lowerName.includes("parlor")) {
          zone = "Downtown";
        } else if (lowerAddress.includes("lamar") || lowerName.includes("golden goose") || lowerName.includes("black sheep") || lowerName.includes("bouldin") || lowerName.includes("barton springs")) {
          zone = "South Lamar";
        } else {
          zone = "Downtown";
        }
      }

      const rawLocality = (place.location?.locality || "").toLowerCase();
      const rawRegion = (place.location?.region || "").toLowerCase();
      
      let normalizedCity = "Phoenix";
      if (rawLocality === "new york" || rawLocality === "brooklyn" || rawLocality === "manhattan" || rawRegion === "ny" || rawRegion === "new york") {
        normalizedCity = "New York";
      } else if (rawLocality === "nashville" || rawRegion === "tn" || rawRegion === "tennessee") {
        normalizedCity = "Nashville";
      } else if (rawLocality === "san francisco" || rawRegion === "ca" || rawRegion === "california") {
        if (rawLocality === "cupertino") {
          normalizedCity = "Cupertino";
        } else {
          normalizedCity = "San Francisco";
        }
      } else if (rawLocality === "austin" || rawRegion === "tx" || rawRegion === "texas") {
        normalizedCity = "Austin";
      } else if (rawLocality === "cupertino") {
        normalizedCity = "Cupertino";
      }

      return {
        fsq_id: place.fsq_id,
        name: place.name,
        address: address,
        city: normalizedCity,
        zone: zone,
        formatted_address: place.location?.formatted_address || `${address}, ${city}`,
        price: place.price || null,
        rating: place.rating || null,
        categories: (place.categories || []).map(c => c.name),
        open_now: place.hours?.open_now !== undefined ? place.hours.open_now : null,
        hours_display: place.hours?.display || null,
        amenities: extractAmenities(place)
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

  // Dynamically resolve open_now for each mock venue based on user's current clock
  return Promise.resolve(results.map(v => ({
    ...v,
    open_now: isOpenNow(v)
  })));
}

function isOpenNow(venue) {
  if (venue.open_24h) return true;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
  const currentHour = now.getHours() + now.getMinutes() / 60;

  const days = venue.open_days || [0, 1, 2, 3, 4, 5, 6];
  const isDayOpen = (d) => days.includes(d);

  const start = venue.open_start;
  const end = venue.open_end;

  if (start === undefined || end === undefined) {
    return false;
  }

  // 1. Check business day starting today
  if (isDayOpen(currentDay)) {
    if (end > start) {
      if (currentHour >= start && currentHour < end) {
        return true;
      }
    } else {
      // Overlap past midnight (e.g. 4 PM - 2 AM)
      if (currentHour >= start) {
        return true;
      }
    }
  }

  // 2. Check business day starting yesterday
  const yesterday = (currentDay + 6) % 7;
  if (isDayOpen(yesterday)) {
    if (end < start) {
      if (currentHour < end) {
        return true;
      }
    }
  }

  return false;
}

function extractAmenities(place) {
  const list = [];
  const feats = place.features;
  if (!feats) return list;
  
  if (feats.payment) {
    if (feats.payment.credit_cards?.accepts_credit_cards) list.push("Credit Cards");
  }
  if (feats.food_and_drink) {
    if (feats.food_and_drink.serves_beer) list.push("Beer");
    if (feats.food_and_drink.serves_wine) list.push("Wine");
    if (feats.food_and_drink.serves_cocktails) list.push("Cocktails");
  }
  if (feats.amenities) {
    if (feats.amenities.outdoor_seating) list.push("Outdoor Seating");
    if (feats.amenities.live_music) list.push("Live Music");
    if (feats.amenities.wifi === "free" || feats.amenities.wifi === "paid") list.push("Wi-Fi");
  }
  return list;
}
