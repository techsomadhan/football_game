import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';
import './index.css';

// ----------------------------------------------------
// Client-only helpers (display only, no game logic)
// ----------------------------------------------------

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

// ----------------------------------------------------
// App
// ----------------------------------------------------

export default function App() {
  // ---- Lobby / connection state ----
  const [lobbyStage, setLobbyStage] = useState('home'); // 'home' | 'creating' | 'joining' | 'waiting'
  const [myTeamId, setMyTeamId] = useState(null);       // 'team1' | 'team2'
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [lobbyError, setLobbyError] = useState('');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);

  // ---- Team name inputs (lobby) ----
  const [myTeamNameInput, setMyTeamNameInput] = useState('');
  const [opponentTeamName, setOpponentTeamName] = useState('');

  // ---- Mirrored game state from server ----
  const [gameState, setGameState] = useState(null);

  // ---- Local bid input value ----
  const [bidInputVal, setBidInputVal] = useState('');

  // Ref so socket event handlers always see the latest myTeamId
  // without needing to re-register listeners on every render
  const myTeamIdRef = useRef(null);

  // -------------------------------------------------------
  // Socket lifecycle — runs ONCE on mount only
  // -------------------------------------------------------
  useEffect(() => {
    socket.connect();

    socket.on('roomCreated', ({ roomCode: code, teamId }) => {
      myTeamIdRef.current = teamId;
      setRoomCode(code);
      setMyTeamId(teamId);
      setLobbyStage('waiting');
      setLobbyError('');
    });

    socket.on('roomJoined', ({ roomCode: code, teamId }) => {
      myTeamIdRef.current = teamId;
      setRoomCode(code);
      setMyTeamId(teamId);
      setLobbyStage('waiting');
      setLobbyError('');
    });

    socket.on('playerJoined', ({ team1Name, team2Name }) => {
      // Use ref so we always get the latest teamId (not stale closure)
      setOpponentTeamName(myTeamIdRef.current === 'team1' ? team2Name : team1Name);
      setOpponentConnected(true);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
      setOpponentLeft(false);
      // Pre-fill bid input when it's my turn
      if (state.stage === 'bidding') {
        const currentPlayer = state.auctionPlayers[state.currentPlayerIndex];
        if (currentPlayer) {
          const basePrice = currentPlayer.base_price || 1.0;
          const minBid = state.biddingStarted
            ? (Math.round((state.currentBid + 0.5) * 10) / 10).toFixed(1)
            : basePrice.toString();
          setBidInputVal(minBid);
        }
      }
    });

    socket.on('opponentDisconnected', () => {
      setOpponentLeft(true);
    });

    socket.on('roomError', ({ message }) => {
      setLobbyError(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('playerJoined');
      socket.off('gameState');
      socket.off('opponentDisconnected');
      socket.off('roomError');
      socket.disconnect();
    };
  }, []); // Empty deps — socket connects once and stays connected

  // -------------------------------------------------------
  // Lobby Actions
  // -------------------------------------------------------

  const handleCreateRoom = () => {
    setLobbyError('');
    socket.emit('createRoom', { teamName: myTeamNameInput.trim() || 'Team A' });
  };

  const handleJoinRoom = () => {
    setLobbyError('');
    if (!joinInput.trim()) {
      setLobbyError('Please enter a room code.');
      return;
    }
    socket.emit('joinRoom', {
      roomCode: joinInput.trim().toUpperCase(),
      teamName: myTeamNameInput.trim() || 'Team B'
    });
  };

  const handleStartGame = () => {
    const t1Name = myTeamId === 'team1' ? (myTeamNameInput.trim() || 'Team A') : opponentTeamName;
    const t2Name = myTeamId === 'team2' ? (myTeamNameInput.trim() || 'Team B') : opponentTeamName;
    socket.emit('startGame', { team1Name: t1Name, team2Name: t2Name });
  };

  // -------------------------------------------------------
  // Game Actions — emit to server
  // -------------------------------------------------------

  const submitBid = useCallback((teamId, amount) => {
    socket.emit('bid', { amount });
  }, []);

  const submitPass = useCallback((teamId) => {
    socket.emit('pass');
  }, []);

  const handleSkipPlayer = useCallback(() => {
    socket.emit('skipPlayer');
  }, []);

  const handleSimulateMatch = useCallback(() => {
    socket.emit('simulateMatch');
  }, []);

  const handlePlayAgain = useCallback(() => {
    socket.emit('playAgain');
    setGameState(null);
  }, []);

  // -------------------------------------------------------
  // Derived state from server gameState
  // -------------------------------------------------------

  const gs = gameState;
  const stage = gs?.stage || null;
  const team1 = gs?.team1 || { id: 'team1', name: 'Team A', money: 35.0, players: [] };
  const team2 = gs?.team2 || { id: 'team2', name: 'Team B', money: 35.0, players: [] };
  const auctionPlayers = gs?.auctionPlayers || [];
  const currentPlayerIndex = gs?.currentPlayerIndex || 0;
  const biddingMode = gs?.biddingMode || 'normal';
  const activeTurn = gs?.activeTurn || null;
  const currentBid = gs?.currentBid || 0;
  const highestBidder = gs?.highestBidder || null;
  const biddingStarted = gs?.biddingStarted || false;
  const consoleMsg = gs?.consoleMsg || '';
  const matchData = gs?.matchData || null;
  const currentPlayer = auctionPlayers[currentPlayerIndex];

  const isMyTurn = activeTurn === myTeamId;

  // -------------------------------------------------------
  // LOBBY — Home Screen
  // -------------------------------------------------------

  if (!stage || stage === 'lobby_waiting') {
    if (lobbyStage === 'home') {
      return (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460, gap: 20 }}>
            <h2 style={{ color: '#3b82f6', textAlign: 'center', fontSize: 28 }}>⚽ BidBall</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: -10 }}>
              Real-Time Multiplayer Football Auction
            </p>

            <div className="form-group">
              <label>Your Team Name</label>
              <input
                type="text"
                className="form-input"
                value={myTeamNameInput}
                onChange={e => setMyTeamNameInput(e.target.value)}
                placeholder="Enter your team name"
                maxLength={20}
              />
            </div>

            <button className="btn-primary" onClick={handleCreateRoom}>
              🏟️ Create Room
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              OR JOIN
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>

            <div className="bid-input-group" style={{ width: '100%' }}>
              <input
                type="text"
                className="bid-input"
                style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 3 }}
                value={joinInput}
                onChange={e => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
              />
              <button className="btn-bid" onClick={handleJoinRoom}>
                Join
              </button>
            </div>

            {lobbyError && (
              <div className="console-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
                <span>⚠️ {lobbyError}</span>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Works on same Wi-Fi or any network
            </div>
          </div>
        </div>
      );
    }

    // Waiting for opponent / game to start
    const bothConnected = opponentConnected;

    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: 440, gap: 20, textAlign: 'center' }}>
          <h2 style={{ color: '#3b82f6' }}>⚽ Room Ready</h2>

          {myTeamId === 'team1' && (
            <>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Share this code with your opponent:</div>
                <div style={{
                  fontSize: 42, fontWeight: 900, letterSpacing: 10,
                  color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                  border: '2px solid #f59e0b', borderRadius: 12, padding: '12px 24px',
                  display: 'inline-block'
                }}>
                  {roomCode}
                </div>
                <button
                  style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}
                  onClick={() => navigator.clipboard.writeText(roomCode)}
                >
                  📋 Copy Code
                </button>
              </div>

              {!bothConnected ? (
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div className="loading-dot" />
                  Waiting for opponent to join…
                </div>
              ) : (
                <>
                  <div style={{ color: '#10b981', fontWeight: 600 }}>✅ Opponent connected!</div>
                  <button className="btn-primary" onClick={handleStartGame}>
                    🚀 Start Auction
                  </button>
                </>
              )}
            </>
          )}

          {myTeamId === 'team2' && (
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div className="loading-dot" />
              Waiting for host to start the game…
            </div>
          )}

          {opponentLeft && (
            <div className="console-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
              <span>⚠️ Opponent disconnected.</span>
            </div>
          )}

          {lobbyError && (
            <div className="console-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
              <span>⚠️ {lobbyError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // RULES stage (server sets this? No — we show rules locally
  // before the lobby. Rules are shown in the home screen via modal.)
  // -------------------------------------------------------

  // -------------------------------------------------------
  // AUCTION RESULT Stage
  // -------------------------------------------------------

  if (stage === 'auction_result') {
    const t1Valid = hasValidPositions(team1.players);
    const t2Valid = hasValidPositions(team2.players);
    const t1Rating = team1.players.reduce((s, p) => s + p.rating, 0);
    const t2Rating = team2.players.reduce((s, p) => s + p.rating, 0);

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
    const winnerBgColor = auctionWinner === 'draw' ? '#f59e0b' : auctionWinner === 'none' ? '#ef4444' : '#10b981';

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

    return (
      <div className="modal-overlay">
        <div className="modal-content results-modal" style={{ maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', gap: 18 }}>
          <h2 style={{ color: '#3b82f6' }}>🏟️ Auction Results</h2>

          <div style={{
            background: `linear-gradient(135deg, ${winnerBgColor}22, ${winnerBgColor}11)`,
            border: `2px solid ${winnerBgColor}`,
            borderRadius: 12, padding: '16px 20px', textAlign: 'center'
          }}>
            {auctionWinner === 'team1' && <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--team-a-color)' }}>🏆 {team1.name} wins the Auction!</div>}
            {auctionWinner === 'team2' && <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--team-b-color)' }}>🏆 {team2.name} wins the Auction!</div>}
            {auctionWinner === 'draw' && <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>🤝 Auction Draw!</div>}
            {auctionWinner === 'none' && <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>❌ No Auction Winner</div>}
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>{auctionWinnerDetail}</div>
          </div>

          <div className="results-columns">
            {/* Team 1 */}
            <div className="results-column team-a" style={{ borderColor: t1Valid ? 'var(--team-a-color)' : '#ef4444' }}>
              <h3 className="results-title" style={{ color: t1Valid ? 'var(--team-a-color)' : '#ef4444' }}>
                {t1Valid ? '✅' : '❌'} {team1.name}
              </h3>
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

          {!canPlayMatch && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>⛔ Match Simulation Unavailable</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Both teams must have a fully valid squad (7 players with correct positions) to play a match.
              </div>
            </div>
          )}

          {canPlayMatch && (
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 18 }} onClick={handleSimulateMatch}>
              ⚽ Simulate Match!
            </button>
          )}

          {myTeamId === 'team1' && (
            <button className="btn-primary" style={{ background: 'var(--border-color)', marginTop: canPlayMatch ? -10 : 0 }} onClick={handlePlayAgain}>
              🏠 Play Again
            </button>
          )}
          {myTeamId === 'team2' && (
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Waiting for host to restart…</div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // MATCH Stage
  // -------------------------------------------------------

  if (stage === 'match' && matchData) {
    const { t1Score, t2Score, htT1, htT2, winner, events, t1Players, t2Players } = matchData;
    const winnerName = winner === 'team1' ? team1.name : winner === 'team2' ? team2.name : null;

    const ratingColor = (r) => {
      if (r >= 4.5) return '#10b981';
      if (r >= 3.5) return '#f59e0b';
      if (r >= 2.5) return '#9ca3af';
      return '#ef4444';
    };

    const RatingStars = ({ r }) => (
      <span style={{ color: ratingColor(r), fontWeight: 700, fontSize: 15 }}>
        {r.toFixed(1)} / 5.0
      </span>
    );

    return (
      <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '20px', fontFamily: 'Outfit, sans-serif' }}>
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
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-color)', borderRadius: 8, padding: '10px 16px', borderLeft: `4px solid ${isT1 ? 'var(--team-a-color)' : 'var(--team-b-color)'}` }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700, minWidth: 40 }}>{ev.minute}'</span>
                      <span style={{ fontSize: 18 }}>⚽</span>
                      <div>
                        <span style={{ fontWeight: 700, color: isT1 ? 'var(--team-a-color)' : 'var(--team-b-color)' }}>{ev.scorer}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}> ({isT1 ? team1.name : team2.name})</span>
                        {ev.assister && <span style={{ color: '#9ca3af', fontSize: 13 }}> — Assist: <strong style={{ color: '#d1d5db' }}>{ev.assister}</strong></span>}
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
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={handleSimulateMatch}>
            🔄 Simulate Again
          </button>
          {myTeamId === 'team1' && (
            <button className="btn-primary" style={{ background: 'var(--border-color)' }} onClick={handlePlayAgain}>
              🏠 New Game
            </button>
          )}
          {myTeamId === 'team2' && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center' }}>Waiting for host to restart…</span>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // BIDDING Stage
  // -------------------------------------------------------

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>BidBall</h1>
        <div className="header-status">
          Room: <strong style={{ color: '#f59e0b', letterSpacing: 2 }}>{roomCode}</strong>
          {' '}| Player {currentPlayerIndex + 1} of 21
          {' '}| You: <strong style={{ color: myTeamId === 'team1' ? 'var(--team-a-color)' : 'var(--team-b-color)' }}>
            {myTeamId === 'team1' ? team1.name : team2.name}
          </strong>
        </div>
      </header>

      {/* Opponent disconnected banner */}
      {opponentLeft && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', padding: '8px 16px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
          ⚠️ Opponent disconnected. Waiting for them to reconnect…
        </div>
      )}

      {/* Main Grid */}
      <div className="game-grid">
        {/* Left / Center Auction Column */}
        <div className="auction-column">
          <div className="auction-status-bar">
            <div>
              <span>Next Starter: <strong>{gs?.starter === 'team1' ? team1.name : team2.name}</strong></span>
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
                    disabled={biddingMode === 'skipped' || (myTeamId !== 'team1')}
                  >
                    Pass
                  </button>
                  <div className="bid-input-group">
                    <input
                      type="number"
                      step="0.5"
                      className="bid-input"
                      value={activeTurn === 'team1' && myTeamId === 'team1' ? bidInputVal : ''}
                      onChange={(e) => setBidInputVal(e.target.value)}
                      disabled={biddingMode === 'skipped' || myTeamId !== 'team1'}
                    />
                    <button
                      className="btn-bid"
                      onClick={() => submitBid('team1', parseFloat(bidInputVal))}
                      disabled={biddingMode === 'skipped' || myTeamId !== 'team1'}
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
                    disabled={biddingMode === 'skipped' || myTeamId !== 'team2'}
                  >
                    Pass
                  </button>
                  <div className="bid-input-group">
                    <input
                      type="number"
                      step="0.5"
                      className="bid-input"
                      value={activeTurn === 'team2' && myTeamId === 'team2' ? bidInputVal : ''}
                      onChange={(e) => setBidInputVal(e.target.value)}
                      disabled={biddingMode === 'skipped' || myTeamId !== 'team2'}
                    />
                    <button
                      className="btn-bid"
                      onClick={() => submitBid('team2', parseFloat(bidInputVal))}
                      disabled={biddingMode === 'skipped' || myTeamId !== 'team2'}
                    >
                      Bid
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Skip when skipped */}
            {biddingMode === 'skipped' && (
              <button className="btn-primary" onClick={handleSkipPlayer}>
                Skip Player & Continue
              </button>
            )}

            {/* Console Alert */}
            {consoleMsg && (
              <div className="console-alert">
                <span>📣 {consoleMsg}</span>
              </div>
            )}

            {/* Not your turn notice */}
            {!isMyTurn && biddingMode !== 'skipped' && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                ⏳ Waiting for <strong>{activeTurn === 'team1' ? team1.name : team2.name}</strong> to act…
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
                <div style={{ padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>No signings yet.</div>
              ) : (
                team1.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>{p.position}</span>
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
                <div style={{ padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>No signings yet.</div>
              ) : (
                team2.players.map((p, idx) => (
                  <div className="player-list-item" key={idx}>
                    <div className="item-left">
                      <span className={`item-pos ${p.position}`}>{p.position}</span>
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
