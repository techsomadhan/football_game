#!/usr/bin/env python3

# Test script for mandatory positions logic

import sys
sys.path.append('D:/X-falcon-233/football_game')
from football_game import Team

def test_squad_scenario(name, positions, expected_valid):
    print(f"\n--- Testing Scenario: {name} (Expected: {'Valid' if expected_valid else 'Invalid'}) ---")
    team = Team(name)
    all_steps_allowed = True
    
    for i, pos in enumerate(positions):
        allowed = team.can_add_position(pos)
        print(f"Step {i+1}: Adding {pos} | Allowed by can_add_position: {allowed}")
        if not allowed:
            all_steps_allowed = False
        # Add the player anyway to test the final has_valid_positions check
        player = {"name": f"Player {i+1}", "position": pos, "rating": 80}
        team.add_player(player, 1.0)
        
    final_valid = team.has_valid_positions()
    print(f"All steps allowed: {all_steps_allowed}")
    print(f"Final has_valid_positions(): {final_valid}")
    
    # Assertions
    if expected_valid:
        assert all_steps_allowed, f"Scenario '{name}' should have allowed all additions, but some were blocked."
        assert final_valid, f"Scenario '{name}' should be valid, but has_valid_positions returned False."
        print("RESULT: PASS (Valid squad successfully created)")
    else:
        # For invalid squad, either some step should be blocked OR the final squad should be invalid
        assert (not all_steps_allowed) or (not final_valid), f"Scenario '{name}' should have failed, but it passed."
        print("RESULT: PASS (Invalid squad correctly identified/blocked)")

def run_all_tests():
    print("Starting comprehensive squad composition tests...")
    
    # 1. Standard valid team: 1 GK, 2 DEF, 1 MID, 1 FIN, + 2 DEF (flex)
    test_squad_scenario(
        "Standard Valid (Flex: 2 DEF)",
        ["GK", "DEF", "DEF", "MID", "FIN", "DEF", "DEF"],
        expected_valid=True
    )

    # 2. Standard valid team: 1 GK, 2 DEF, 1 MID, 1 FIN, + 2 MID (flex)
    test_squad_scenario(
        "Standard Valid (Flex: 2 MID)",
        ["GK", "DEF", "DEF", "MID", "FIN", "MID", "MID"],
        expected_valid=True
    )

    # 3. Standard valid team: 1 GK, 2 DEF, 1 MID, 1 FIN, + 2 FIN (flex)
    test_squad_scenario(
        "Standard Valid (Flex: 2 FIN)",
        ["GK", "DEF", "DEF", "MID", "FIN", "FIN", "FIN"],
        expected_valid=True
    )

    # 4. Mixed valid team: 1 GK, 3 DEF, 2 MID, 1 FIN
    test_squad_scenario(
        "Standard Valid (Flex: 1 DEF, 1 MID)",
        ["GK", "DEF", "DEF", "MID", "FIN", "DEF", "MID"],
        expected_valid=True
    )

    # 5. Invalid team: 2 GKs
    test_squad_scenario(
        "Invalid: Too Many GKs",
        ["GK", "GK", "DEF", "DEF", "MID", "FIN", "DEF"],
        expected_valid=False
    )

    # 6. Invalid team: No GK
    test_squad_scenario(
        "Invalid: No GK",
        ["DEF", "DEF", "DEF", "MID", "MID", "FIN", "FIN"],
        expected_valid=False
    )

    # 7. Invalid team: Not enough DEF (only 1)
    test_squad_scenario(
        "Invalid: Not Enough DEF",
        ["GK", "DEF", "MID", "MID", "FIN", "FIN", "FIN"],
        expected_valid=False
    )

    # 8. Invalid team: No MID
    test_squad_scenario(
        "Invalid: No MID",
        ["GK", "DEF", "DEF", "DEF", "FIN", "FIN", "FIN"],
        expected_valid=False
    )

    # 9. Invalid team: No FIN
    test_squad_scenario(
        "Invalid: No FIN",
        ["GK", "DEF", "DEF", "MID", "MID", "MID", "MID"],
        expected_valid=False
    )

    print("\nAll tests completed successfully!")

if __name__ == "__main__":
    run_all_tests()