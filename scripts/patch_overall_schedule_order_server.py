#!/usr/bin/env python3
from pathlib import Path

path = Path("/root/ibu_sw/frontend/src/components/tournament/TournamentOverallScheduleContent.tsx")
text = path.read_text(encoding="utf-8")

old_sort = """          const roundMatches = matches
            .filter(m => m.round === round)
            .sort((a, b) => {
              const ga = groupNameById[a.group_id] || '';
              const gb = groupNameById[b.group_id] || '';
              if (ga !== gb) return ga.localeCompare(gb);
              return a.match_no - b.match_no;
            });
"""
new_sort = """          const roundMatches = matches
            .filter(m => m.round === round)
            .sort((a, b) => {
              if (a.match_no !== b.match_no) return a.match_no - b.match_no;
              const ga = groupNameById[a.group_id] || '';
              const gb = groupNameById[b.group_id] || '';
              if (ga !== gb) return ga.localeCompare(gb);
              return a.id - b.id;
            });
"""

if old_sort in text:
    text = text.replace(old_sort, new_sort, 1)

text = text.replace("roundMatches.map((match) => {", "roundMatches.map((match, idx) => {", 1)
text = text.replace("<td style={{ padding: '0.75rem' }}>#{match.match_no}</td>", "<td style={{ padding: '0.75rem' }}>#{idx + 1}</td>", 1)

path.write_text(text, encoding="utf-8")
print("TournamentOverallScheduleContent updated")
