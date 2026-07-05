import sys
sys.path.append('d:/X-falcon-233/football_game')
from football_game import Team
import itertools

def get_all_valid_teams():
    # A valid team has exactly 7 players:
    # 1 GK
    # at least 2 DEF
    # at least 1 MID
    # at least 1 FIN
    # Let's find all combinations of positions that sum to 7 and satisfy these.
    positions_pool = ["GK", "DEF", "MID", "FIN"]
    valid_combos = []
    # Generate all combinations of length 7 with replacement
    for combo in itertools.combinations_with_replacement(positions_pool, 7):
        gks = combo.count("GK")
        defs = combo.count("DEF")
        mids = combo.count("MID")
        fins = combo.count("FIN")
        if gks == 1 and defs >= 2 and mids >= 1 and fins >= 1:
            valid_combos.append(list(combo))
    return valid_combos

def verify_recruitment_paths():
    valid_combos = get_all_valid_teams()
    print(f"Total valid squad position combinations: {len(valid_combos)}")
    for combo in valid_combos:
        print(f"Valid combination: {combo}")
        
    blocked_paths = 0
    total_paths = 0
    
    for combo in valid_combos:
        # Check all unique permutations of this combination
        perms = list(set(itertools.permutations(combo)))
        for perm in perms:
            total_paths += 1
            # Try to build the team step-by-step
            team = Team("Test")
            path_blocked = False
            for pos in perm:
                allowed = team.can_add_position(pos)
                if not allowed:
                    path_blocked = True
                    break
                team.add_player({"name": "Test", "position": pos, "rating": 80}, 1.0)
            if path_blocked:
                blocked_paths += 1
                print(f"BLOCKED PATH: Could not build {combo} in order {perm}")
                
    print(f"Total paths checked: {total_paths}")
    print(f"Blocked paths: {blocked_paths}")

if __name__ == "__main__":
    verify_recruitment_paths()
