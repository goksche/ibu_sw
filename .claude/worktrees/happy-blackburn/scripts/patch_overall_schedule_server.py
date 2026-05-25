#!/usr/bin/env python3
"""Patch overall schedule + spielfeld assignment on server B (no uploads)."""
import os
import sys

BASE = "/root/ibu_sw"

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def ensure_file(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(path)

def patch_tournament_model():
    path = os.path.join(BASE, "backend", "app", "models", "tournament.py")
    s = read(path)
    if "spielfeld_assignment_mode" in s:
        print("tournament.py: spielfeld_assignment_mode already present")
        return True
    s = s.replace(
        "    show_matches = Column(Boolean, default=True, nullable=False)\n    show_tables = Column(Boolean, default=True, nullable=False)\n",
        "    show_matches = Column(Boolean, default=True, nullable=False)\n    show_tables = Column(Boolean, default=True, nullable=False)\n    spielfeld_assignment_mode = Column(String(20), default='random', nullable=True)\n",
        1
    )
    write(path, s)
    print("tournament.py: patched")
    return True

def patch_tournament_schema():
    path = os.path.join(BASE, "backend", "app", "schemas", "tournament.py")
    s = read(path)
    if "spielfeld_assignment_mode" in s:
        print("tournament.py schema: spielfeld_assignment_mode already present")
        return True
    s = s.replace(
        "    league_variant: LeagueVariant | None = LeagueVariant.CLASSIC\n    league_rounds_multiplier: int | None = None\n",
        "    league_variant: LeagueVariant | None = LeagueVariant.CLASSIC\n    league_rounds_multiplier: int | None = None\n    spielfeld_assignment_mode: str | None = Field(default=None, pattern='^(random|group_fixed|group_random)$')\n",
        1
    )
    s = s.replace(
        "    show_matches: bool = True\n    show_tables: bool = True\n    location_id: int | None = Field(default=None, description=\"Optional: Spielort für dieses Turnier\")\n",
        "    show_matches: bool = True\n    show_tables: bool = True\n    location_id: int | None = Field(default=None, description=\"Optional: Spielort für dieses Turnier\")\n    spielfeld_assignment_mode: str | None = Field(default='random', pattern='^(random|group_fixed|group_random)$')\n",
        1
    )
    s = s.replace(
        "    show_matches: bool | None = None\n    show_tables: bool | None = None\n    location_id: int | None = None\n",
        "    show_matches: bool | None = None\n    show_tables: bool | None = None\n    location_id: int | None = None\n    spielfeld_assignment_mode: str | None = Field(default=None, pattern='^(random|group_fixed|group_random)$')\n",
        1
    )
    s = s.replace(
        "    show_matches: bool\n    show_tables: bool\n    location_id: int | None = None\n",
        "    show_matches: bool\n    show_tables: bool\n    location_id: int | None = None\n    spielfeld_assignment_mode: str | None = None\n",
        1
    )
    write(path, s)
    print("tournament schema: patched")
    return True

def patch_group_model():
    path = os.path.join(BASE, "backend", "app", "models", "group.py")
    s = read(path)
    if "spielfeld_id" in s:
        print("group.py: spielfeld_id already present")
        return True
    s = s.replace(
        "    # Group Information\n    name = Column(String(50), nullable=False)\n",
        "    # Group Information\n    name = Column(String(50), nullable=False)\n    spielfeld_id = Column(Integer, ForeignKey(\"spielfelder.id\", ondelete=\"SET NULL\"), nullable=True)\n",
        1
    )
    s = s.replace(
        "    tournament = relationship(\"Tournament\", backref=\"groups\")\n",
        "    tournament = relationship(\"Tournament\", backref=\"groups\")\n    spielfeld = relationship(\"Spielfeld\", backref=\"groups\")\n",
        1
    )
    write(path, s)
    print("group.py: patched")
    return True

def patch_group_schema():
    path = os.path.join(BASE, "backend", "app", "schemas", "group.py")
    s = read(path)
    if "spielfeld_id" in s:
        print("group schema: spielfeld_id already present")
        return True
    s = s.replace(
        "class GroupCreate(GroupBase):\n    \"\"\"Schema for creating a group\"\"\"\n    tournament_id: int = Field(..., description=\"Tournament ID\")\n",
        "class GroupCreate(GroupBase):\n    \"\"\"Schema for creating a group\"\"\"\n    tournament_id: int = Field(..., description=\"Tournament ID\")\n    spielfeld_id: Optional[int] = Field(None, description=\"Spielfeld/Board ID\")\n",
        1
    )
    s = s.replace(
        "class GroupUpdate(BaseModel):\n    \"\"\"Schema for updating a group\"\"\"\n    name: Optional[str] = Field(None, min_length=1, max_length=50, description=\"Group name\")\n",
        "class GroupUpdate(BaseModel):\n    \"\"\"Schema for updating a group\"\"\"\n    name: Optional[str] = Field(None, min_length=1, max_length=50, description=\"Group name\")\n    spielfeld_id: Optional[int] = Field(None, description=\"Spielfeld/Board ID\")\n",
        1
    )
    s = s.replace(
        "class GroupResponse(GroupBase):\n    \"\"\"Schema for group response\"\"\"\n    id: int\n    tournament_id: int\n",
        "class GroupResponse(GroupBase):\n    \"\"\"Schema for group response\"\"\"\n    id: int\n    tournament_id: int\n    spielfeld_id: Optional[int] = None\n",
        1
    )
    write(path, s)
    print("group schema: patched")
    return True

def patch_tournaments_api():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "tournaments.py")
    s = read(path)
    if "spielfeld_assignment_mode" in s and "spielfeld_counts" in s:
        print("tournaments.py: round-robin assignment already patched")
        return True
    if "import random" not in s:
        s = s.replace("import math\n", "import math\nimport random\n", 1)
    if "from app.models.location import Spielfeld" not in s:
        s = s.replace(
            "from app.models.participant import TournamentParticipant, Participant\n",
            "from app.models.participant import TournamentParticipant, Participant\nfrom app.models.location import Spielfeld\n",
            1
        )
    old_block = """    # Get all groups for tournament\n    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()\n    if not groups:\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail=\"Keine Gruppen vorhanden. Bitte zuerst Gruppen erstellen.\"\n        )\n    \n    # Delete existing matches\n    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()\n    \n    # Generate matches for each group\n    total_matches = 0\n"""
    new_block = """    # Get all groups for tournament\n    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()\n    if not groups:\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail=\"Keine Gruppen vorhanden. Bitte zuerst Gruppen erstellen.\"\n        )\n    \n    spielfeld_ids: List[int] = []\n    if tournament.location_id:\n        spielfelder = (\n            db.query(Spielfeld)\n            .filter(Spielfeld.location_id == tournament.location_id)\n            .order_by(Spielfeld.sort_order, Spielfeld.id)\n            .all()\n        )\n        spielfeld_ids = [s.id for s in spielfelder]\n    \n    assignment_mode = tournament.spielfeld_assignment_mode or 'random'\n    rng = random.Random(tournament.ko_random_seed) if tournament.ko_random_seed is not None else random.Random()\n    \n    # Delete existing matches\n    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()\n    \n    # Generate matches for each group\n    total_matches = 0\n    matches_to_assign: List[Tuple[int, int, int, GroupMatch]] = []\n"""
    if old_block in s:
        s = s.replace(old_block, new_block, 1)
    else:
        print("tournaments.py: base block not found")
        return False
    s = s.replace(
        "                db.add(match)\n                total_matches += 1\n                match_no += 1\n    \n    db.commit()\n",
        "                db.add(match)\n                matches_to_assign.append((round_idx, group.id, match_no, match))\n                total_matches += 1\n                match_no += 1\n\n    if spielfeld_ids:\n        if assignment_mode == 'group_random':\n            group_to_spielfeld = {g.id: rng.choice(spielfeld_ids) for g in groups}\n            for _, group_id, __, match in matches_to_assign:\n                match.spielfeld_id = group_to_spielfeld.get(group_id)\n        elif assignment_mode == 'group_fixed':\n            group_to_spielfeld = {g.id: g.spielfeld_id for g in groups}\n            for _, group_id, __, match in matches_to_assign:\n                match.spielfeld_id = group_to_spielfeld.get(group_id)\n        else:\n            spielfeld_counts = {sid: 0 for sid in spielfeld_ids}\n            for _, group_id, match_no, match in sorted(\n                matches_to_assign,\n                key=lambda item: (item[0], item[1], item[2])\n            ):\n                if match.player1_id is None or match.player2_id is None:\n                    continue\n                min_count = min(spielfeld_counts.values())\n                candidates = [sid for sid, count in spielfeld_counts.items() if count == min_count]\n                chosen = rng.choice(candidates)\n                match.spielfeld_id = chosen\n                spielfeld_counts[chosen] += 1\n\n    db.commit()\n",
        1
    )
    write(path, s)
    print("tournaments.py: patched round-robin assignment")
    return True

def patch_frontend_group_service():
    path = os.path.join(BASE, "frontend", "src", "services", "groupService.ts")
    s = read(path)
    if "spielfeld_id" in s:
        print("groupService.ts: already has spielfeld_id")
        return True
    s = s.replace("  name: string;\n}", "  name: string;\n  spielfeld_id?: number | null;\n}", 1)
    s = s.replace("  name: string;\n}", "  name: string;\n  spielfeld_id?: number | null;\n}", 1)
    s = s.replace("export interface GroupUpdate {\n  name?: string;\n}\n", "export interface GroupUpdate {\n  name?: string;\n  spielfeld_id?: number | null;\n}\n", 1)
    write(path, s)
    print("groupService.ts: patched")
    return True

def patch_frontend_types():
    path = os.path.join(BASE, "frontend", "src", "types", "index.ts")
    s = read(path)
    if "spielfeld_id" in s:
        print("types index: spielfeld_id already present")
        return True
    s = s.replace("  name: string;\n}", "  name: string;\n  spielfeld_id?: number | null;\n}", 1)
    write(path, s)
    print("types index: patched")
    return True

def patch_tournament_groups_content():
    path = os.path.join(BASE, "frontend", "src", "components", "tournament", "TournamentGroupsContent.tsx")
    s = read(path)
    if "handleGroupSpielfeldChange" in s:
        print("TournamentGroupsContent: already patched")
        return True
    s = s.replace(
        "import { tournamentService } from '../../services/tournamentService';\n",
        "import { tournamentService } from '../../services/tournamentService';\nimport { locationService } from '../../services/locationService';\n",
        1
    )
    s = s.replace(
        "  const [_generateResult, setGenerateResult] = useState<{message: string, groups_processed?: number, matches_created?: number, groups_created?: number, participants_assigned?: number, distribution_method?: string} | null>(null);\n",
        "  const [_generateResult, setGenerateResult] = useState<{message: string, groups_processed?: number, matches_created?: number, groups_created?: number, participants_assigned?: number, distribution_method?: string} | null>(null);\n  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});\n",
        1
    )
    s = s.replace(
        "  useEffect(() => {\n    loadData();\n  }, [tournamentId]);\n",
        "  useEffect(() => {\n    loadData();\n  }, [tournamentId]);\n\n  useEffect(() => {\n    if (!tournament.location_id) {\n      setSpielfeldIdToName({});\n      return;\n    }\n    const loadLocations = async () => {\n      try {\n        const locations = await locationService.getAll();\n        const loc = locations.find(l => l.id === tournament.location_id);\n        if (loc?.spielfelder) {\n          const map: Record<number, string> = {};\n          loc.spielfelder.forEach(s => { map[s.id] = s.name; });\n          setSpielfeldIdToName(map);\n        } else {\n          setSpielfeldIdToName({});\n        }\n      } catch {\n        setSpielfeldIdToName({});\n      }\n    };\n    loadLocations();\n  }, [tournament.location_id]);\n",
        1
    )
    s = s.replace(
        "  const handleGenerateKOBracket = async () => {\n",
        "  const handleGenerateKOBracket = async () => {\n",
        1
    )
    insert_after = "  const handleGenerateKOBracket = async () => {\n"
    if insert_after in s:
        parts = s.split(insert_after, 1)
        head = parts[0]
        tail = insert_after + parts[1]
        extra = "\n  const spielfelderList = tournament.location_id\n    ? Object.entries(spielfeldIdToName).map(([id, name]) => ({ id: Number(id), name }))\n    : [];\n\n  const handleGroupSpielfeldChange = async (groupId: number, spielfeldId: number | null) => {\n    try {\n      await groupService.updateGroup(groupId, { spielfeld_id: spielfeldId });\n      loadData();\n    } catch (err) {\n      console.error('Failed to update group spielfeld:', err);\n      alert('Fehler beim Speichern des Spielfelds');\n    }\n  };\n"
        s = head + extra + tail
    s = s.replace(
        "              <div style={{ padding: '1rem' }}>\n",
        "              <div style={{ padding: '1rem' }}>\n                {tournament.spielfeld_assignment_mode === 'group_fixed' && (\n                  <div style={{ marginBottom: '1rem' }}>\n                    <label style={{ \n                      display: 'block', \n                      marginBottom: '0.35rem', \n                      fontSize: '0.875rem', \n                      color: theme.colors.text.secondary \n                    }}>\n                      Spielfeld (Gruppe)\n                    </label>\n                    {spielfelderList.length > 0 ? (\n                      <select\n                        value={group.spielfeld_id ?? ''}\n                        onChange={(e) => handleGroupSpielfeldChange(\n                          group.id,\n                          e.target.value === '' ? null : Number(e.target.value)\n                        )}\n                        style={{ \n                          width: '100%', \n                          padding: '0.5rem', \n                          border: `1px solid ${theme.colors.border.standard}`, \n                          borderRadius: theme.borderRadius.input,\n                          background: theme.colors.background.secondary,\n                          color: theme.colors.text.primary\n                        }}\n                      >\n                        <option value=\"\">– Kein Spielfeld –</option>\n                        {spielfelderList.map((sf) => (\n                          <option key={sf.id} value={sf.id}>\n                            {sf.name}\n                          </option>\n                        ))}\n                      </select>\n                    ) : (\n                      <div style={{ color: theme.colors.text.disabled, fontSize: '0.875rem' }}>\n                        Keine Spielfelder verfügbar (Location fehlt oder hat keine Spielfelder)\n                      </div>\n                    )}\n                  </div>\n                )}\n",
        1
    )
    write(path, s)
    print("TournamentGroupsContent: patched")
    return True

def patch_create_edit_labels():
    create_path = os.path.join(BASE, "frontend", "src", "pages", "CreateTournament.tsx")
    edit_path = os.path.join(BASE, "frontend", "src", "pages", "EditTournament.tsx")
    s = read(create_path)
    s = s.replace("Random – jedes Gruppenspiel zufälliges Spielfeld", "Gesamtspielplan (fair) – rundenbasiert über alle Gruppen")
    write(create_path, s)
    s = read(edit_path)
    s = s.replace("Random – jedes Gruppenspiel zufälliges Spielfeld", "Gesamtspielplan (fair) – rundenbasiert über alle Gruppen")
    write(edit_path, s)
    print("Create/Edit labels: patched")
    return True

def add_overall_component():
    path = os.path.join(BASE, "frontend", "src", "components", "tournament", "TournamentOverallScheduleContent.tsx")
    if os.path.isfile(path):
        print("TournamentOverallScheduleContent: already exists")
        return True
    content = """// Tournament Overall Schedule Content (Gesamtspielplan)\nimport { useEffect, useMemo, useState } from 'react';\nimport { useAuth } from '../../contexts/AuthContext';\nimport { matchService, GroupMatch } from '../../services/matchService';\nimport { groupService, Group } from '../../services/groupService';\nimport { participantService } from '../../services/participantService';\nimport { locationService } from '../../services/locationService';\nimport { Tournament, Participant } from '../../types';\nimport { theme } from '../../theme/theme';\nimport { Button } from '../ui';\n\ninterface TournamentOverallScheduleContentProps {\n  tournamentId: number;\n  tournament: Tournament;\n}\n\nexport default function TournamentOverallScheduleContent({ tournamentId, tournament }: TournamentOverallScheduleContentProps) {\n  const { canEdit } = useAuth();\n  const [matches, setMatches] = useState<GroupMatch[]>([]);\n  const [groups, setGroups] = useState<Group[]>([]);\n  const [participants, setParticipants] = useState<Participant[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);\n  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });\n  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});\n\n  useEffect(() => {\n    loadData();\n  }, [tournamentId]);\n\n  useEffect(() => {\n    if (!tournament.location_id) {\n      setSpielfeldIdToName({});\n      return;\n    }\n    const loadLocations = async () => {\n      try {\n        const locations = await locationService.getAll();\n        const loc = locations.find(l => l.id === tournament.location_id);\n        if (loc?.spielfelder) {\n          const map: Record<number, string> = {};\n          loc.spielfelder.forEach(s => { map[s.id] = s.name; });\n          setSpielfeldIdToName(map);\n        } else {\n          setSpielfeldIdToName({});\n        }\n      } catch {\n        setSpielfeldIdToName({});\n      }\n    };\n    loadLocations();\n  }, [tournament.location_id]);\n\n  const loadData = async () => {\n    try {\n      const [groupsData, matchesData] = await Promise.all([\n        groupService.getGroups(tournamentId),\n        matchService.getGroupMatches(tournamentId)\n      ]);\n      setGroups(groupsData);\n      setMatches(matchesData);\n\n      try {\n        const participantsData = await participantService.getTournamentParticipants(tournamentId);\n        setParticipants(participantsData);\n      } catch {\n        const participantsData = await participantService.getAll();\n        setParticipants(participantsData);\n      }\n    } catch (err) {\n      console.error('Failed to load overall schedule data:', err);\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  const groupNameById = useMemo(() => {\n    return groups.reduce<Record<number, string>>((acc, g) => {\n      acc[g.id] = g.name;\n      return acc;\n    }, {});\n  }, [groups]);\n\n  const participantById = useMemo(() => {\n    return participants.reduce<Record<number, Participant>>((acc, p) => {\n      acc[p.id] = p;\n      return acc;\n    }, {});\n  }, [participants]);\n\n  const rounds = useMemo(() => {\n    const unique = Array.from(new Set(matches.map(m => m.round)));\n    return unique.sort((a, b) => a - b);\n  }, [matches]);\n\n  const formatParticipant = (id: number | null) => {\n    if (!id) return '—';\n    const p = participantById[id];\n    if (!p) return `#${id}`;\n    return `${p.first_name} ${p.last_name}`;\n  };\n\n  const startEdit = (match: GroupMatch) => {\n    setEditingMatchId(match.id);\n    setScoreForm({\n      score1: match.score1 !== null && match.score1 !== undefined ? String(match.score1) : '',\n      score2: match.score2 !== null && match.score2 !== undefined ? String(match.score2) : ''\n    });\n  };\n\n  const cancelEdit = () => {\n    setEditingMatchId(null);\n    setScoreForm({ score1: '', score2: '' });\n  };\n\n  const saveEdit = async (matchId: number) => {\n    const score1 = scoreForm.score1 === '' ? null : Number(scoreForm.score1);\n    const score2 = scoreForm.score2 === '' ? null : Number(scoreForm.score2);\n    if ((score1 !== null && Number.isNaN(score1)) || (score2 !== null && Number.isNaN(score2))) {\n      alert('Bitte gültige Zahlen eingeben.');\n      return;\n    }\n    try {\n      const updated = await matchService.updateGroupMatch(matchId, { score1, score2 });\n      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));\n      cancelEdit();\n    } catch (err) {\n      console.error('Failed to update match:', err);\n      alert('Fehler beim Speichern des Ergebnisses');\n    }\n  };\n\n  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;\n\n  return (\n    <div>\n      {matches.length === 0 ? (\n        <p style={{ color: theme.colors.text.secondary }}>Noch keine Spiele vorhanden.</p>\n      ) : (\n        rounds.map((round) => {\n          const roundMatches = matches\n            .filter(m => m.round === round)\n            .sort((a, b) => {\n              const ga = groupNameById[a.group_id] || '';\n              const gb = groupNameById[b.group_id] || '';\n              if (ga !== gb) return ga.localeCompare(gb);\n              return a.match_no - b.match_no;\n            });\n\n          return (\n            <div key={round} style={{ marginBottom: '2rem' }}>\n              <h3 style={{ color: theme.colors.text.primary, marginBottom: '0.75rem' }}>\n                Gesamtrunde {round}\n              </h3>\n              <div style={{ overflowX: 'auto' }}>\n                <table style={{ width: '100%', borderCollapse: 'collapse' }}>\n                  <thead>\n                    <tr style={{ background: theme.colors.background.secondary }}>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Gruppe</th>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spielfeld</th>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>\n                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ergebnis</th>\n                      {canEdit && <th style={{ padding: '0.75rem', textAlign: 'left' }}></th>}\n                    </tr>\n                  </thead>\n                  <tbody>\n                    {roundMatches.map((match) => {\n                      const isEditing = editingMatchId === match.id;\n                      return (\n                        <tr key={match.id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}` }}>\n                          <td style={{ padding: '0.75rem' }}>{groupNameById[match.group_id] || `#${match.group_id}`}</td>\n                          <td style={{ padding: '0.75rem' }}>#{match.match_no}</td>\n                          <td style={{ padding: '0.75rem' }}>\n                            {match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '–'}\n                          </td>\n                          <td style={{ padding: '0.75rem' }}>{formatParticipant(match.player1_id)}</td>\n                          <td style={{ padding: '0.75rem' }}>{formatParticipant(match.player2_id)}</td>\n                          <td style={{ padding: '0.75rem' }}>\n                            {isEditing ? (\n                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>\n                                <input\n                                  type=\"number\"\n                                  value={scoreForm.score1}\n                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score1: e.target.value }))}\n                                  style={{ width: '60px', padding: '0.25rem' }}\n                                />\n                                :\n                                <input\n                                  type=\"number\"\n                                  value={scoreForm.score2}\n                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score2: e.target.value }))}\n                                  style={{ width: '60px', padding: '0.25rem' }}\n                                />\n                              </div>\n                            ) : (\n                              `${match.score1 ?? '–'} : ${match.score2 ?? '–'}`\n                            )}\n                          </td>\n                          {canEdit && (\n                            <td style={{ padding: '0.75rem' }}>\n                              {isEditing ? (\n                                <div style={{ display: 'flex', gap: '0.5rem' }}>\n                                  <Button onClick={() => saveEdit(match.id)} variant=\"success\" style={{ padding: '0.35rem 0.5rem' }}>\n                                    Speichern\n                                  </Button>\n                                  <Button onClick={cancelEdit} variant=\"secondary\" style={{ padding: '0.35rem 0.5rem' }}>\n                                    Abbrechen\n                                  </Button>\n                                </div>\n                              ) : (\n                                <Button onClick={() => startEdit(match)} variant=\"info\" style={{ padding: '0.35rem 0.5rem' }}>\n                                  Bearbeiten\n                                </Button>\n                              )}\n                            </td>\n                          )}\n                        </tr>\n                      );\n                    })}\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          );\n        })\n      )}\n    </div>\n  );\n}\n"""
    write(path, content)
    print("TournamentOverallScheduleContent: created")
    return True

def patch_tournament_detail():
    path = os.path.join(BASE, "frontend", "src", "pages", "TournamentDetail.tsx")
    s = read(path)
    if "TournamentOverallScheduleContent" in s:
        print("TournamentDetail: already patched")
        return True
    s = s.replace(
        "import TournamentMatchesContent from '../components/tournament/TournamentMatchesContent';\nimport TournamentTables from '../components/tournament/TournamentTables';\n",
        "import TournamentMatchesContent from '../components/tournament/TournamentMatchesContent';\nimport TournamentTables from '../components/tournament/TournamentTables';\nimport TournamentOverallScheduleContent from '../components/tournament/TournamentOverallScheduleContent';\n",
        1
    )
    s = s.replace(
        "type TabType = 'overview' | 'participants' | 'groups' | 'matches' | 'tables';\n",
        "type TabType = 'overview' | 'participants' | 'groups' | 'matches' | 'tables' | 'overall';\n",
        1
    )
    s = s.replace(
        "if (tabParam && ['overview', 'participants', 'groups', 'matches', 'tables'].includes(tabParam)) {\n",
        "if (tabParam && ['overview', 'participants', 'groups', 'matches', 'tables', 'overall'].includes(tabParam)) {\n",
        1
    )
    s = s.replace(
        "        {tournament.has_group_phase && (\n          <button\n            onClick={() => handleTabChange('groups')}\n",
        "        {tournament.has_group_phase && (\n          <button\n            onClick={() => handleTabChange('groups')}\n",
        1
    )
    if "Gesamtspielplan" not in s:
        s = s.replace(
            "        {tournament.has_group_phase && (\n          <button\n            onClick={() => handleTabChange('groups')}\n            style={{\n              padding: '0.75rem 1.5rem',\n              background: 'transparent',\n              border: 'none',\n              borderBottom: activeTab === 'groups' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',\n              cursor: 'pointer',\n              color: activeTab === 'groups' ? theme.colors.accent.primary : theme.colors.text.secondary,\n              fontWeight: activeTab === 'groups' ? 'bold' : 'normal',\n              marginBottom: '-2px',\n              borderRadius: '0px'\n            }}\n          >\n            Gruppen\n          </button>\n        )}\n",
            "        {tournament.has_group_phase && (\n          <button\n            onClick={() => handleTabChange('groups')}\n            style={{\n              padding: '0.75rem 1.5rem',\n              background: 'transparent',\n              border: 'none',\n              borderBottom: activeTab === 'groups' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',\n              cursor: 'pointer',\n              color: activeTab === 'groups' ? theme.colors.accent.primary : theme.colors.text.secondary,\n              fontWeight: activeTab === 'groups' ? 'bold' : 'normal',\n              marginBottom: '-2px',\n              borderRadius: '0px'\n            }}\n          >\n            Gruppen\n          </button>\n        )}\n        {tournament.has_group_phase && tournament.show_matches && (\n          <button\n            onClick={() => handleTabChange('overall')}\n            style={{\n              padding: '0.75rem 1.5rem',\n              background: 'transparent',\n              border: 'none',\n              borderBottom: activeTab === 'overall' ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',\n              cursor: 'pointer',\n              color: activeTab === 'overall' ? theme.colors.accent.primary : theme.colors.text.secondary,\n              fontWeight: activeTab === 'overall' ? 'bold' : 'normal',\n              marginBottom: '-2px',\n              borderRadius: '0px'\n            }}\n          >\n            Gesamtspielplan\n          </button>\n        )}\n",
            1
        )
    s = s.replace(
        "{activeTab === 'groups' && tournament.has_group_phase && <TournamentGroupsContent tournamentId={tournamentId} tournament={tournament} />}\n",
        "{activeTab === 'groups' && tournament.has_group_phase && <TournamentGroupsContent tournamentId={tournamentId} tournament={tournament} />}\n        {activeTab === 'overall' && tournament.has_group_phase && tournament.show_matches && (\n          <TournamentOverallScheduleContent tournamentId={tournamentId} tournament={tournament} />\n        )}\n",
        1
    )
    write(path, s)
    print("TournamentDetail: patched")
    return True

def patch_create_edit_labels_only():
    create_path = os.path.join(BASE, "frontend", "src", "pages", "CreateTournament.tsx")
    edit_path = os.path.join(BASE, "frontend", "src", "pages", "EditTournament.tsx")
    s = read(create_path)
    if "Gesamtspielplan (fair)" not in s:
        s = s.replace("Random – jedes Gruppenspiel zufälliges Spielfeld", "Gesamtspielplan (fair) – rundenbasiert über alle Gruppen")
        write(create_path, s)
    s = read(edit_path)
    if "Gesamtspielplan (fair)" not in s:
        s = s.replace("Random – jedes Gruppenspiel zufälliges Spielfeld", "Gesamtspielplan (fair) – rundenbasiert über alle Gruppen")
        write(edit_path, s)
    return True

def main():
    ok = True
    try:
        ensure_file(os.path.join(BASE, "backend", "app", "api", "v1", "tournaments.py"))
    except Exception as e:
        print("Base not found:", e)
        return 1
    ok &= patch_tournament_model()
    ok &= patch_tournament_schema()
    ok &= patch_group_model()
    ok &= patch_group_schema()
    ok &= patch_tournaments_api()
    ok &= patch_frontend_group_service()
    ok &= patch_frontend_types()
    ok &= patch_tournament_groups_content()
    ok &= patch_create_edit_labels()
    ok &= add_overall_component()
    ok &= patch_tournament_detail()
    ok &= patch_create_edit_labels_only()
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
