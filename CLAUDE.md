# Blender MCP Agent – Systemkontext

## Verbindung
Blender ist via MCP verbunden. Der Bridge-Script läuft als stdio-Prozess:
- Bridge: `C:/Users/goksc/.claude/blender_mcp_bridge.py`
- TCP-Socket: `localhost:9876`
- Blender muss geöffnet sein und das Addon aktiv haben

## Verfügbare MCP-Tools
| Tool | Beschreibung |
|------|-------------|
| `mcp__blender__execute_python` | Beliebigen Python-Code in Blender ausführen (bpy) |
| `mcp__blender__get_scene_info` | Szeneninformationen abrufen |
| `mcp__blender__list_objects` | Alle Objekte in der Szene auflisten |
| `mcp__blender__get_object_info` | Details zu einem Objekt |
| `mcp__blender__create_object` | Einfaches Objekt erstellen (MESH/LIGHT/CAMERA) |
| `mcp__blender__delete_object` | Objekt löschen |
| `mcp__blender__set_location` | Position setzen |
| `mcp__blender__set_rotation` | Rotation setzen (Grad) |
| `mcp__blender__set_scale` | Skalierung setzen |
| `mcp__blender__set_material` | Material zuweisen/erstellen |
| `mcp__blender__set_object_name` | Objekt umbenennen |
| `mcp__blender__select_object` | Objekt selektieren |
| `mcp__blender__deselect_all` | Alle deselektieren |
| `mcp__blender__duplicate_object` | Objekt duplizieren |
| `mcp__blender__add_modifier` | Modifier hinzufügen (SUBSURF, MIRROR, BOOLEAN, …) |
| `mcp__blender__render_scene` | Szene rendern → PNG |
| `mcp__blender__get_selected_objects` | Selektierte Objekte abrufen |
| `mcp__blender__get_viewport_shading` | Viewport-Modus abrufen |
| `mcp__blender__set_viewport_shading` | Viewport-Modus setzen |
| `mcp__blender__set_active_collection` | Collection setzen/erstellen |

## Wichtige Regeln für execute_python

### Scope-Problem vermeiden
`execute_python` läuft in einem isolierten `exec()`-Kontext. Variablen aus dem äußeren Scope sind **nicht** verfügbar. Alles muss **innerhalb des Strings** definiert sein:

```python
# ✅ RICHTIG – alles im selben Code-Block
import bpy, math

objects = []

def create_part(name):
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.active_object
    obj.name = name
    objects.append(obj)   # funktioniert, weil objects im selben Block definiert ist

create_part("Test")
result = f"Erstellt: {len(objects)} Objekte"
```

```python
# ❌ FALSCH – Variable aus vorherigem Tool-Aufruf referenzieren
objects.append(new_obj)  # NameError: objects nicht definiert
```

### Rückgabewert
Das letzte `result = ...` wird als Antwort zurückgegeben.

### Szene leeren
```python
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
```

## Einheiten / Maßstab
- Szene auf Millimeter setzen:
```python
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 0.001
scene.unit_settings.length_unit = 'MILLIMETERS'
```
- Bei `scale_length = 0.001` entspricht `dimensions = (30, 30, 30)` genau **30 mm**.

## Boolean-Operationen (Löcher, Aussparungen)
```python
import bpy

# Hauptkörper
bpy.ops.mesh.primitive_cube_add(size=1)
cube = bpy.context.active_object
cube.dimensions = (30, 30, 30)
bpy.ops.object.transform_apply(scale=True)

# Schneidewerkzeug (z.B. Bohrung ∅5mm)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.5, depth=40)
cyl = bpy.context.active_object

# Boolean Difference
bpy.context.view_layer.objects.active = cube
mod = cube.modifiers.new("Bohrung", 'BOOLEAN')
mod.operation = 'DIFFERENCE'
mod.object = cyl
mod.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier="Bohrung")

# Hilfsobjekt entfernen
bpy.data.objects.remove(cyl, do_unlink=True)
```

## Shading
```python
# Flat Shading (alle Flächen eben, kein Smoothing)
bpy.ops.object.shade_flat()

# Smooth Shading
bpy.ops.object.shade_smooth()

# Subdivision Surface für organische Formen
mod = obj.modifiers.new("Subd", 'SUBSURF')
mod.levels = 2
```

## Kamera & Licht für Render
```python
import bpy, mathutils

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.filepath = "C:/Users/goksc/Desktop/render.png"
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# Kamera
cam_data = bpy.data.cameras.new("Camera")
cam = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (80, -80, 60)
direction = mathutils.Vector((0,0,0)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

# Sonnenlicht
light_data = bpy.data.lights.new("Sun", type='SUN')
light_data.energy = 3
light = bpy.data.objects.new("Sun", light_data)
bpy.context.collection.objects.link(light)
light.location = (50, 50, 100)

bpy.ops.render.render(write_still=True)
```

## Material (Principled BSDF)
```python
mat = bpy.data.materials.new("Material")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.7, 0.7, 0.7, 1.0)
bsdf.inputs["Roughness"].default_value = 0.4
bsdf.inputs["Metallic"].default_value = 0.0

obj.data.materials.clear()
obj.data.materials.append(mat)
```

## Typische Fehler & Lösungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `NameError: name 'xyz' is not defined` | Variable außerhalb exec-Scope | Alles in einem Code-Block definieren |
| `RuntimeError: Fehler: Knotengruppe aufräumen` | Render-Engine-Konflikt | `scene.render.engine = 'BLENDER_EEVEE_NEXT'` setzen |
| Boolean schneidet nichts | Objekte überlappen nicht | Cutter größer als Zielobjekt machen |
| `modifier_apply` schlägt fehl | Object nicht aktiv | `bpy.context.view_layer.objects.active = obj` vorher setzen |
