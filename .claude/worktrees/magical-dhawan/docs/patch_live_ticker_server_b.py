#!/usr/bin/env python3
"""Live-Ticker Verbesserungen auf Server B anwenden."""
path = "/root/ibu_sw/frontend/src/pages/LiveTicker.tsx"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# 1. Add locationService import
if "locationService" not in s:
    s = s.replace(
        "import { qualificationService, QualificationTable } from '../services/qualificationService';\nimport { Participant",
        "import { qualificationService, QualificationTable } from '../services/qualificationService';\nimport { locationService } from '../services/locationService';\nimport { Participant"
    )
    print("+ locationService import")

# 2. Add useCallback to imports
if "useCallback" not in s:
    s = s.replace("import { useEffect, useState } from 'react'", "import { useEffect, useState, useCallback } from 'react'")
    print("+ useCallback import")

# 3. Add spielfeldIdToName state and load in loadData
if "spielfeldIdToName" not in s:
    s = s.replace(
        "const [tournament, setTournament] = useState<Tournament | null>(null);\n  const [participants",
        "const [tournament, setTournament] = useState<Tournament | null>(null);\n  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});\n  const [participants"
    )
    s = s.replace(
        "setTournament(tournamentData);\n\n      const participantsData",
        """setTournament(tournamentData);

      const map: Record<number, string> = {};
      if (tournamentData.location_id) {
        try {
          const loc = await locationService.getById(tournamentData.location_id);
          (loc.spielfelder || []).forEach(s => { map[s.id] = s.name; });
        } catch { /* ignore */ }
      }
      setSpielfeldIdToName(map);

      const participantsData"""
    )
    print("+ spielfeldIdToName state and load")

# 4. Fix slides effect - remove setCurrentIndex(0), add tournamentId effect
if "setCurrentIndex(0);\n  }, [groups," in s:
    s = s.replace(
        "setSlides(newSlides);\n    setCurrentIndex(0);\n  }, [groups, groupMatches, groupTables, koMatches, qualificationTable]);",
        """setSlides(newSlides);
  }, [groups, groupMatches, groupTables, koMatches, qualificationTable]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [tournamentId]);"""
    )
    print("+ slide rotation fix")
elif "}, [tournamentId]);" not in s or "setCurrentIndex(0)" not in s.split("}, [tournamentId]")[0][-200:]:
    # Try alternate pattern
    pass

# 5. Add goNext, goPrev
if "const goNext" not in s:
    s = s.replace(
        "const currentSlide = slides[currentIndex];\n\n  const renderHeader",
        """const currentSlide = slides[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % Math.max(1, slides.length));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % Math.max(1, slides.length));
  }, [slides.length]);

  const renderHeader"""
    )
    print("+ goNext/goPrev handlers")

# 6. Update group table columns
if 'th style={{ padding: \'0.75rem\', textAlign: \'left\' }}>Runde</th>' in s or "Runde</th>" in s and "Spiel, Spielfeld" not in s:
    # Replace Runde/Spiel/.../Ort with Spiel/Spielfeld/...
    s = s.replace(
        """<th style={{ padding: '0.75rem', textAlign: 'left' }}>Runde</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ort</th>""",
        """<th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spielfeld</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>"""
    )
    s = s.replace(
        """<td style={{ padding: '0.75rem' }}>Runde {match.round}</td>
                  <td style={{ padding: '0.75rem' }}>Spiel {match.match_no}""",
        """<td style={{ padding: '0.75rem' }}>Spiel {match.match_no}"""
    )
    s = s.replace(
        """<td style={{ padding: '0.75rem', textAlign: 'center' }}>{(match as any).venue_label || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderKoMatches""",
        """<td style={{ padding: '0.75rem' }}>{match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player1_id)}</td>
                  <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player2_id)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {match.score1 !== null && match.score2 !== null ? `${match.score1} : ${match.score2}` : '- : -'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderKoMatches"""
    )
    # That replacement might be wrong - the group matches section has different structure. Let me do simpler replacements.
    print("Tables - manual check may be needed")

# Simpler: just do key replacements
# Group matches: remove Runde column td, change Ort to Spielfeld with spielfeldIdToName
old_td_runde = "<td style={{ padding: '0.75rem' }}>Runde {match.round}</td>\n                  <td style={{ padding: '0.75rem' }}>Spiel {match.match_no}"
if old_td_runde in s:
    s = s.replace(old_td_runde, "<td style={{ padding: '0.75rem' }}>Spiel {match.match_no}")
    print("+ removed Runde column (group)")
s = s.replace("(match as any).venue_label || '-'", "match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '–'")
if "venue_label" not in s:
    print("+ venue_label -> spielfeldIdToName")

# 7. Main div click and nav buttons
if "goNext" in s and "onClick={slides.length > 1 ? goNext" not in s:
    s = s.replace(
        """return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      background: theme.colors.background.primary,
      color: theme.colors.text.primary
    }}>""",
        """return (
    <div
      style={{
        padding: '2rem',
        minHeight: '100vh',
        background: theme.colors.background.primary,
        color: theme.colors.text.primary,
        cursor: slides.length > 1 ? 'pointer' : 'default'
      }}
      onClick={slides.length > 1 ? goNext : undefined}
      role="button"
      tabIndex={slides.length > 1 ? 0 : undefined}
      onKeyDown={e => slides.length > 1 && (e.key === 'ArrowRight' || e.key === ' ') && (e.preventDefault(), goNext())}
      aria-label={slides.length > 1 ? 'Klick fuer naechste Folie' : undefined}
    >"""
    )
    print("+ click to advance")
if "Vorherige Folie" not in s and "Folie {currentIndex + 1}" in s:
    s = s.replace(
        """<div style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        background: theme.colors.background.card,
        padding: '0.5rem 0.75rem',
        borderRadius: theme.borderRadius.card,
        border: `1px solid ${theme.colors.border.standard}`,
        fontSize: '0.875rem',
        color: theme.colors.text.secondary
      }}>
        Folie {currentIndex + 1} / {slides.length}
      </div>""",
        """<div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: theme.colors.background.card,
        padding: '0.5rem 1rem',
        borderRadius: theme.borderRadius.card,
        border: `1px solid ${theme.colors.border.standard}`,
        fontSize: '0.875rem',
        color: theme.colors.text.secondary
      }}>
        <button type="button" onClick={e => { e.stopPropagation(); goPrev(); }} disabled={slides.length <= 1}
          style={{ background: 'transparent', border: 'none', cursor: slides.length > 1 ? 'pointer' : 'not-allowed', padding: '0.25rem 0.5rem', fontSize: '1rem', color: theme.colors.text.secondary }}
          aria-label="Vorherige Folie">&#8249;</button>
        <span>Folie {currentIndex + 1} / {slides.length}</span>
        <button type="button" onClick={e => { e.stopPropagation(); goNext(); }} disabled={slides.length <= 1}
          style={{ background: 'transparent', border: 'none', cursor: slides.length > 1 ? 'pointer' : 'not-allowed', padding: '0.25rem 0.5rem', fontSize: '1rem', color: theme.colors.text.secondary }}
          aria-label="Naechste Folie">&#8250;</button>
      </div>"""
    )
    print("+ prev/next buttons")

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("LiveTicker.tsx patched. Rebuild: docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend")
