#!/usr/bin/env python3
"""Debug consolation bracket generation"""
import sys
sys.path.insert(0, '/app')

import math

def _log2_int(x: int) -> int:
    """Calculate log2 and round to integer"""
    return int(round(math.log2(x))) if x > 0 else 0

# Simulate the logic
consolation_size = 8
rounds_total = _log2_int(consolation_size)

print(f"consolation_size = {consolation_size}")
print(f"rounds_total = {rounds_total}")
print(f"\nFirst round matches: {consolation_size // 2}")

print(f"\nSubsequent rounds (r in range(2, {rounds_total + 1})):")
for r in range(2, rounds_total + 1):
    mcount = max(1, consolation_size // (2 ** r))
    print(f"  r={r}, Round -{r}: mcount = max(1, {consolation_size} // {2**r}) = {mcount} matches")

print(f"\nExpected structure for 8 participants:")
print(f"  Round -1: 4 matches (first round)")
print(f"  Round -2: 2 matches (semi-final)")
print(f"  Round -3: 1 match (final)")
