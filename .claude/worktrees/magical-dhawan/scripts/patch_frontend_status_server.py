#!/usr/bin/env python3
"""Patch TournamentDetail.tsx on server: Status-Dropdown hinzufuegen. Run: ssh root@SERVER 'cd /root/ibu_sw && python3 -' < this_script"""
import os
import sys

try:
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
except NameError:
    BASE = "/root/ibu_sw"
if not os.path.isdir(os.path.join(BASE, "frontend")):
    BASE = "/root/ibu_sw"

path = os.path.join(BASE, "frontend", "src", "pages", "TournamentDetail.tsx")
if not os.path.isfile(path):
    print("File not found:", path)
    sys.exit(1)

with open(path, "r", encoding="utf-8") as f:
    s = f.read()

if "handleStatusChange" in s:
    print("TournamentDetail.tsx: already has status dropdown")
    sys.exit(0)

# 1) Add Select to import
s = s.replace(
    "import { Button, Card, Input, Badge } from '../components/ui';",
    "import { Button, Card, Input, Badge, Select } from '../components/ui';",
    1
)

# 2) Add state after locationName
s = s.replace(
    "const [locationName, setLocationName] = useState<string | null>(null);",
    "const [locationName, setLocationName] = useState<string | null>(null);\n  const [statusUpdating, setStatusUpdating] = useState(false);\n  const [statusError, setStatusError] = useState<string | null>(null);",
    1
)

# 3) Insert handleStatusChange before handleToggleTemplate
old_toggle = "  const handleToggleTemplate = async () => {"
new_toggle = """  const handleStatusChange = async (newStatus: string) => {
    if (!tournament || statusUpdating) return;
    if (newStatus === tournament.status) return;
    setStatusError(null);
    setStatusUpdating(true);
    try {
      const updated = await tournamentService.update(tournament.id, { status: newStatus as 'planned' | 'running' | 'completed' });
      setTournament(updated);
    } catch (err: any) {
      setStatusError(err?.response?.data?.detail || 'Status konnte nicht geändert werden.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleToggleTemplate = async () => {"""
if new_toggle in s:
    print("handleStatusChange already present")
else:
    s = s.replace(old_toggle, new_toggle, 1)

# 4) Add Status Select next to Badge (only when canEdit and not completed)
old_badge_block = """          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <Badge variant={getStatusBadgeVariant(tournament.status)}>
              {tournament.status === 'running' ? 'Laufend' : tournament.status === 'completed' ? 'Abgeschlossen' : 'Geplant'}
            </Badge>
            <span style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>"""
new_badge_block = """          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge variant={getStatusBadgeVariant(tournament.status)}>
              {tournament.status === 'running' ? 'Laufend' : tournament.status === 'completed' ? 'Abgeschlossen' : 'Geplant'}
            </Badge>
            {canEdit && tournament.status !== 'completed' && (
              <>
                <Select
                  label=""
                  value={tournament.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  error={statusError || undefined}
                  options={[
                    { value: 'planned', label: 'Geplant' },
                    { value: 'running', label: 'Laufend' },
                    { value: 'completed', label: 'Abgeschlossen' },
                  ]}
                  style={{ width: 'auto', minWidth: '140px', marginBottom: 0 }}
                />
              </>
            )}
            <span style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>"""
if new_badge_block in s:
    print("Badge block already patched")
else:
    s = s.replace(old_badge_block, new_badge_block, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("TournamentDetail.tsx: patched (status dropdown)")
sys.exit(0)
