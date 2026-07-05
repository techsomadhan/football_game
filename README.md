# Football Bidding Game (BidBall)

A strategic football squad building game where two teams compete to build the best 7-player squad within a $35M budget through an auction system.

## Game Rules

### Team Composition Requirements
Each team must build a squad of exactly 7 players with the following mandatory positions:
- **1 Goalkeeper (GK)** - No more, no less
- **At least 2 Defenders (DEF)** - Can have more
- **At least 1 Midfielder (MID)** - Can have more
- **At least 1 Finisher (FIN)** - Can have more

The remaining 2 slots can be filled with any combination of DEF, MID, or FIN players.

### Budget & Bidding
- Each team starts with $35.0M budget
- Players have individual base prices that must be met or exceeded
- Bids must be in increments of $0.5M (e.g., 1.0, 1.5, 2.0, etc.)
- Minimum bid is $1.0M

### Auction Process
1. Players are auctioned one at a time from a mixed pool
2. Teams take turns bidding or passing
3. If both teams pass, the player is skipped
4. The auction continues until both teams have 7 players or all players are auctioned

### Winning Conditions
1. Teams must have a valid 7-player squad with all mandatory positions filled
2. Teams that don't meet position requirements lose automatically
3. Between valid teams, the one with the higher total player ratings wins

## Implementation Details

The game logic enforces the mandatory positions through two key functions:

### `canAddPosition(roster, pos)`
Checks if a player with a specific position can be added to a roster without preventing the team from meeting the mandatory requirements.

### `hasValidPositions(players)`
Validates that a completed roster meets all mandatory position requirements.

## Running the Game

### Web Version (React)
```bash
npm install
npm run dev
```

### CLI Version
```bash
python football_game_cli.py
```

Enjoy building your ultimate football squad!