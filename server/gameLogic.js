// gameLogic.js — All auction rules ported from App.jsx
// Server is the single source of truth for game state.

const { playerPool } = require('./players');

// -------------------------------------------------------
// Player Sampling
// -------------------------------------------------------

function sampleMixedRatings(pool, count) {
  const sortedPool = [...pool].sort((a, b) => b.rating - a.rating);
  const n = sortedPool.length;
  if (n < count) return sortedPool;

  const tierSize = Math.floor(n / 3);
  const topTier = sortedPool.slice(0, tierSize);
  const midTier = sortedPool.slice(tierSize, 2 * tierSize);
  const lowTier = sortedPool.slice(2 * tierSize);

  const baseShare = Math.floor(count / 3);
  const extra = count % 3;
  const shares = [baseShare, baseShare, baseShare];
  if (extra === 1) shares[1] += 1;
  else if (extra === 2) { shares[0] += 1; shares[2] += 1; }

  const sample = (arr, c) => [...arr].sort(() => 0.5 - Math.random()).slice(0, c);

  return [
    ...sample(topTier, shares[0]),
    ...sample(midTier, shares[1]),
    ...sample(lowTier, shares[2])
  ];
}

function generateAuctionPlayers() {
  const gks = playerPool.filter(p => p.position === 'GK');
  const defs = playerPool.filter(p => p.position === 'DEF');
  const mids = playerPool.filter(p => p.position === 'MID');
  const fins = playerPool.filter(p => p.position === 'FIN');

  const selected = [
    ...sampleMixedRatings(gks, 3),
    ...sampleMixedRatings(defs, 5),
    ...sampleMixedRatings(mids, 6),
    ...sampleMixedRatings(fins, 7)
  ];

  return selected.sort(() => 0.5 - Math.random());
}

// -------------------------------------------------------
// Roster Helpers
// -------------------------------------------------------

function canAddPosition(roster, pos) {
  if (roster.length >= 7) return false;
  const gkCount = roster.filter(p => p.position === 'GK').length + (pos === 'GK' ? 1 : 0);
  if (gkCount > 1) return false;
  return true;
}

function isEligible(team, player) {
  const basePrice = player.base_price || 1.0;
  return canAddPosition(team.players, player.position) && team.money >= basePrice;
}

function getRosterCounts(players) {
  return {
    gk: players.filter(p => p.position === 'GK').length,
    def: players.filter(p => p.position === 'DEF').length,
    mid: players.filter(p => p.position === 'MID').length,
    fin: players.filter(p => p.position === 'FIN').length
  };
}

function hasValidPositions(players) {
  if (players.length !== 7) return false;
  const counts = getRosterCounts(players);
  return counts.gk === 1 && counts.def >= 2 && counts.mid >= 1 && counts.fin >= 1;
}

// -------------------------------------------------------
// Initial State Factory
// -------------------------------------------------------

function createInitialState(team1Name, team2Name) {
  const auctionPlayers = generateAuctionPlayers();
  const team1 = { id: 'team1', name: team1Name || 'Team A', money: 35.0, players: [] };
  const team2 = { id: 'team2', name: team2Name || 'Team B', money: 35.0, players: [] };

  const state = {
    stage: 'bidding',
    team1,
    team2,
    auctionPlayers,
    currentPlayerIndex: 0,
    biddingMode: 'normal',
    activeTurn: 'team1',
    currentBid: 0.0,
    highestBidder: null,
    biddingStarted: false,
    starter: 'team1',
    consoleMsg: '',
    matchData: null
  };

  // Set up bidding for first player
  initializeBiddingForPlayer(state, 0);
  return state;
}

// -------------------------------------------------------
// Bidding Initialization (mutates state in place)
// -------------------------------------------------------

function initializeBiddingForPlayer(state, index) {
  const { team1, team2, auctionPlayers, starter } = state;
  const player = auctionPlayers[index];
  const t1Elig = isEligible(team1, player);
  const t2Elig = isEligible(team2, player);

  state.currentBid = 0.0;
  state.highestBidder = null;
  state.biddingStarted = false;
  state.currentPlayerIndex = index;

  if (!t1Elig && !t2Elig) {
    state.biddingMode = 'skipped';
    state.activeTurn = null;
    state.consoleMsg = `Neither team can sign ${player.name} (${player.position}) due to roster limits or budget.`;
  } else if (t1Elig && !t2Elig) {
    state.biddingMode = 'uncontested';
    state.activeTurn = 'team1';
    state.consoleMsg = `${team2.name} is ineligible. ${team1.name} can bid uncontested.`;
  } else if (t2Elig && !t1Elig) {
    state.biddingMode = 'uncontested';
    state.activeTurn = 'team2';
    state.consoleMsg = `${team1.name} is ineligible. ${team2.name} can bid uncontested.`;
  } else {
    state.biddingMode = 'normal';
    state.activeTurn = starter;
    state.consoleMsg = `Bidding starts! ${starter === 'team1' ? team1.name : team2.name} acts first.`;
  }
}

// -------------------------------------------------------
// Move to Next Player
// -------------------------------------------------------

function advanceToNextPlayer(state) {
  const { team1, team2, auctionPlayers, currentPlayerIndex } = state;

  if (team1.players.length === 7 && team2.players.length === 7) {
    state.stage = 'auction_result';
    return;
  }

  const nextIndex = currentPlayerIndex + 1;
  if (nextIndex >= auctionPlayers.length) {
    state.stage = 'auction_result';
    return;
  }

  initializeBiddingForPlayer(state, nextIndex);
}

// -------------------------------------------------------
// Process a Bid
// Returns { valid: bool, error: string|null }
// -------------------------------------------------------

function processBid(state, teamId, amount) {
  const { team1, team2, auctionPlayers, currentPlayerIndex, biddingMode, biddingStarted, currentBid } = state;
  const player = auctionPlayers[currentPlayerIndex];
  const basePrice = player.base_price || 1.0;
  const targetTeam = teamId === 'team1' ? team1 : team2;
  const opponentTeam = teamId === 'team1' ? team2 : team1;

  // Validate increment (must be multiple of 0.5)
  if (Math.abs(amount * 2 - Math.round(amount * 2)) > 1e-9) {
    state.consoleMsg = `Invalid Bid! Bids must be in increments of $0.5M (e.g. 1.5, 2.0).`;
    return { valid: false, error: state.consoleMsg };
  }

  if (amount < 1.0) {
    state.consoleMsg = `Minimum starting bid is $1.0M.`;
    return { valid: false, error: state.consoleMsg };
  }

  if (amount > targetTeam.money) {
    state.consoleMsg = `Bid exceeds budget! ${targetTeam.name} only has $${targetTeam.money}M.`;
    return { valid: false, error: state.consoleMsg };
  }

  if (!biddingStarted) {
    if (amount < basePrice) {
      state.consoleMsg = `Bid must be at least the player's base price of $${basePrice}M.`;
      return { valid: false, error: state.consoleMsg };
    }
  } else {
    if (amount < currentBid + 0.5) {
      state.consoleMsg = `Bid must raise the current bid by at least $0.5M (requires min $${(currentBid + 0.5).toFixed(1)}M).`;
      return { valid: false, error: state.consoleMsg };
    }
  }

  // Valid bid
  if (biddingMode === 'uncontested') {
    state.consoleMsg = `${targetTeam.name} bought ${player.name} uncontested for $${amount}M!`;
    addPlayerToTeam(state, teamId, player, amount);
  } else {
    const updatedBid = Math.round(amount * 10) / 10;
    state.currentBid = updatedBid;
    state.highestBidder = teamId;
    state.biddingStarted = true;

    const minOpponentRaise = Math.round((updatedBid + 0.5) * 10) / 10;
    if (opponentTeam.money < minOpponentRaise) {
      state.consoleMsg = `${opponentTeam.name} cannot afford to raise. ${targetTeam.name} wins ${player.name} for $${updatedBid}M!`;
      addPlayerToTeam(state, teamId, player, updatedBid);
    } else {
      const nextTurn = teamId === 'team1' ? 'team2' : 'team1';
      state.activeTurn = nextTurn;
      const nextTeamName = nextTurn === 'team1' ? team1.name : team2.name;
      state.consoleMsg = `${targetTeam.name} bid $${updatedBid}M! Turn: ${nextTeamName}`;
    }
  }

  return { valid: true, error: null };
}

// -------------------------------------------------------
// Process a Pass
// -------------------------------------------------------

function processPass(state, teamId) {
  const { team1, team2, auctionPlayers, currentPlayerIndex, biddingMode, biddingStarted, currentBid } = state;
  const player = auctionPlayers[currentPlayerIndex];
  const isT1 = teamId === 'team1';
  const targetTeam = isT1 ? team1 : team2;
  const opponentTeam = isT1 ? team2 : team1;

  if (biddingMode === 'uncontested') {
    state.consoleMsg = `${targetTeam.name} passed. No one bought ${player.name}.`;
    advanceToNextPlayer(state);
    return;
  }

  if (!biddingStarted) {
    // First pass: opponent gets uncontested bid
    state.consoleMsg = `${targetTeam.name} passed. Turn goes to ${opponentTeam.name}.`;
    state.biddingMode = 'uncontested';
    state.activeTurn = opponentTeam.id;
  } else {
    // Bidding was ongoing — opponent wins at current bid
    state.consoleMsg = `${targetTeam.name} passed! ${opponentTeam.name} wins ${player.name} for $${currentBid}M.`;
    addPlayerToTeam(state, opponentTeam.id, player, currentBid);
  }
}

// -------------------------------------------------------
// Add Player to Team (mutates state)
// -------------------------------------------------------

function addPlayerToTeam(state, teamId, player, price) {
  const isT1 = teamId === 'team1';
  const target = isT1 ? state.team1 : state.team2;

  target.money = Math.round((target.money - price) * 10) / 10;
  target.players.push({ ...player, buy_price: price });

  // Winner bids first next round
  state.starter = teamId;
  advanceToNextPlayer(state);
}

// -------------------------------------------------------
// Match Simulator
// -------------------------------------------------------

function simulateMatch(state) {
  const { team1, team2 } = state;

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);

  const totalGoals = rand(0, 7);
  const htGoals = rand(0, totalGoals);
  const ftGoals = totalGoals - htGoals;

  const events = [];
  const usedMinutes = new Set();

  const getMinute = (from, to) => {
    let m;
    do { m = rand(from, to); } while (usedMinutes.has(m));
    usedMinutes.add(m);
    return m;
  };

  const allT1 = team1.players.filter(p => p.position !== 'GK');
  const allT2 = team2.players.filter(p => p.position !== 'GK');
  const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

  let t1Score = 0, t2Score = 0;

  const generateGoals = (count, half, fromMin, toMin) => {
    for (let i = 0; i < count; i++) {
      const scoringTeamId = Math.random() < 0.5 ? 'team1' : 'team2';
      const scorerPool = scoringTeamId === 'team1' ? allT1 : allT2;
      const scorer = pickRandom(scorerPool);
      const assisterCandidates = scorerPool.filter(p => p.name !== scorer.name);
      const assister = assisterCandidates.length > 0 && Math.random() > 0.25
        ? pickRandom(assisterCandidates) : null;
      if (scoringTeamId === 'team1') t1Score++; else t2Score++;
      events.push({
        half,
        minute: getMinute(fromMin, toMin),
        team: scoringTeamId,
        scorer: scorer.name,
        assister: assister ? assister.name : null
      });
    }
  };

  generateGoals(htGoals, 1, 1, 45);
  generateGoals(ftGoals, 2, 46, 90);
  events.sort((a, b) => a.minute - b.minute);

  const htT1 = events.filter(e => e.half === 1 && e.team === 'team1').length;
  const htT2 = events.filter(e => e.half === 1 && e.team === 'team2').length;
  const winner = t1Score > t2Score ? 'team1' : t2Score > t1Score ? 'team2' : 'draw';

  const scorers = new Set(events.map(e => e.scorer));
  const assisters = new Set(events.filter(e => e.assister).map(e => e.assister));

  const generateRatings = (players, teamId) =>
    players.map(p => {
      let base = randFloat(2.0, 3.5);
      if (winner === teamId) base = Math.min(5, base + randFloat(0.5, 1.2));
      if (scorers.has(p.name)) base = Math.min(5, base + randFloat(0.4, 0.8));
      if (assisters.has(p.name)) base = Math.min(5, base + randFloat(0.3, 0.6));
      return { ...p, matchRating: Math.min(5, +base.toFixed(1)) };
    });

  state.matchData = {
    t1Score, t2Score, htT1, htT2, winner, events,
    t1Players: generateRatings(team1.players, 'team1'),
    t2Players: generateRatings(team2.players, 'team2')
  };
  state.stage = 'match';
}

module.exports = {
  createInitialState,
  processBid,
  processPass,
  advanceToNextPlayer,
  simulateMatch,
  hasValidPositions,
  getRosterCounts
};
