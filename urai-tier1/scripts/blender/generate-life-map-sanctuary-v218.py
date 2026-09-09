"""Generate V218 inhabited Life Map sanctuary for PR #1177.

Deterministic Blender-authored environment. The runtime is a connected navigable
landscape with rooted architectural shelters, erosion, strata, a meandering
traversal path, and materially distinct embedded memory reliefs. No external
assets, backdrops, primitive-token fields, rings, crystals, or monolithic walls.
"""
from __future__ import annotations
import math, random
from pathlib import Path
import bpy
from mathutils import Vector

SEED = 1177218
random.seed(SEED)
ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = ROOT / "public/assets/urai/life-map-production/authored-v218"
MASTER_DIR = ROOT.parent / "source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v218"
GLB_PATH = RUNTIME_DIR / "life-map-memory-sanctuary-v218.glb"
BLEND_PATH = MASTER_DIR / "life-map-memory-sanctuary-v218.blend"
PREVIEW_PATH = MASTER_DIR / "life-map-memory-sanctuary-v218-preview.png"


def p(x,y,z): return (x,-z,y)

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.9, emission=None, strength=0.0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1); b.inputs['Roughness'].default_value=rough
    if emission:
        b.inputs['Emission Color'].default_value=(*emission,1); b.inputs['Emission Strength'].default_value=strength
    return m

STONE=None; MOSS=None; PATH=None; OCHRE=None; DARK=None; GOLD=None; CYAN=None; VIOLET=None

def centerline(z):
    t=(14-z)/88
    return 2.2*math.sin(t*4.8)+0.85*math.sin(t*11.4+0.5)

def h(x,z):
    t=max(0,min(1,(14-z)/88)); c=centerline(z); lateral=abs(x-c)
    floor=-1.9+t*2.15
    shoulder=max(0,min(1,(lateral-7.0)/23.0))
    wall=(shoulder**1.65)*(6.0+8.5*t)
    weather=(.36*math.sin(x*.29+z*.17)+.15*math.sin(x*.81-z*.39)+.07*math.cos(x*1.97+z*1.13))*(.45+shoulder*1.4)
    channel=-.28*math.exp(-((x-c-.45*math.sin(z*.13))/1.45)**4)
    # broad rooted inhabited terraces are part of the land itself
    def rise(cx,cz,rx,rz,amp,phase):
        q=((x-cx)/rx)**2+((z-cz)/rz)**2
        e=max(0,1-q)**1.6
        return amp*e*(.78+.12*math.sin((x-cx)*.72+(z-cz)*.31+phase))
    inhabited=rise(-8,-8,8,8,2.4,.2)+rise(8,-27,9,11,3.6,1.7)+rise(-5,-50,11,12,5.1,3.9)
    scar=-.65*math.exp(-(((x-8)/1.6)**2+((z+27)/7.2)**2))
    return floor+wall+weather+channel+inhabited+scar

def add_uv(mesh, verts):
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index; x,y,z=verts[vi]
            uv.data[li].uv=((x+36)/72,(y+74)/92)

def terrain():
    cols,rows=112,148; verts=[]; faces=[]
    for r in range(rows+1):
        v=r/rows; z=14-v*88
        for c in range(cols+1):
            u=c/cols; x=-36+u*72; verts.append((x,z,h(x,z)))
    for r in range(rows):
        for c in range(cols):
            a=r*(cols+1)+c; b=a+1; d=(r+1)*(cols+1)+c; e=d+1
            faces.extend(((a,b,d),(b,e,d)))
    mesh=bpy.data.meshes.new('life-map-v218-connected-sanctuary-mesh'); mesh.from_pydata([p(x,y,z) for x,z,y in verts],[],faces); mesh.update()
    obj=bpy.data.objects.new('life-map-v218-connected-inhabited-memory-sanctuary',mesh); bpy.context.collection.objects.link(obj)
    for m in (DARK,MOSS,STONE,PATH,OCHRE): mesh.materials.append(m)
    # assign terrain materials by face center; worn traversal is painted into real geometry
    for poly in mesh.polygons:
        co=sum((mesh.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
        x=co.x; z=-co.y; y=co.z; lat=abs(x-centerline(z))
        if lat<2.2: idx=3
        elif y>5.0: idx=2
        elif math.sin(x*.22-z*.15)>0.3 and lat<14: idx=1
        elif z<-38 and lat<17: idx=4
        else: idx=0
        poly.material_index=idx; poly.use_smooth=True
    obj['authored_role']='continuous foreground middle-distance background geology, erosion, rooted terraces, and traversable path'
    return obj

def custom_shell(name,cx,cz,rx,rz,height,seed,material):
    # A low asymmetric rock-cut shelter: custom swept mesh, open toward the path.
    rng=random.Random(seed); seg=28; rings=7; verts=[]; faces=[]
    facing=1 if cx<centerline(cz) else -1
    for r in range(rings+1):
        v=r/rings; theta=v*math.pi*.92+.05
        for s in range(seg+1):
            u=s/seg; a=(u-.5)*math.pi*1.55
            x=cx+math.sin(a)*rx*(.86+.12*math.sin(a*2.7+seed))
            z=cz+facing*(math.cos(a)*rz*.55-rz*.2)
            base=h(x,z)-.15
            arch=max(0,math.cos(a*.78))*math.sin(theta)
            y=base+arch*height*(.78+.18*math.sin(a*3.1+seed*.13))+r*.015
            # front lower quarter drops away, making a readable inhabited opening rather than a dome
            if r<2 and abs(a)<.62: y=base+.08*r
            verts.append(p(x,y,z))
    for r in range(rings):
        for s in range(seg):
            a=r*(seg+1)+s; b=a+1; c=(r+1)*(seg+1)+s; d=c+1
            faces.extend(((a,b,c),(b,d,c)))
    mesh=bpy.data.meshes.new(name+'-mesh'); mesh.from_pydata(verts,[],faces); mesh.update(); mesh.materials.append(material)
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    bevel=obj.modifiers.new('weathered edges','BEVEL'); bevel.width=.09; bevel.segments=2
    for poly in mesh.polygons: poly.use_smooth=True
    obj['authored_role']='rooted asymmetrical inhabited shelter cut into sanctuary geology'
    return obj

def relief(name,cx,cz,width,height,seed,base_mat,accent_mat):
    # Uneven wall-stratum physically rooted in the slope; not a token or floating prop.
    rng=random.Random(seed); cols=22; rows=8; verts=[]; faces=[]
    side=1 if cx>centerline(cz) else -1
    for r in range(rows+1):
        v=r/rows
        for c in range(cols+1):
            u=c/cols; x=cx+(u-.5)*width
            z=cz+side*(.18*math.sin(u*math.pi*3+seed)+.12*(v-.5))
            ground=h(x,z)
            taper=math.sin(u*math.pi)**.48
            y=ground+v*height*taper*(.78+.16*math.sin(u*9+seed))+rng.uniform(-.025,.025)
            verts.append(p(x,y,z))
    for r in range(rows):
        for c in range(cols):
            a=r*(cols+1)+c; b=a+1; d=(r+1)*(cols+1)+c; e=d+1; faces.extend(((a,b,d),(b,e,d)))
    mesh=bpy.data.meshes.new(name+'-mesh'); mesh.from_pydata(verts,[],faces); mesh.update(); mesh.materials.append(base_mat); mesh.materials.append(accent_mat)
    for poly in mesh.polygons:
        poly.material_index=1 if (poly.index+seed)%9 in (0,1) else 0; poly.use_smooth=True
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj['authored_role']='embedded materially distinct memory stratum with unique weathering and trace pattern'
    return obj

def memory_rill(name,points,material,bevel=.055):
    curve=bpy.data.curves.new(name+'-curve','CURVE'); curve.dimensions='3D'; curve.bevel_depth=bevel; curve.bevel_resolution=3; curve.resolution_u=12
    spl=curve.splines.new('BEZIER'); spl.bezier_points.add(len(points)-1)
    for bp,(x,z,dy) in zip(spl.bezier_points,points):
        bp.co=p(x,h(x,z)+dy,z); bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    curve.materials.append(material); obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj)
    obj['authored_role']='localized embedded memory current following real sanctuary surface'
    return obj

def build():
    terrain()
    custom_shell('life-map-lineage-shelter',-8,-8,5.6,5.4,3.8,31,STONE)
    custom_shell('life-map-archive-grotto',8,-27,6.4,6.2,4.6,53,OCHRE)
    custom_shell('life-map-history-refuge',-5,-50,7.2,7.0,5.4,79,STONE)
    relief('life-map-memory-relief-family',-11,-10,5.8,2.5,101,OCHRE,GOLD)
    relief('life-map-memory-relief-threshold',11,-25,6.4,3.0,137,STONE,CYAN)
    relief('life-map-memory-relief-return',-9,-48,7.2,3.7,173,OCHRE,VIOLET)
    relief('life-map-memory-relief-care',7,-54,5.4,2.8,211,STONE,GOLD)
    memory_rill('life-map-lineage-current',[(-2,2,.05),(-4,-7,.08),(-1,-17,.1),(3,-27,.12),(0,-38,.1),(-4,-51,.08)],GOLD,.045)
    memory_rill('life-map-recovery-current',[(4,-3,.04),(7,-14,.07),(9,-27,.08),(5,-39,.09),(1,-54,.07)],CYAN,.035)

def setup_materials():
    global STONE,MOSS,PATH,OCHRE,DARK,GOLD,CYAN,VIOLET
    DARK=mat('v218-deep-weathered-stone',(0.105,0.145,0.14),.96)
    MOSS=mat('v218-mossed-geology',(0.16,0.26,0.19),.98)
    STONE=mat('v218-stratified-stone',(0.32,0.36,0.34),.94)
    PATH=mat('v218-worn-traversal-earth',(0.34,0.27,0.18),.99)
    OCHRE=mat('v218-warm-history-stone',(0.42,0.31,0.21),.95)
    GOLD=mat('v218-embedded-gold-memory',(0.32,0.23,0.11),.72,(0.95,0.56,0.18),1.7)
    CYAN=mat('v218-embedded-cyan-memory',(0.08,0.23,0.24),.7,(0.16,0.72,0.76),1.25)
    VIOLET=mat('v218-embedded-violet-memory',(0.18,0.12,0.23),.76,(0.48,0.25,0.62),1.15)

def preview():
    bpy.ops.object.camera_add(location=p(0,5.2,8)); cam=bpy.context.object; cam.name='V218 source preview camera'; bpy.context.scene.camera=cam
    target=Vector(p(0,1.8,-28)); direction=target-cam.location; cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); cam.data.lens=37
    bpy.ops.object.light_add(type='SUN',location=(0,0,20)); sun=bpy.context.object; sun.data.energy=2.4; sun.rotation_euler=(math.radians(34),math.radians(-18),math.radians(28))
    bpy.ops.object.light_add(type='AREA',location=p(-8,8,-5)); area=bpy.context.object; area.data.energy=1100; area.data.shape='DISK'; area.data.size=10; area.data.color=(1.0,.72,.48)
    bpy.ops.object.light_add(type='AREA',location=p(10,6,-30)); fill=bpy.context.object; fill.data.energy=800; fill.data.size=12; fill.data.color=(.35,.68,1.0)
    world=bpy.context.scene.world or bpy.data.worlds.new('V218 world'); bpy.context.scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.012,.022,.026,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
    sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=1600; sc.render.resolution_y=1000; sc.render.resolution_percentage=100; sc.render.image_settings.file_format='PNG'; sc.render.filepath=str(PREVIEW_PATH)
    sc.view_settings.look='AgX - Medium High Contrast'; bpy.ops.render.render(write_still=True)

def main():
    reset(); setup_materials(); build(); RUNTIME_DIR.mkdir(parents=True,exist_ok=True); MASTER_DIR.mkdir(parents=True,exist_ok=True)
    preview(); bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    # Export authored visible runtime geometry; camera/lights remain source-master only.
    for o in bpy.context.scene.objects: o.select_set(o.type in {'MESH','CURVE'})
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH),export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
    print('V218_GLTF',GLB_PATH); print('V218_BLEND',BLEND_PATH); print('V218_PREVIEW',PREVIEW_PATH)

if __name__=='__main__': main()
