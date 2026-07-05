import random

# ==========================
# PLAYER DATABASE (FIXED RATINGS)
# ==========================

player_pool = [
    # Goalkeepers
    {"name": "Courtois", "position": "GK", "rating": 90, "base_price": 4.0},
    {"name": "Alisson", "position": "GK", "rating": 89, "base_price": 3.5},
    {"name": "Ederson", "position": "GK", "rating": 88, "base_price": 3.0},
    {"name": "Ter Stegen", "position": "GK", "rating": 89, "base_price": 3.5},
    {"name": "Donnarumma", "position": "GK", "rating": 88, "base_price": 3.0},
    {"name": "Oblak", "position": "GK", "rating": 88, "base_price": 3.0},
    {"name": "Maignan", "position": "GK", "rating": 87, "base_price": 2.5},
    {"name": "Neuer", "position": "GK", "rating": 87, "base_price": 2.5},
    {"name": "Emi Martinez", "position": "GK", "rating": 86, "base_price": 2.0},
    {"name": "Onana", "position": "GK", "rating": 84, "base_price": 1.0},
    {"name": "Raya", "position": "GK", "rating": 84, "base_price": 1.0},
    {"name": "Vicario", "position": "GK", "rating": 83, "base_price": 1.0},
    {"name": "Lunin", "position": "GK", "rating": 83, "base_price": 1.0},
    {"name": "Sommer", "position": "GK", "rating": 85, "base_price": 1.5},
    {"name": "Bounou", "position": "GK", "rating": 84, "base_price": 1.0},
    {"name": "Trapp", "position": "GK", "rating": 83, "base_price": 1.0},
    {"name": "Pope", "position": "GK", "rating": 83, "base_price": 1.0},
    {"name": "Kobel", "position": "GK", "rating": 85, "base_price": 1.5},
    {"name": "Szczesny", "position": "GK", "rating": 84, "base_price": 1.0},
    {"name": "Mendy", "position": "GK", "rating": 82, "base_price": 1.0},

    # Defenders
    {"name": "Van Dijk", "position": "DEF", "rating": 90, "base_price": 4.0},
    {"name": "Ruben Dias", "position": "DEF", "rating": 89, "base_price": 3.5},
    {"name": "Saliba", "position": "DEF", "rating": 88, "base_price": 3.0},
    {"name": "Araujo", "position": "DEF", "rating": 88, "base_price": 3.0},
    {"name": "Rudiger", "position": "DEF", "rating": 88, "base_price": 3.0},
    {"name": "Bastoni", "position": "DEF", "rating": 87, "base_price": 2.5},
    {"name": "Hakimi", "position": "DEF", "rating": 87, "base_price": 2.5},
    {"name": "Theo Hernandez", "position": "DEF", "rating": 87, "base_price": 2.5},
    {"name": "Walker", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Trent", "position": "DEF", "rating": 87, "base_price": 2.5},
    {"name": "Robertson", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Kounde", "position": "DEF", "rating": 85, "base_price": 1.5},
    {"name": "Militao", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Marquinhos", "position": "DEF", "rating": 87, "base_price": 2.5},
    {"name": "Stones", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Pau Torres", "position": "DEF", "rating": 84, "base_price": 1.0},
    {"name": "Akanji", "position": "DEF", "rating": 84, "base_price": 1.0},
    {"name": "Kim Min-jae", "position": "DEF", "rating": 85, "base_price": 1.5},
    {"name": "De Ligt", "position": "DEF", "rating": 85, "base_price": 1.5},
    {"name": "Reece James", "position": "DEF", "rating": 84, "base_price": 1.0},
    {"name": "Mendes", "position": "DEF", "rating": 84, "base_price": 1.0},
    {"name": "Carvajal", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Cancelo", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Gvardiol", "position": "DEF", "rating": 86, "base_price": 2.0},
    {"name": "Tomori", "position": "DEF", "rating": 84, "base_price": 1.0},
    {"name": "Bremer", "position": "DEF", "rating": 85, "base_price": 1.5},

    # Midfielders
    {"name": "Rodri", "position": "MID", "rating": 91, "base_price": 4.0},
    {"name": "De Bruyne", "position": "MID", "rating": 91, "base_price": 4.0},
    {"name": "Bellingham", "position": "MID", "rating": 90, "base_price": 4.0},
    {"name": "Valverde", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Pedri", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Musiala", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Kimmich", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Modric", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Kroos", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Rice", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Bruno Fernandes", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Bernardo Silva", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Odegaard", "position": "MID", "rating": 88, "base_price": 3.0},
    {"name": "Frenkie De Jong", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Enzo Fernandez", "position": "MID", "rating": 85, "base_price": 1.5},
    {"name": "Gundogan", "position": "MID", "rating": 86, "base_price": 2.0},
    {"name": "Mac Allister", "position": "MID", "rating": 86, "base_price": 2.0},
    {"name": "Camavinga", "position": "MID", "rating": 86, "base_price": 2.0},
    {"name": "Tchouameni", "position": "MID", "rating": 86, "base_price": 2.0},
    {"name": "Vitinha", "position": "MID", "rating": 85, "base_price": 1.5},
    {"name": "Wirtz", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Maddison", "position": "MID", "rating": 85, "base_price": 1.5},
    {"name": "Xavi Simons", "position": "MID", "rating": 84, "base_price": 1.0},
    {"name": "Gavi", "position": "MID", "rating": 84, "base_price": 1.0},
    {"name": "Tonali", "position": "MID", "rating": 84, "base_price": 1.0},
    {"name": "Barella", "position": "MID", "rating": 87, "base_price": 2.5},
    {"name": "Szoboszlai", "position": "MID", "rating": 84, "base_price": 1.0},

    # Finishers
    {"name": "Mbappe", "position": "FIN", "rating": 92, "base_price": 4.0},
    {"name": "Haaland", "position": "FIN", "rating": 91, "base_price": 4.0},
    {"name": "Vinicius", "position": "FIN", "rating": 90, "base_price": 4.0},
    {"name": "Kane", "position": "FIN", "rating": 90, "base_price": 4.0},
    {"name": "Lewandowski", "position": "FIN", "rating": 89, "base_price": 3.5},
    {"name": "Salah", "position": "FIN", "rating": 89, "base_price": 3.5},
    {"name": "Son", "position": "FIN", "rating": 88, "base_price": 3.0},
    {"name": "Saka", "position": "FIN", "rating": 88, "base_price": 3.0},
    {"name": "Griezmann", "position": "FIN", "rating": 88, "base_price": 3.0},
    {"name": "Osimhen", "position": "FIN", "rating": 87, "base_price": 2.5},
    {"name": "Lautaro", "position": "FIN", "rating": 88, "base_price": 3.0},
    {"name": "Neymar", "position": "FIN", "rating": 87, "base_price": 2.5},
    {"name": "Rashford", "position": "FIN", "rating": 85, "base_price": 1.5},
    {"name": "Dembele", "position": "FIN", "rating": 86, "base_price": 2.0},
    {"name": "Julian Alvarez", "position": "FIN", "rating": 86, "base_price": 2.0},
    {"name": "Kolo Muani", "position": "FIN", "rating": 84, "base_price": 1.0},
    {"name": "Isak", "position": "FIN", "rating": 85, "base_price": 1.5},
    {"name": "Chiesa", "position": "FIN", "rating": 84, "base_price": 1.0},
    {"name": "Rodrygo", "position": "FIN", "rating": 87, "base_price": 2.5},
    {"name": "Leao", "position": "FIN", "rating": 86, "base_price": 2.0},
    {"name": "Messi", "position": "FIN", "rating": 89, "base_price": 3.5},
    {"name": "Cristiano Ronaldo", "position": "FIN", "rating": 87, "base_price": 2.5},
    {"name": "Yamal", "position": "FIN", "rating": 82, "base_price": 1.0},
    {"name": "Foden", "position": "FIN", "rating": 88, "base_price": 3.0},
    {"name": "Palmer", "position": "FIN", "rating": 85, "base_price": 1.5},
    {"name": "Gyokeres", "position": "FIN", "rating": 84, "base_price": 1.0},
    {"name": "Watkins", "position": "FIN", "rating": 84, "base_price": 1.0}
]

# ==========================
# TEAM CLASS
# ==========================

class Team:
    def __init__(self, name):
        self.name = name
        self.money = 35.0
        self.players = []

    def add_player(self, player, bid):
        self.players.append(player)
        self.money = round(self.money - bid, 1)

    def total_rating(self):
        return sum(player["rating"] for player in self.players)

    def can_add_position(self, pos):
        # Cannot add more than 7 players
        if len(self.players) >= 7:
            return False

        # Calculate goalkeeper count after adding this player
        gk_new = sum(1 for p in self.players if p["position"] == "GK") + (1 if pos == "GK" else 0)

        # Cannot have more than 1 goalkeeper
        if gk_new > 1:
            return False

        return True

    def has_valid_positions(self):
        if len(self.players) != 7:
            return False
        gks = sum(1 for p in self.players if p["position"] == "GK")
        defs = sum(1 for p in self.players if p["position"] == "DEF")
        mids = sum(1 for p in self.players if p["position"] == "MID")
        fins = sum(1 for p in self.players if p["position"] == "FIN")
        # Must have exactly 1 GK, at least 2 DEF, at least 1 MID, at least 1 FIN
        # The remaining 2 players can be DEF, MID, or FIN
        return gks == 1 and defs >= 2 and mids >= 1 and fins >= 1

# ==========================
# AUCTION PLAYER GENERATION
# ==========================

def sample_mixed_ratings(pool, count):
    sorted_pool = sorted(pool, key=lambda x: x["rating"], reverse=True)
    n = len(sorted_pool)
    if n < count:
        return random.sample(sorted_pool, count)
    
    tier_size = n // 3
    top_tier = sorted_pool[:tier_size]
    mid_tier = sorted_pool[tier_size:2*tier_size]
    low_tier = sorted_pool[2*tier_size:]
    
    selected = []
    base_share = count // 3
    extra = count % 3
    
    shares = [base_share, base_share, base_share]
    if extra == 1:
        shares[1] += 1
    elif extra == 2:
        shares[0] += 1
        shares[2] += 1
        
    selected.extend(random.sample(top_tier, shares[0]))
    selected.extend(random.sample(mid_tier, shares[1]))
    selected.extend(random.sample(low_tier, shares[2]))
    
    return selected

def generate_auction_players():
    selected = []
    gks = [p for p in player_pool if p["position"] == "GK"]
    defs = [p for p in player_pool if p["position"] == "DEF"]
    mids = [p for p in player_pool if p["position"] == "MID"]
    fins = [p for p in player_pool if p["position"] == "FIN"]

    selected.extend(sample_mixed_ratings(gks, 3))
    selected.extend(sample_mixed_ratings(defs, 5))
    selected.extend(sample_mixed_ratings(mids, 6))
    selected.extend(sample_mixed_ratings(fins, 7))

    random.shuffle(selected)
    return selected

def show_teams(team1, team2):
    print("\n========== CURRENT TEAMS ==========")
    for team in [team1, team2]:
        print(f"\n{team.name} | Money Left: ${team.money}M")
        print("-" * 35)
        if not team.players:
            print("No players yet.")
        else:
            for player in team.players:
                print(f"Name: {player['name']} | Pos: {player['position']} | Rating: {player['rating']}")
        print(f"Total Rating: {team.total_rating()}")

def parse_bid(bid_str):
    try:
        val = float(bid_str)
        if val >= 1.0 and abs(val * 2 - round(val * 2)) < 1e-9:
            return round(val, 1)
    except ValueError:
        pass
    return None

def is_eligible(team, player):
    base_price = player.get("base_price", 1.0)
    return team.can_add_position(player["position"]) and team.money >= base_price

# ==========================
# BIDDING PHASE
# ==========================

def bidding(players, team1, team2):
    starter = team1
    for player in players:
        if len(team1.players) == 7 and len(team2.players) == 7:
            print("\nBoth teams have completed their 7-player squads!")
            break

        first_eligible = is_eligible(team1 if starter == team1 else team2, player)
        second_eligible = is_eligible(team2 if starter == team1 else team1, player)
        base_price = player.get("base_price", 1.0)

        if not first_eligible and not second_eligible:
            print("\n==============================")
            print(f"{player['name']} | {player['position']} | Rating: {player['rating']} | Base Price: ${base_price}M")
            print("Neither team is eligible to add this position/afford this player. Skipped.")
            continue

        print("\n==============================")
        print(f"{player['name']} | {player['position']} | Rating: {player['rating']} | Base Price: ${base_price}M")

        if starter == team1:
            first = team1
            second = team2
        else:
            first = team2
            second = team1

        current_bid = 0.0
        highest_bidder = None

        if first_eligible and not second_eligible:
            print(f"{second.name} is not eligible to bid for this player.")
            print(f"\n{first.name}'s turn (Money left: ${first.money}M)")
            while True:
                choice = input("Bid or Pass? (b/p): ").lower().strip()
                if choice in ["b", "p"]:
                    break
                print("Invalid input.")

            if choice == "p":
                print(f"{first.name} passed. No one bought {player['name']}.")
                continue
            else:
                while True:
                    bid_str = input(f"Enter bid amount (min ${base_price}M, max ${first.money}M): ")
                    bid = parse_bid(bid_str)
                    if bid is not None and base_price <= bid <= first.money:
                        first.add_player(player, bid)
                        print(f"\n{first.name} bought {player['name']} for ${bid}M")
                        show_teams(team1, team2)
                        starter = first
                        break
                    else:
                        print(f"Invalid bid. Must be >= ${base_price}M, multiple of 0.5, and within your budget.")
                continue

        elif second_eligible and not first_eligible:
            print(f"{first.name} is not eligible to bid for this player.")
            print(f"\n{second.name}'s turn (Money left: ${second.money}M)")
            while True:
                choice = input("Bid or Pass? (b/p): ").lower().strip()
                if choice in ["b", "p"]:
                    break
                print("Invalid input.")

            if choice == "p":
                print(f"{second.name} passed. No one bought {player['name']}.")
                continue
            else:
                while True:
                    bid_str = input(f"Enter bid amount (min ${base_price}M, max ${second.money}M): ")
                    bid = parse_bid(bid_str)
                    if bid is not None and base_price <= bid <= second.money:
                        second.add_player(player, bid)
                        print(f"\n{second.name} bought {player['name']} for ${bid}M")
                        show_teams(team1, team2)
                        starter = second
                        break
                    else:
                        print(f"Invalid bid. Must be >= ${base_price}M, multiple of 0.5, and within your budget.")
                continue

        print(f"\n{first.name}'s turn (Money left: ${first.money}M)")
        while True:
            choice = input("Bid or Pass? (b/p): ").lower().strip()
            if choice in ["b", "p"]:
                break
            print("Invalid input.")

        if choice == "p":
            print(f"{first.name} passed.")
            print(f"\n{second.name}'s turn (Money left: ${second.money}M)")
            while True:
                choice2 = input("Bid or Pass? (b/p): ").lower().strip()
                if choice2 in ["b", "p"]:
                    break
                print("Invalid input.")

            if choice2 == "p":
                print(f"{second.name} passed. No one bought {player['name']}.")
                continue
            else:
                while True:
                    bid_str = input(f"Enter bid amount (min ${base_price}M, max ${second.money}M): ")
                    bid = parse_bid(bid_str)
                    if bid is not None and base_price <= bid <= second.money:
                        second.add_player(player, bid)
                        print(f"\n{second.name} bought {player['name']} for ${bid}M")
                        show_teams(team1, team2)
                        starter = second
                        break
                    else:
                        print(f"Invalid bid. Must be >= ${base_price}M, multiple of 0.5, and within your budget.")
                continue
        else:
            while True:
                bid_str = input(f"Enter bid amount (min ${base_price}M, max ${first.money}M): ")
                bid = parse_bid(bid_str)
                if bid is not None and base_price <= bid <= first.money:
                    current_bid = bid
                    highest_bidder = first
                    break
                else:
                    print(f"Invalid bid. Must be >= ${base_price}M, multiple of 0.5, and within your budget.")

        turn = second
        while True:
            print(f"\nCurrent Bid: ${current_bid}M by {highest_bidder.name}")
            min_raise = round(current_bid + 0.5, 1)
            if turn.money < min_raise:
                print(f"{turn.name} cannot afford to raise the bid (requires at least ${min_raise}M, has ${turn.money}M).")
                highest_bidder.add_player(player, current_bid)
                print(f"\n{highest_bidder.name} bought {player['name']} for ${current_bid}M")
                show_teams(team1, team2)
                starter = highest_bidder
                break
                
            print(f"{turn.name}'s turn (Money left: ${turn.money}M)")
            while True:
                choice = input("Bid or Pass? (b/p): ").lower().strip()
                if choice in ["b", "p"]:
                    break
                print("Invalid input.")

            if choice == "p":
                highest_bidder.add_player(player, current_bid)
                print(f"\n{highest_bidder.name} bought {player['name']} for ${current_bid}M")
                show_teams(team1, team2)
                starter = highest_bidder
                break
            else:
                while True:
                    bid_str = input(f"Enter bid (must be more than ${current_bid}M, max ${turn.money}M): ")
                    new_bid = parse_bid(bid_str)
                    if new_bid is not None and current_bid < new_bid <= turn.money:
                        current_bid = new_bid
                        highest_bidder = turn
                        break
                    else:
                        print(f"Invalid bid. Must be greater than ${current_bid}M, multiple of 0.5, and within your budget.")

            turn = team1 if turn == team2 else team2

# ==========================
# RESULT CHECK
# ==========================

def result(team1, team2):
    team1_valid = True
    team2_valid = True

    if len(team1.players) < 7:
        print(f"{team1.name} could not complete 7 players.")
        team1_valid = False

    if len(team2.players) < 7:
        print(f"{team2.name} could not complete 7 players.")
        team2_valid = False

    if team1_valid and not team1.has_valid_positions():
        print(f"{team1.name} does not have all required positions.")
        team1_valid = False

    if team2_valid and not team2.has_valid_positions():
        print(f"{team2.name} does not have all required positions.")
        team2_valid = False

    if team1.money < 0:
        print(f"{team1.name} ran out of money.")
        team1_valid = False

    if team2.money < 0:
        print(f"{team2.name} ran out of money.")
        team2_valid = False

    if not team1_valid and not team2_valid:
        return "BOTH LOST"

    if team1_valid and not team2_valid:
        return team1.name

    if team2_valid and not team1_valid:
        return team2.name

    team1_rating = team1.total_rating()
    team2_rating = team2.total_rating()

    print("\n========== FINAL TEAMS ==========")
    print(f"\n{team1.name}:")
    for p in team1.players:
        print(f"{p['name']} ({p['position']}) - {p['rating']}")
    print("Total Rating:", team1_rating)

    print(f"\n{team2.name}:")
    for p in team2.players:
        print(f"{p['name']} ({p['position']}) - {p['rating']}")
    print("Total Rating:", team2_rating)

    if team1_rating > team2_rating:
        return team1.name
    elif team2_rating > team1_rating:
        return team2.name
    else:
        return "DRAW"

# ==========================
# MAIN GAME
# ==========================

def main():
    print("===== FOOTBALL BIDDING GAME =====")
    team1_name = input("Enter Team 1 name: ")
    team2_name = input("Enter Team 2 name: ")

    team1 = Team(team1_name)
    team2 = Team(team2_name)
    auction_players = generate_auction_players()

    bidding(auction_players, team1, team2)
    winner = result(team1, team2)

    print("\n==============================")
    print("Winner:", winner)
    print("==============================")

if __name__ == "__main__":
    main()
