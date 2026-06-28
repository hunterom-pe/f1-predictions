/**
 * Calculate prediction points for a round.
 * 
 * Rules:
 * - Correct Pole Position: 5 points
 * - Correct Podium Pick (P1, P2, or P3): 3 points each (driver predicted in top 3 finishes in top 3)
 * - Perfect Podium Bonus: +5 points (predicted P1, P2, P3 in exact order)
 * - Driver of the Day Match: 3 points
 * - Chaos Vector: 2 points
 */
export const calculatePoints = (prediction, result) => {
  if (!prediction || !result) {
    return {
      polePoints: 0,
      podiumPoints: 0,
      bonusPoints: 0,
      dotdPoints: 0,
      chaosPoints: 0,
      total: 0
    };
  }

  // 1. Pole Position (5 pts)
  const isPoleCorrect = prediction.pole_driver_id && result.pole_driver_id && 
                        prediction.pole_driver_id === result.pole_driver_id;
  const polePoints = isPoleCorrect ? 5 : 0;

  // 2. Podium Picks (3 pts each)
  const predictedPodium = [prediction.p1_driver_id, prediction.p2_driver_id, prediction.p3_driver_id].filter(Boolean);
  const actualPodium = [result.p1_driver_id, result.p2_driver_id, result.p3_driver_id].filter(Boolean);

  let podiumCount = 0;
  predictedPodium.forEach(driver => {
    if (actualPodium.includes(driver)) {
      podiumCount++;
    }
  });
  const podiumPoints = podiumCount * 3;

  // 3. Perfect Podium Bonus (+5 pts)
  const isPerfectPodium = prediction.p1_driver_id === result.p1_driver_id &&
                          prediction.p2_driver_id === result.p2_driver_id &&
                          prediction.p3_driver_id === result.p3_driver_id;
  const bonusPoints = (isPerfectPodium && actualPodium.length === 3) ? 5 : 0;

  // 4. Driver of the Day (3 pts)
  const isDotdCorrect = prediction.dotd_driver_id && result.dotd_driver_id &&
                        prediction.dotd_driver_id === result.dotd_driver_id;
  const dotdPoints = isDotdCorrect ? 3 : 0;

  // 5. Chaos Vector (2 pts)
  const isChaosCorrect = prediction.chaos_vector !== undefined && result.chaos_vector !== undefined &&
                         Boolean(prediction.chaos_vector) === Boolean(result.chaos_vector);
  const chaosPoints = isChaosCorrect ? 2 : 0;

  return {
    polePoints,
    podiumPoints,
    bonusPoints,
    dotdPoints,
    chaosPoints,
    total: polePoints + podiumPoints + bonusPoints + dotdPoints + chaosPoints
  };
};

/**
 * Calculates season totals and returns aggregated standings for all profiles.
 */
export const calculateStandings = (profiles, predictions, results) => {
  const standings = profiles.map(profile => {
    let totalPoints = 0;
    let poleWins = 0;
    let podiumWins = 0;
    let perfectPodiums = 0;
    let dotdWins = 0;
    let chaosWins = 0;
    
    // Map of round -> points breakdown for detail pages
    const roundDetails = {};

    predictions
      .filter(p => p.user_id === profile.id)
      .forEach(pred => {
        const roundResult = results.find(r => r.round === pred.round);
        if (roundResult) {
          const score = calculatePoints(pred, roundResult);
          totalPoints += score.total;
          
          if (score.polePoints > 0) poleWins++;
          if (score.podiumPoints > 0) podiumWins += (score.podiumPoints / 3);
          if (score.bonusPoints > 0) perfectPodiums++;
          if (score.dotdPoints > 0) dotdWins++;
          if (score.chaosPoints > 0) chaosWins++;

          roundDetails[pred.round] = score;
        }
      });

    return {
      ...profile,
      totalPoints,
      stats: {
        poleWins,
        podiumWins,
        perfectPodiums,
        dotdWins,
        chaosWins
      },
      roundDetails
    };
  });

  // Sort by points descending, then by name
  return standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.name.localeCompare(b.name);
  });
};
