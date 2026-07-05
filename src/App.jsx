import { useState, useEffect } from 'react';
import { playerPool } from './data/players';
import './index.css';

// ----------------------------------------------------
// Core Bidding & Roster Helpers
// ----------------------------------------------------

function sampleMixedRatings(pool, count) {
  const sortedPool = [...pool].sort((a, b) => b.rating - a.rating);
  const n = sortedPool.length;
  if (n < count) return sortedPool;

  const tierSize = Math.floor(n / 3);
  const topTier = sortedPool.slice(0, tierSize);
  const midTier = sortedPool.slice(tierSize, 2 * tierSize);
  const lowTier = sortedPool.slice(2 * tierSize);

  const selected = [];
  const baseShare = Math.floor(count / 3);
  const extra = count % 3;

  const shares = [baseShare, baseShare, baseShare];
  if (extra === 1) {
    shares[1] += 1;
  } else if (extra === 2) {
    shares[0] += 1;
    shares[2] += 1;
  }

  const sample = (arr, c) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, c);
  };

  selected.push(...sample(topTier, shares[0]));
  selected.push(...sample(midTier, shares[1]));
  selected.push(...sample(lowTier, shares[2]));

  return selected;
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

  // Shuffle the selected pool
  return selected.sort(() => 0.5 - Math.random());
}

function canAddPosition(roster, pos) {
  // Cannot add more than 7 players
  if (roster.length >= 7) return false;

  // Calculate goalkeeper count after adding this player
  const gkCount = roster.filter(p => p.position === 'GK').length + (pos === 'GK' ? 1 : 0);

  // Cannot have more than 1 goalkeeper
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
  // Must have exactly 1 GK, at least 2 DEF, at least 1 MID, at least 1 FIN
  // The remaining 2 players can be DEF, MID, or FIN
  return counts.gk === 1 && counts.def >= 2 && counts.mid >= 1 && counts.fin >= 1;
}

export default function App() {
  // ----------------------------------------------------
  // States
  // ----------------------------------------------------
  const [stage, setStage] = useState('rules'); // 'rules', 'setup', 'bidding', 'auction_result', 'match'
  const [matchData, setMatchData] = useState(null);
  
  const [team1, setTeam1] = useState({ id: 'team1', name: 'Team A', money: 35.0, players: [] });
  const [team2, setTeam2] = useState({ id: 'team2', name: 'Team B', money: 35.0, players: [] });
  
  const [team1Input, setTeam1Input] = useState('Team A');
  const [team2Input, setTeam2Input] = useState('Team B');

  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // Active Bidding Session States
  const [biddingMode, setBiddingMode] = useState('normal'); // 'normal', 'uncontested', 'skipped'
  const [activeTurn, setActiveTurn] = useState('team1'); // 'team1' or 'team2'
  const [currentBid, setCurrentBid] = useState(0.0);
  const [highestBidder, setHighestBidder] = useState(null); // 'team1' or 'team2' or null
  const [biddingStarted, setBiddingStarted] = useState(false);
  const [starter, setStarter] = useState('team1'); // alternates who acts first

  // Console / Status message
  const [consoleMsg, setConsoleMsg] = useState('');
  const [bidInputVal, setBidInputVal] = useState('');

  // ----------------------------------------------------
  // Game Actions & Flow
  // ----------------------------------------------------
  
  const startGame = () => {
    // Generate new auction players list
    const players = generateAuctionPlayers();
    setAuctionPlayers(players);
    setCurrentPlayerIndex(0);

    const t1 = { id: 'team1', name: team1Input.trim() || 'Team A', money: 35.0, players: [] };
    const t2 = { id: 'team2', name: team2Input.trim() || 'Team B', money: 35.0, players: [] };

    setTeam1(t1);
    setTeam2(t2);
    setStarter('team1');
    setCurrentBid(0.0);
    setHighestBidder(null);
    setBiddingStarted(false);
    setBidInputVal('');

    // Setup first player
    const firstPlayer = players[0];
    const t1Elig = isEligible(t1, firstPlayer);
    const t2Elig = isEligible(t2, firstPlayer);

    setStage('bidding');
    initializeBiddingForPlayer(0, firstPlayer, t1, t2, 'team1', 'team1');
  };

  const restartGame = () => {
    setStage('setup');
  };

  const initializeBiddingForPlayer = (index, player, t1, t2, currentStarter, activeTurnOverride = null) => {
    const t1Elig = isEligible(t1, player);
    const t2Elig = isEligible(t2, player);

    if (!t1Elig && !t2Elig) {
      setBiddingMode('skipped');
      setConsoleMsg(`Neither team can sign ${player.name} (${player.position}) due to roster limits or budget.`);
      setActiveTurn(null);
    } else if (t1Elig && !t2Elig) {
      setBiddingMode('uncontested');
      setConsoleMsg(`${t2.name} is ineligible. ${t1.name} can bid uncontested.`);
      setActiveTurn('team1');
      setBidInputVal((player.base_price || 1.0).toString());
    } else if (t2Elig && !t1Elig) {
      setBiddingMode('uncontested');
      setConsoleMsg(`${t1.name} is ineligible. ${t2.name} can bid uncontested.`);
      setActiveTurn('team2');
      setBidInputVal((player.base_price || 1.0).toString());
    } else {
      setBiddingMode('normal');
      const firstActor = activeTurnOverride || currentStarter;
      setConsoleMsg(`Bidding starts! ${firstActor === 'team1' ? t1.name : t2.name} acts first.`);
      setActiveTurn(firstActor);
      setBidInputVal((player.base_price || 1.0).toString());
    }
  };

  const handleNextPlayer = (updatedT1, updatedT2, nextStarter) => {
    const t1 = updatedT1 || team1;
    const t2 = updatedT2 || team2;
    // Use explicitly passed nextStarter if provided, otherwise fall back to current state.
    // This avoids reading stale state when called immediately after setStarter().
    const effectiveStarter = nextStarter !== undefined ? nextStarter : starter;

    if (t1.players.length === 7 && t2.players.length === 7) {
      setStage('auction_result');
      return;
    }

    const nextIndex = currentPlayerIndex + 1;
    if (nextIndex >= auctionPlayers.length) {
      setStage('auction_result');
      return;
    }

    setCurrentPlayerIndex(nextIndex);
    setCurrentBid(0.0);
    setHighestBidder(null);
    setBiddingStarted(false);

    const nextPlayer = auctionPlayers[nextIndex];
    initializeBiddingForPlayer(nextIndex, nextPlayer, t1, t2, effectiveStarter);
  };

  const addPlayerToTeam = (teamId, player, price) => {
    const isT1 = teamId === 'team1';
    const targetTeam = isT1 ? team1 : team2;
    // The winning team bids first in the next round.
    // Pass this explicitly to avoid reading stale React state in handleNextPlayer.
    const newStarter = teamId;

    const updatedTeam = {
      ...targetTeam,
      money: Math.round((targetTeam.money - price) * 10) / 10,
      players: [...targetTeam.players, { ...player, buy_price: price }]
    };

    if (isT1) {
      setTeam1(updatedTeam);
      setStarter(newStarter);
      handleNextPlayer(updatedTeam, team2, newStarter);
    } else {
      setTeam2(updatedTeam);
      setStarter(newStarter);
      handleNextPlayer(team1, updatedTeam, newStarter);
    }
  };

  // ----------------------------------------------------
  // Bid Submission
  // ----------------------------------------------------
  
  const submitBid = (teamId, amount) => {
    const player = auctionPlayers[currentPlayerIndex];
    const basePrice = player.base_price || 1.0;
    const targetTeam = teamId === 'team1' ? team1 : team2;
    const opponentTeam = teamId === 'team1' ? team2 : team1;

    // Validate increments (must be a multiple of 0.5)
    if (Math.abs(amount * 2 - Math.round(amount * 2)) > 1e-9) {
      setConsoleMsg(`Invalid Bid! Bids must be in increments of $0.5M (e.g. 1.5, 2.0).`);
      return;
    }

    // Validate boundaries
    if (amount < 1.0) {
      setConsoleMsg(`Minimum starting bid is $1.0M.`);
      return;
    }

    if (amount > targetTeam.money) {
      setConsoleMsg(`Bid exceeds budget! ${targetTeam.name} only has $${targetTeam.money}M.`);
      return;
    }

    if (!biddingStarted) {
      if (amount < basePrice) {
        setConsoleMsg(`Bid must be at least the player's base price of $${basePrice}M.`);
        return;
      }
    } else {
      if (amount < currentBid + 0.5) {
        setConsoleMsg(`Bid must raise the current bid by at least $0.5M (requires min $${(currentBid + 0.5).toFixed(1)}M).`);
        return;
      }
    }

    // Bid is valid!
    if (biddingMode === 'uncontested') {
      // Uncontested bids are won instantly
      setConsoleMsg(`${targetTeam.name} bought ${player.name} uncontested for $${amount}M!`);
      addPlayerToTeam(teamId, player, amount);
    } else {
      // Normal bidding
      const updatedBid = Math.round(amount * 10) / 10;
      setCurrentBid(updatedBid);
      setHighestBidder(teamId);
      setBiddingStarted(true);

      // Check if opponent can afford to raise by 0.5
      const minOpponentRaise = Math.round((updatedBid + 0.5) * 10) / 10;
      if (opponentTeam.money < minOpponentRaise) {
        // Opponent automatically passes because they can't afford it
        setConsoleMsg(`${opponentTeam.name} cannot afford to raise the bid. ${targetTeam.name} wins ${player.name} for $${updatedBid}M!`);
        // Slight timeout or direct buy
        addPlayerToTeam(teamId, player, updatedBid);
      } else {
        // Toggle turn
        const nextTurn = teamId === 'team1' ? 'team2' : 'team1';
        setActiveTurn(nextTurn);
        setConsoleMsg(`${targetTeam.name} bid $${updatedBid}M! Turn: ${nextTurn === 'team1' ? team1.name : team2.name}`);
        setBidInputVal(minOpponentRaise.toFixed(1));
      }
    }
  };

  // ----------------------------------------------------
  // Pass Submission
  // ----------------------------------------------------
  
  const submitPass = (teamId) => {
    const player = auctionPlayers[currentPlayerIndex];
    const isT1 = teamId === 'team1';
    const targetTeam = isT1 ? team1 : team2;
    const opponentTeam = isT1 ? team2 : team1;

    if (biddingMode === 'uncontested') {
      setConsoleMsg(`${targetTeam.name} passed. No one bought ${player.name}.`);
      handleNextPlayer();
      return;
    }

    if (!biddingStarted) {
      // First pass of the round
      setConsoleMsg(`${targetTeam.name} passed. Turn goes to ${opponentTeam.name}.`);
      // Opponent gets uncontested bidding
      setBiddingMode('uncontested');
      setActiveTurn(opponentTeam.id);
      setBidInputVal((player.base_price || 1.0).toString());
    } else {
      // Bidding had started, meaning opponent team wins at the currentBid
      setConsoleMsg(`${targetTeam.name} passed! ${opponentTeam.name} wins ${player.name} for $${currentBid}M.`);
      addPlayerToTeam(opponentTeam.id, player, currentBid);
    }
  };

  // ----------------------------------------------------
  // Match Simulator
  // ----------------------------------------------------

  const simulateMatch = () => {
    const t1 = team1;
    const t2 = team2;

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);

    // Randomly decide total goals (0-7), split into two halves
    const totalGoals = rand(0, 7);
    const htGoals = rand(0, totalGoals); // goals by halftime
    const ftGoals = totalGoals - htGoals; // second half goals

    // Scoreline: randomly split goals between teams
    const events = [];
    const usedMinutes = new Set();

    const getMinute = (from, to) => {
      let m;
      do { m = rand(from, to); } while (usedMinutes.has(m));
      usedMinutes.add(m);
      return m;
    };

    const allT1 = t1.players.filter(p => p.position !== 'GK');
    const allT2 = t2.players.filter(p => p.position !== 'GK');
    const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

    let t1Score = 0, t2Score = 0;

    // Generate goal events for first half
    for (let i = 0; i < htGoals; i++) {
      const scoringTeamId = Math.random() < 0.5 ? 'team1' : 'team2';
      const scorerPool = scoringTeamId === 'team1' ? allT1 : allT2;
      const assisterPool = scoringTeamId === 'team1' ? allT1 : allT2;
      const scorer = pickRandom(scorerPool);
      const assisterCandidates = assisterPool.filter(p => p.name !== scorer.name);
      const assister = assisterCandidates.length > 0 && Math.random() > 0.25 ? pickRandom(assisterCandidates) : null;
      if (scoringTeamId === 'team1') t1Score++; else t2Score++;
      events.push({
        half: 1,
        minute: getMinute(1, 45),
        team: scoringTeamId,
        scorer: scorer.name,
        assister: assister ? assister.name : null
      });
    }

    // Generate goal events for second half
    for (let i = 0; i < ftGoals; i++) {
      const scoringTeamId = Math.random() < 0.5 ? 'team1' : 'team2';
      const scorerPool = scoringTeamId === 'team1' ? allT1 : allT2;
      const assisterPool = scoringTeamId === 'team1' ? allT1 : allT2;
      const scorer = pickRandom(scorerPool);
      const assisterCandidates = assisterPool.filter(p => p.name !== scorer.name);
      const assister = assisterCandidates.length > 0 && Math.random() > 0.25 ? pickRandom(assisterCandidates) : null;
      if (scoringTeamId === 'team1') t1Score++; else t2Score++;
      events.push({
        half: 2,
        minute: getMinute(46, 90),
        team: scoringTeamId,
        scorer: scorer.name,
        assister: assister ? assister.name : null
      });
    }

    events.sort((a, b) => a.minute - b.minute);

    // Halftime scores
    const htT1 = events.filter(e => e.half === 1 && e.team === 'team1').length;
    const htT2 = events.filter(e => e.half === 1 && e.team === 'team2').length;

    const winner = t1Score > t2Score ? 'team1' : t2Score > t1Score ? 'team2' : 'draw';

    // Scorers and assisters sets
    const scorers = new Set(events.map(e => e.scorer));
    const assisters = new Set(events.filter(e => e.assister).map(e => e.assister));

    // Generate per-player performance ratings out of 5
    const generateRatings = (players, teamId) => {
      return players.map(p => {
        let base = randFloat(2.0, 3.5);
        if (winner === teamId) base = Math.min(5, base + randFloat(0.5, 1.2));
        if (scorers.has(p.name)) base = Math.min(5, base + randFloat(0.4, 0.8));
        if (assisters.has(p.name)) base = Math.min(5, base + randFloat(0.3, 0.6));
        return { ...p, matchRating: Math.min(5, +base.toFixed(1)) };
      });
    };

    const t1Rated = generateRatings(t1.players, 'team1');
    const t2Rated = generateRatings(t2.players, 'team2');

    setMatchData({
      t1Score, t2Score, htT1, htT2,
      winner,
      events,
      t1Players: t1Rated,
      t2Players: t2Rated
    });
    setStage('match');
  };

  // ----------------------------------------------------
  // Render Stages
  // ----------------------------------------------------

  // ----------------------------------------------------
  // Auction Result Stage
  // ----------------------------------------------------

  if (stage === 'auction_result') {
    const t1Valid = hasValidPositions(team1.players);
    const t2Valid = hasValidPositions(team2.players);
    const t1Rating = team1.players.reduce((s, p) => s + p.rating, 0);
    const t2Rating = team2.players.reduce((s, p) => s + p.rating, 0);

    // Determine auction winner
    let auctionWinner, auctionWinnerDetail;
    if (t1Valid && t2Valid) {
      if (t1Rating > t2Rating) {
        auctionWinner = 'team1';
        auctionWinnerDetail = `${team1.name} wins the auction with a higher squad rating (${t1Rating} vs ${t2Rating}).`;
      } else if (t2Rating > t1Rating) {
        auctionWinner = 'team2';
        auctionWinnerDetail = `${team2.name} wins the auction with a higher squad rating (${t2Rating} vs ${t1Rating}).`;
      } else {
        auctionWinner = 'draw';
        auctionWinnerDetail = `Both teams finished with equal squad ratings (${t1Rating}). It's a tie!`;
      }
    } else if (t1Valid && !t2Valid) {
      auctionWinner = 'team1';
      auctionWinnerDetail = `${team1.name} wins — ${team2.name} failed to build a valid squad.`;
    } else if (t2Valid && !t1Valid) {
      auctionWinner = 'team2';
      auctionWinnerDetail = `${team2.name} wins — ${team1.name} failed to build a valid squad.`;
    } else {
      auctionWinner = 'none';
      auctionWinnerDetail = 'Neither team completed a valid squad. No auction winner.';
    }

    const canPlayMatch = t1Valid && t2Valid;

    // Per-team rule check breakdown
    const ruleCheck = (players) => {
      const c = getRosterCounts(players);
      return [
        { label: 'Exactly 7 players', pass: players.length === 7, detail: `${players.length}/7` },
        { label: 'Exactly 1 Goalkeeper', pass: c.gk === 1, detail: `${c.gk} GK` },
        { label: 'At least 2 Defenders', pass: c.def >= 2, detail: `${c.def} DEF` },
        { label: 'At least 1 Midfielder', pass: c.mid >= 1, detail: `${c.mid} MID` },
        { label: 'At least 1 Finisher', pass: c.fin >= 1, detail: `${c.fin} FIN` },
      ];
    };

    const t1Rules = ruleCheck(team1.players);
    const t2Rules = ruleCheck(team2.players);

    const winnerBgColor = auctionWinner === 'draw' ? '#f59e0b' : auctionWinner === 'none' ? '#ef4444' : '#10b981';

    return (
      <div className="modal-overlay">
        <div className="modal-content results-modal" style={{ maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', gap: 18 }}>
          <h2 style={{ color: '#3b82f6' }}>🏟️ Auction Results</h2>

          {/* Auction Winner Banner */}
          <div style={{
            background: `linear-gradient(135deg, ${winnerBgColor}22, ${winnerBgColor}11)`,
            border: `2px solid ${winnerBgColor}`,
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: 'center'
          }}>
            {auctionWinner === 'team1' && (
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--team-a-color)' }}>🏆 {team1.name} wins the Auction!</div>
            )}
            {auctionWinner === 'team2' && (
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--team-b-color)' }}>🏆 {team2.name} wins the Auction!</div>
            )}
            {auctionWinner === 'draw' && (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>🤝 Auction Draw!</div>
            )}
            {auctionWinner === 'none' && (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>❌ No Auction Winner</div>
            )}
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>{auctionWinnerDetail}</div>
          </div>

          {/* Rosters + Rule checks side by side */}
          <div className="results-columns">
            {/* Team 1 */}
            <div className="results-column team-a" style={{ borderColor: t1Valid ? 'var(--team-a-color)' : '#ef4444' }}>
              <h3 className="results-title" style={{ color: t1Valid ? 'var(--team-a-color)' : '#ef4444' }}>
                {t1Valid ? '✅' : '❌'} {team1.name}
              </h3>

              {/* Rule checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                {t1Rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', background: r.pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 4, border: `1px solid ${r.pass ? '#10b981' : '#ef4444'}44` }}>
                    <span style={{ color: r.pass ? '#10b981' : '#ef4444' }}>{r.pass ? '✓' : '✗'} {r.label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.detail}</span>
                  </div>
                ))}
              </div>

              <div className="results-list">
                {team1.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>{p.position}</span>
                      <span className="item-name">{p.name}</span>
                    </div>
                    <div className="item-right">
                      <span>${p.buy_price}M</span>
                      <span className="item-rating">{p.rating}⭐</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                <span>Total Rating: {t1Rating}</span>
                <span>Budget left: ${team1.money}M</span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="results-column team-b" style={{ borderColor: t2Valid ? 'var(--team-b-color)' : '#ef4444' }}>
              <h3 className="results-title" style={{ color: t2Valid ? 'var(--team-b-color)' : '#ef4444' }}>
                {t2Valid ? '✅' : '❌'} {team2.name}
              </h3>

              {/* Rule checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                {t2Rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', background: r.pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 4, border: `1px solid ${r.pass ? '#10b981' : '#ef4444'}44` }}>
                    <span style={{ color: r.pass ? '#10b981' : '#ef4444' }}>{r.pass ? '✓' : '✗'} {r.label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.detail}</span>
                  </div>
                ))}
              </div>

              <div className="results-list">
                {team2.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>{p.position}</span>
                      <span className="item-name">{p.name}</span>
                    </div>
                    <div className="item-right">
                      <span>${p.buy_price}M</span>
                      <span className="item-rating">{p.rating}⭐</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                <span>Total Rating: {t2Rating}</span>
                <span>Budget left: ${team2.money}M</span>
              </div>
            </div>
          </div>

          {/* Match eligibility notice */}
          {!canPlayMatch && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>⛔ Match Simulation Unavailable</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Both teams must have a fully valid squad (7 players with correct positions) to play a match.
              </div>
            </div>
          )}

          {canPlayMatch && (
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 18 }} onClick={simulateMatch}>
              ⚽ Simulate Match!
            </button>
          )}
          <button className="btn-primary" style={{ background: 'var(--border-color)', marginTop: canPlayMatch ? -10 : 0 }} onClick={() => setStage('setup')}>
            🏠 Play Again
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Match Stage
  // ----------------------------------------------------

  if (stage === 'match' && matchData) {
    const { t1Score, t2Score, htT1, htT2, winner, events, t1Players, t2Players } = matchData;
    const winnerName = winner === 'team1' ? team1.name : winner === 'team2' ? team2.name : null;

    const ratingColor = (r) => {
      if (r >= 4.5) return '#10b981';
      if (r >= 3.5) return '#f59e0b';
      if (r >= 2.5) return '#9ca3af';
      return '#ef4444';
    };

    const RatingStars = ({ r }) => {
      const full = Math.floor(r);
      const half = r - full >= 0.5;
      return (
        <span style={{ color: ratingColor(r), fontWeight: 700, fontSize: 15 }}>
          {r.toFixed(1)} / 5.0
        </span>
      );
    };

    return (
      <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '20px', fontFamily: 'Outfit, sans-serif' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', marginBottom: 6 }}>⚽ BidBall Match</h1>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--team-a-color)' }}>{team1.name}</span>
            <div style={{ background: 'var(--panel-bg)', border: '3px solid var(--border-color)', borderRadius: 12, padding: '10px 32px', fontSize: 42, fontWeight: 900, letterSpacing: 6 }}>
              <span style={{ color: 'var(--team-a-color)' }}>{t1Score}</span>
              <span style={{ color: 'var(--text-secondary)', margin: '0 10px' }}>:</span>
              <span style={{ color: 'var(--team-b-color)' }}>{t2Score}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--team-b-color)' }}>{team2.name}</span>
          </div>
          {winner === 'draw' ? (
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b', marginTop: 10 }}>🤝 It's a Draw!</div>
          ) : (
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 10 }}>🏆 {winnerName} Win!</div>
          )}
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Half Time: {team1.name} {htT1} – {htT2} {team2.name}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {/* Goal Events */}
          <div style={{ gridColumn: '1 / -1', background: 'var(--panel-bg)', border: '2px solid var(--border-color)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ color: '#f59e0b', fontSize: 20, marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>📋 Match Events</h2>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No goals scored — 0–0 draw!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map((ev, i) => {
                  const isT1 = ev.team === 'team1';
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--bg-color)',
                      borderRadius: 8,
                      padding: '10px 16px',
                      borderLeft: `4px solid ${isT1 ? 'var(--team-a-color)' : 'var(--team-b-color)'}`
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700, minWidth: 40 }}>{ev.minute}'</span>
                      <span style={{ fontSize: 18 }}>⚽</span>
                      <div>
                        <span style={{ fontWeight: 700, color: isT1 ? 'var(--team-a-color)' : 'var(--team-b-color)' }}>
                          {ev.scorer}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {' '}({isT1 ? team1.name : team2.name})
                        </span>
                        {ev.assister && (
                          <span style={{ color: '#9ca3af', fontSize: 13 }}> — Assist: <strong style={{ color: '#d1d5db' }}>{ev.assister}</strong></span>
                        )}
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 12, background: isT1 ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: isT1 ? 'var(--team-a-color)' : 'var(--team-b-color)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                        {ev.half === 1 ? 'HT' : '2H'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team 1 Ratings */}
          <div style={{ background: 'var(--panel-bg)', border: `2px solid var(--team-a-color)`, borderRadius: 12, padding: 20 }}>
            <h2 style={{ color: 'var(--team-a-color)', fontSize: 18, marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              {team1.name} — Player Ratings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t1Players.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', borderRadius: 6, padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`item-pos ${p.position}`}>{p.position}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {events.some(e => e.scorer === p.name) && <span title="Goalscorer">⚽</span>}
                    {events.some(e => e.assister === p.name) && <span title="Assist">🎯</span>}
                  </div>
                  <RatingStars r={p.matchRating} />
                </div>
              ))}
            </div>
          </div>

          {/* Team 2 Ratings */}
          <div style={{ background: 'var(--panel-bg)', border: `2px solid var(--team-b-color)`, borderRadius: 12, padding: 20 }}>
            <h2 style={{ color: 'var(--team-b-color)', fontSize: 18, marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              {team2.name} — Player Ratings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t2Players.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', borderRadius: 6, padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`item-pos ${p.position}`}>{p.position}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {events.some(e => e.scorer === p.name) && <span title="Goalscorer">⚽</span>}
                    {events.some(e => e.assister === p.name) && <span title="Assist">🎯</span>}
                  </div>
                  <RatingStars r={p.matchRating} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '24px auto 0', display: 'flex', gap: 12 }}>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={simulateMatch}>
            🔄 Simulate Again
          </button>
          <button className="btn-primary" style={{ background: 'var(--border-color)' }} onClick={() => setStage('setup')}>
            🏠 New Game
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'rules') {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>BidBall Rules</h2>
          <div className="rules-list">
            <div className="rule-item">
              <span className="rule-bullet">1.</span>
              <p>Each team starts with a budget of <strong>$35.0 Million</strong>.</p>
            </div>
            <div className="rule-item">
              <span className="rule-bullet">2.</span>
              <p>Each team must recruit exactly <strong>7 players</strong>.</p>
            </div>
            <div className="rule-item">
              <span className="rule-bullet">3.</span>
              <p>The squad <strong>MUST</strong> contain: 1 Goalkeeper (GK), 2 Defenders (DEF), 1 Midfielder (MID), and 1 Finisher (FIN). The remaining 2 slots can be DEF, MID, or FIN.</p>
            </div>
            <div className="rule-item">
              <span className="rule-bullet">4.</span>
              <p>The minimum bid is <strong>$1.0 Million</strong>. Bid increases must be multiples of <strong>$0.5 Million</strong> (e.g. 1.5, 2.0, 2.5). No other fractions (like 1.4 or 1.6) are allowed.</p>
            </div>
            <div className="rule-item">
              <span className="rule-bullet">5.</span>
              <p>Each player has an individual <strong>Base Price</strong>. Starting bids must be at least this value.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setStage('setup')}>
            I Understand
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="app-container">
        <div className="setup-form">
          <h2 style={{ color: '#3b82f6', borderBottom: 'none', padding: 0 }}>Register Teams</h2>
          <div className="form-group">
            <label>Team 1 Name (Blue)</label>
            <input
              type="text"
              className="form-input"
              value={team1Input}
              onChange={(e) => setTeam1Input(e.target.value)}
              placeholder="Enter Team 1 Name"
            />
          </div>
          <div className="form-group">
            <label>Team 2 Name (Red)</label>
            <input
              type="text"
              className="form-input"
              value={team2Input}
              onChange={(e) => setTeam2Input(e.target.value)}
              placeholder="Enter Team 2 Name"
            />
          </div>
          <button className="btn-primary" onClick={startGame}>
            Start Bidding
          </button>
        </div>
      </div>
    );
  }

  // Bidding Phase Layout
  const currentPlayer = auctionPlayers[currentPlayerIndex];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>BidBall</h1>
        <div className="header-status">
          Stage: Bidding | Player {currentPlayerIndex + 1} of 21
        </div>
      </header>

      {/* Main Grid */}
      <div className="game-grid">
        {/* Left / Center Auction Column */}
        <div className="auction-column">
          <div className="auction-status-bar">
            <div>
              <span>Next Starter: <strong>{starter === 'team1' ? team1.name : team2.name}</strong></span>
              <br />
              <span>
                Current Player: <strong>{currentPlayer?.name}</strong>
                <span className={`item-pos ${currentPlayer?.position}`} style={{ marginLeft: '8px' }}>
                  {currentPlayer?.position === 'GK' ? 'Goalkeeper' :
                   currentPlayer?.position === 'DEF' ? 'Defender' :
                   currentPlayer?.position === 'MID' ? 'Midfielder' :
                   'Finisher'}
                </span>
              </span>
            </div>
            <span>Auction Pool Remaining: <strong>{21 - currentPlayerIndex}</strong></span>
          </div>

          <div className="auction-main">
            {/* Current Player Card */}
            {currentPlayer && (
              <div className={`player-card ${currentPlayer.position.toLowerCase()}`}>
                <div className="player-position-header">
                  <span className={`player-position-badge ${currentPlayer.position}`}>
                    {currentPlayer.position === 'GK' ? 'Goalkeeper' :
                     currentPlayer.position === 'DEF' ? 'Defender' :
                     currentPlayer.position === 'MID' ? 'Midfielder' :
                     'Finisher'} 
                  </span>
                </div>

                <h2 className="player-name">{currentPlayer.name}</h2>

                <div className="player-meta">
                  <div className="meta-item">
                    <span className="meta-label">Rating</span>
                    <span className="meta-value">{currentPlayer.rating}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Base Price</span>
                    <span className="meta-value">${currentPlayer.base_price || 1.0}M</span>
                  </div>
                </div>

                {/* Live Bidding Box */}
                <div className="bid-info-box">
                  <div className="bid-info-row">
                    <span className="bid-info-label">Current Bid:</span>
                    <span className="bid-info-value">
                      {biddingStarted ? `$${currentBid}M` : 'No bids yet'}
                    </span>
                  </div>
                  <div className="bid-info-row">
                    <span className="bid-info-label">Highest Bidder:</span>
                    <span className="bid-info-value high-bid">
                      {highestBidder
                        ? (highestBidder === 'team1' ? team1.name : team2.name)
                        : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bidding Controls Panel */}
            <div className="team-panels-row">
              {/* Team 1 Control Panel */}
              <div className={`team-panel team-a ${activeTurn !== 'team1' ? 'inactive' : ''}`}>
                <div className="team-panel-header">
                  <span className="team-panel-title">{team1.name}</span>
                  {activeTurn === 'team1' && <span className="team-turn-indicator">YOUR TURN</span>}
                </div>
                <div className="team-panel-budget">Budget: ${team1.money}M</div>
                
                <div className="team-actions">
                  <button
                    className="btn-pass"
                    onClick={() => submitPass('team1')}
                    disabled={biddingMode === 'skipped'}
                  >
                    Pass
                  </button>
                  <div className="bid-input-group">
                    <input
                      type="number"
                      step="0.5"
                      className="bid-input"
                      value={activeTurn === 'team1' ? bidInputVal : ''}
                      onChange={(e) => setBidInputVal(e.target.value)}
                      disabled={biddingMode === 'skipped'}
                    />
                    <button
                      className="btn-bid"
                      onClick={() => submitBid('team1', parseFloat(bidInputVal))}
                      disabled={biddingMode === 'skipped'}
                    >
                      Bid
                    </button>
                  </div>
                </div>
              </div>

              {/* Team 2 Control Panel */}
              <div className={`team-panel team-b ${activeTurn !== 'team2' ? 'inactive' : ''}`}>
                <div className="team-panel-header">
                  <span className="team-panel-title">{team2.name}</span>
                  {activeTurn === 'team2' && <span className="team-turn-indicator">YOUR TURN</span>}
                </div>
                <div className="team-panel-budget">Budget: ${team2.money}M</div>

                <div className="team-actions">
                  <button
                    className="btn-pass"
                    onClick={() => submitPass('team2')}
                    disabled={biddingMode === 'skipped'}
                  >
                    Pass
                  </button>
                  <div className="bid-input-group">
                    <input
                      type="number"
                      step="0.5"
                      className="bid-input"
                      value={activeTurn === 'team2' ? bidInputVal : ''}
                      onChange={(e) => setBidInputVal(e.target.value)}
                      disabled={biddingMode === 'skipped'}
                    />
                    <button
                      className="btn-bid"
                      onClick={() => submitBid('team2', parseFloat(bidInputVal))}
                      disabled={biddingMode === 'skipped'}
                    >
                      Bid
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Skipping control when skipped */}
            {biddingMode === 'skipped' && (
              <button className="btn-primary" onClick={() => handleNextPlayer()}>
                Skip Player & Continue
              </button>
            )}

            {/* Live Console Alert */}
            {consoleMsg && (
              <div className="console-alert">
                <span>📣 {consoleMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Tracking Column */}
        <aside className="sidebar">
          {/* Team 1 Sidebar */}
          <div className="sidebar-panel team-a">
            <div className="sidebar-header">
              <span>{team1.name}</span>
              <span>${team1.money}M</span>
            </div>
            
            <div className="player-list">
              {team1.players.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  No signings yet.
                </div>
              ) : (
                team1.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>
                        {p.position === 'GK' ? 'GK' :
                         p.position === 'DEF' ? 'DEF' :
                         p.position === 'MID' ? 'MID' :
                         'FIN'}
                      </span>
                      <span className="item-name">{p.name}</span>
                    </div>
                    <div className="item-right">
                      <span>${p.buy_price}M</span>
                      <span className="item-rating">{p.rating}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-summary">
              <span>Roster: {team1.players.length}/7</span>
              <span>Total Rating: {team1.players.reduce((sum, p) => sum + p.rating, 0)}</span>
            </div>
            
            {/* Position counts helpful for user planning */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
              <span>GK: {getRosterCounts(team1.players).gk}/1</span>
              <span>DEF: {getRosterCounts(team1.players).def}/2+</span>
              <span>MID: {getRosterCounts(team1.players).mid}/1+</span>
              <span>FIN: {getRosterCounts(team1.players).fin}/1+</span>
            </div>
          </div>

          {/* Team 2 Sidebar */}
          <div className="sidebar-panel team-b">
            <div className="sidebar-header">
              <span>{team2.name}</span>
              <span>${team2.money}M</span>
            </div>

            <div className="player-list">
              {team2.players.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  No signings yet.
                </div>
              ) : (
                team2.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>
                        {p.position === 'GK' ? 'GK' :
                         p.position === 'DEF' ? 'DEF' :
                         p.position === 'MID' ? 'MID' :
                         'FIN'}
                      </span>
                      <span className="item-name">{p.name}</span>
                    </div>
                    <div className="item-right">
                      <span>${p.buy_price}M</span>
                      <span className="item-rating">{p.rating}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-summary">
              <span>Roster: {team2.players.length}/7</span>
              <span>Total Rating: {team2.players.reduce((sum, p) => sum + p.rating, 0)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
              <span>GK: {getRosterCounts(team2.players).gk}/1</span>
              <span>DEF: {getRosterCounts(team2.players).def}/2+</span>
              <span>MID: {getRosterCounts(team2.players).mid}/1+</span>
              <span>FIN: {getRosterCounts(team2.players).fin}/1+</span>
            </div>
          </div>
        </aside>
      </div>


    </div>
  );
}
