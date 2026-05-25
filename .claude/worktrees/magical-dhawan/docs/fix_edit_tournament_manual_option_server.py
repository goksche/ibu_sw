# Fix: "Manuelle Paarungen" Option in combinedDrawMethods in EditTournament.tsx hinzufuegen
# Auf Server: cd /root/ibu_sw && python3 (dann Skript pipen)
path = "/root/ibu_sw/frontend/src/pages/EditTournament.tsx"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# Suche das Ende von combinedDrawMethods (nach predefined_bracket) und fuege manual ein
old = """    { 
      value: 'predefined_bracket', 
      label: 'Vorgegebener Turnierbaum', 
      description: 'Der KO-Baum steht bereits fest. Die Gruppenphase bestimmt nur, welche Teilnehmer welche Positionen im Bracket einnehmen. Struktur ist vorab definiert.' 
    }
  ];"""

new = """    { 
      value: 'predefined_bracket', 
      label: 'Vorgegebener Turnierbaum', 
      description: 'Der KO-Baum steht bereits fest. Die Gruppenphase bestimmt nur, welche Teilnehmer welche Positionen im Bracket einnehmen. Struktur ist vorab definiert.' 
    },
    { 
      value: 'manual', 
      label: 'Manuelle Paarungen', 
      description: 'Paarungen werden nach Abschluss der Gruppenphase mit den qualifizierten Teilnehmern festgelegt. Runde für Runde befüllbar (Runde 1 speichern, dann Runde 2, …).' 
    }
  ];"""

if new in s:
    print("Option 'manual' already present")
elif old in s:
    s = s.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("Added 'manual' option to combinedDrawMethods:", path)
else:
    print("Target block not found - check file manually")
