import { useState } from "react";

// Structure of zones for default navigation
const GEO_TREE = {
  "Phoenix": {
    "Downtown": [],
    "Tempe": [],
    "Old Town": []
  },
  "New York": {
    "Manhattan": [],
    "Brooklyn": []
  }
};

/**
 * FolderTree navigation component (Network Neighborhood style)
 * @param {object} props
 * @param {Array} props.venues List of active venues to group and display in the tree
 * @param {object} props.selectedVenue The currently selected venue object
 * @param {Function} props.onSelectVenue Callback when a venue leaf node is clicked
 */
export default function FolderTree({ venues, selectedVenue, onSelectVenue }) {
  // Expansion states: default open Network Neighborhood and Phoenix
  const [expanded, setExpanded] = useState({
    root: true,
    "Phoenix": true,
    "Phoenix-Downtown": true,
    "Phoenix-Tempe": false,
    "Phoenix-Old Town": false,
    "New York": false,
    "New York-Manhattan": false,
    "New York-Brooklyn": false
  });

  const toggleExpand = (nodeId) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Group venues by City and Zone
  const groupedVenues = {};
  venues.forEach(v => {
    const city = v.city || "Phoenix";
    const zone = v.zone || "Downtown";
    if (!groupedVenues[city]) groupedVenues[city] = {};
    if (!groupedVenues[city][zone]) groupedVenues[city][zone] = [];
    groupedVenues[city][zone].push(v);
  });

  return (
    <ul className="tree-view" style={{ margin: 0, padding: "4px", backgroundColor: "#fff", height: "100%", overflowY: "auto" }}>
      <li>
        <span 
          className="tree-node-label" 
          onClick={() => toggleExpand("root")}
          style={{ fontWeight: "bold" }}
        >
          <span className="tree-icon">💻</span>
          Network Neighborhood
        </span>
        
        {expanded.root && (
          <ul>
            {Object.keys(GEO_TREE).map(city => {
              const cityExpanded = expanded[city];
              
              return (
                <li key={city}>
                  <span 
                    className="tree-node-label" 
                    onClick={() => toggleExpand(city)}
                  >
                    <span className="tree-icon">{cityExpanded ? "📂" : "📁"}</span>
                    {city}
                  </span>
                  
                  {cityExpanded && (
                    <ul>
                      {Object.keys(GEO_TREE[city]).map(zone => {
                        const zoneKey = `${city}-${zone}`;
                        const zoneExpanded = expanded[zoneKey];
                        const zoneVenues = (groupedVenues[city] && groupedVenues[city][zone]) || [];
                        
                        return (
                          <li key={zone}>
                            <span 
                              className="tree-node-label" 
                              onClick={() => toggleExpand(zoneKey)}
                            >
                              <span className="tree-icon">{zoneExpanded ? "📂" : "📁"}</span>
                              {zone} ({zoneVenues.length})
                            </span>
                            
                            {zoneExpanded && (
                              <ul>
                                {zoneVenues.length === 0 ? (
                                  <li>
                                    <span className="tree-node-label" style={{ color: "#808080", fontStyle: "italic" }}>
                                      (No active venues)
                                    </span>
                                  </li>
                                ) : (
                                  zoneVenues.map(venue => {
                                    const isSelected = selectedVenue && selectedVenue.fsq_id === venue.fsq_id;
                                    return (
                                      <li key={venue.fsq_id}>
                                        <span 
                                          className={`tree-node-label ${isSelected ? "active" : ""}`}
                                          onClick={() => onSelectVenue(venue)}
                                        >
                                          <span className="tree-icon">📍</span>
                                          {venue.name}
                                        </span>
                                      </li>
                                    );
                                  })
                                )}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </li>
    </ul>
  );
}
