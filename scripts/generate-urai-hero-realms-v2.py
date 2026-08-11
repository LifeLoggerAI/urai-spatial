#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import runpy
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AAA = runpy.run_path(str(ROOT / 'scripts' / 'author-urai-aaa-assets.py'), run_name='urai_aaa_library')
Builder = AAA['Builder']
heightfield = AAA['heightfield']
param_surface = AAA['param_surface']
tube_curve = AAA['tube_curve']
radial_loft = AAA['radial_loft']
arch_mesh = AAA['arch_mesh']
deformed_sphere = AAA['deformed_sphere']
crystal = AAA['crystal']
tree_mesh = AAA['tree_mesh']
quat_euler = AAA['quat_euler']

OUT = ROOT / 'urai-tier1' / 'public' / 'assets' / 'urai' / 'generated' / 'hero-realms-v2'
RECEIPT = ROOT / 'operations' / 'assets' / 'generated-receipts' / 'urai-hero-realms-v2.json'
OUT.mkdir(parents=True, exist_ok=True)
RECEIPT.parent.mkdir(parents=True, exist_ok=True)


def hero_builder(name: str, root_name: str, seed: int):
    b = Builder(name, root_name, seed)
    b.nodes[b.root].setdefault('extras', {}).update({
        'packId': 'urai-hero-realms-v2',
        'cameraAspect': '5:4',
        'units': 'meters',
        'selectedProduction': False,
        'qualityTier': 'textured-hero-density-review',
        'physicalRealityFirst': True,
    })
    return b


def add_mesh_node(b, name, mesh, material, t=None, r=None, s=None, extras=None):
    idx = b.add_mesh(f'{name}-geometry', mesh, material, extras=extras)
    return b.add_node(name, b.root, idx, t=t, r=r, s=s, extras=extras)


def add_column(b, prefix, x, z, h, r, material):
    shaft = radial_loft([(0, r*1.08, r), (h*.48, r*.95, r), (h, r*1.03, r*.98)], segments=52, wobble=.035, seed=int((x+z)*17)%97)
    add_mesh_node(b, f'{prefix}-shaft', shaft, material, t=[x, 0, z])
    base = radial_loft([(0, r*1.8, r*1.8), (.12, r*1.55, r*1.55), (.3, r*1.05, r*1.05)], segments=52, wobble=.025, seed=7)
    add_mesh_node(b, f'{prefix}-base', base, material, t=[x, 0, z])
    cap = radial_loft([(0, r, r), (.12, r*1.35, r*1.35), (.25, r*1.75, r*1.75), (.38, r*1.25, r*1.25)], segments=52, wobble=.035, seed=11)
    add_mesh_node(b, f'{prefix}-capital', cap, material, t=[x, h, z])


def add_lamp(b, prefix, x, y, z, cool=False):
    m = b._materials
    stem = radial_loft([(0,.045,.045),(.65,.032,.032)], segments=24, wobble=.02, seed=3)
    add_mesh_node(b, f'{prefix}-stem', stem, m['gold'], t=[x,y-.55,z])
    shade = crystal(seed=5 if cool else 8, rings=6, segments=18, height=.44, radius=.22)
    add_mesh_node(b, f'{prefix}-shade', shade, m['glass'] if cool else m['ivory'], t=[x,y,z], extras={'practicalLight':True,'temperature':'cool' if cool else 'warm'})


def add_vines(b, prefix, x, z0, z1, count=5):
    m=b._materials
    for i in range(count):
        pts=[]
        for t in np.linspace(0,1,44):
            pts.append([x+.24*math.sin(t*math.pi*4+i), 5.0-t*4.2+.12*math.sin(t*10+i), z0+(z1-z0)*t])
        vine=tube_curve(pts,.024,sides=10)
        add_mesh_node(b,f'{prefix}-vine-{i}',vine,m['moss'])
        crown=tree_mesh(seed=20+i)
        for j in range(4):
            t=(j+1)/5; p=pts[int(t*(len(pts)-1))]
            add_mesh_node(b,f'{prefix}-leaf-cluster-{i}-{j}',crown,m['moss'],t=p,s=[.16,.11,.12])


def add_floor_inlays(b, prefix, radius0, radius1, count=24, y=.07):
    m=b._materials
    for i,a in enumerate(np.linspace(0,2*math.pi,count,endpoint=False)):
        pts=[[math.cos(a)*radius0,y,math.sin(a)*radius0],[math.cos(a)*radius1,y,math.sin(a)*radius1]]
        add_mesh_node(b,f'{prefix}-inlay-{i}',tube_curve(pts,.018,sides=8),m['gold'])


def council():
    b=hero_builder('URAI Council Hero Chamber V2','council-hero-root',31); m=b._materials
    wood=b.material('council-oiled-walnut',[.18,.10,.055,1],.05,.72,clearcoat=.18)
    cloth=b.material('council-wool',[.11,.13,.15,1],.02,.88)
    floor=heightfield(152,152,(14,14),lambda X,Z:.026*np.sin(X*2.1)+.019*np.cos(Z*2.8)+.012*np.sin((X+Z)*4.4))
    add_mesh_node(b,'council-sculpted-floor',floor,m['stone'],extras={'walkable':True,'collisionSurface':True})
    vault=param_surface(132,66,lambda u,v:[(u-.5)*13.3,5.35+1.75*math.sin(v*math.pi),-6.25+v*12.5])
    add_mesh_node(b,'council-vault',vault,m['stone'])
    back=heightfield(112,60,(13.1,5.3),lambda X,Z:.035*np.sin(X*2.4)*np.cos(Z*2.2))
    add_mesh_node(b,'council-back-relief',back,m['stone'],t=[0,2.7,-6.45],r=quat_euler(math.pi/2,0,0))
    for i,x in enumerate(np.linspace(-5.5,5.5,6)): add_column(b,f'council-column-{i}',float(x),-5.85,4.9,.26,m['stone'])
    arch=arch_mesh(2.25,3.7,.42,.14,52,4)
    for side,x,yaw in [('left',-6.05,math.pi/2),('right',6.05,-math.pi/2)]:
        for i,z in enumerate([-4.5,-1.1,2.3]): add_mesh_node(b,f'council-{side}-arch-{i}',arch,m['stone'],t=[x,.35,z],r=quat_euler(0,yaw,0))
    # daylight glass apertures
    window=radial_loft([(-1.35,1.05,.03),(1.35,1.05,.03)],segments=64,wobble=.02,seed=9)
    for i,x in enumerate([-3.6,0,3.6]): add_mesh_node(b,f'council-window-{i}',window,m['glass'],t=[x,3.15,-6.25],r=quat_euler(math.pi/2,0,0))
    table=radial_loft([(0,1.62,1.62),(.13,1.58,1.58)],segments=112,wobble=.025,seed=2)
    add_mesh_node(b,'council-table-top',table,wood,t=[0,.76,-.5])
    base=radial_loft([(0,.66,.66),(.55,.49,.49),(.72,.34,.34)],segments=84,wobble=.035,seed=5)
    add_mesh_node(b,'council-table-base',base,wood,t=[0,.06,-.5])
    ring=[[math.cos(a)*1.36,.89,math.sin(a)*1.36-.5] for a in np.linspace(0,2*math.pi,120,endpoint=False)]
    add_mesh_node(b,'council-table-inlay',tube_curve(ring,.02,sides=10,closed=True),m['gold'])
    chair=radial_loft([(0,.40,.34),(.16,.42,.36),(.25,.34,.30)],segments=48,wobble=.045,seed=12)
    backrest=radial_loft([(0,.34,.08),(.9,.36,.08),(1.08,.28,.07)],segments=42,wobble=.04,seed=13)
    for i,a in enumerate(np.linspace(0,2*math.pi,6,endpoint=False)):
        x=math.cos(a)*3.45; z=math.sin(a)*3.0-.5; yaw=-a+math.pi/2
        add_mesh_node(b,f'council-chair-{i}',chair,cloth,t=[x,.36,z],r=quat_euler(0,yaw,0))
        add_mesh_node(b,f'council-chair-back-{i}',backrest,cloth,t=[x,.52,z],r=quat_euler(0,yaw,0))
        add_lamp(b,f'council-practical-{i}',math.cos(a)*4.65,1.35,math.sin(a)*4.2-.5,cool=i%2==1)
    add_floor_inlays(b,'council-floor',2.0,5.5,28)
    add_vines(b,'council-living-wall',-5.85,-5.2,4.6,6)
    return b


def shadow():
    b=hero_builder('URAI Shadow Hero Hall V2','shadow-hero-root',37); m=b._materials
    dark=b.material('shadow-basalt',[.025,.026,.03,1],.06,.84,emissive=(.006,.004,.012),strength=1.4)
    floor=heightfield(148,188,(12,17),lambda X,Z:.018*np.sin(X*3.6)+.015*np.cos(Z*2.9)+.009*np.sin((X-Z)*5.1))
    add_mesh_node(b,'shadow-basalt-floor',floor,dark,extras={'walkable':True,'collisionSurface':True})
    vault=param_surface(128,74,lambda u,v:[(u-.5)*11.5,5.45+1.48*math.sin(v*math.pi),-8.0+v*16.0])
    add_mesh_node(b,'shadow-vault',vault,dark)
    for side,x in [('left',-5.3),('right',5.3)]:
        for i,z in enumerate([-6.2,-3.2,-.2,2.8,5.8]): add_column(b,f'shadow-{side}-column-{i}',x,z,4.95,.23,dark)
    panel=radial_loft([(-1.45,.78,.025),(1.45,.78,.025)],segments=72,wobble=.015,seed=2)
    frame=arch_mesh(1.85,3.45,.34,.095,56,8)
    for i,z in enumerate([-5.7,-3,-.3,2.4,5.1]):
        for side,x,yaw in [('left',-4.55,.1),('right',4.55,-.1)]:
            add_mesh_node(b,f'shadow-memory-glass-{side}-{i}',panel,m['glass'],t=[x,2.0,z],r=quat_euler(0,yaw,0))
            add_mesh_node(b,f'shadow-memory-frame-{side}-{i}',frame,m['gold'],t=[x,.3,z+.02],r=quat_euler(0,yaw,0))
    for i,z in enumerate(np.linspace(6.5,-6.6,28)):
        stone=radial_loft([(0,.58,.24),(.06,.62,.26)],segments=40,wobble=.08,seed=i+40)
        add_mesh_node(b,f'shadow-path-stone-{i}',stone,m['stone'],t=[.08*math.sin(i*.5),.03,float(z)],r=quat_euler(0,.03*math.sin(i),0))
    basin=radial_loft([(-.15,1.72,1.72),(0,1.92,1.92),(.18,1.67,1.67)],segments=96,wobble=.035,seed=6)
    add_mesh_node(b,'shadow-basin',basin,m['stone'],t=[0,.05,-6.2])
    water=radial_loft([(0,1.43,1.43),(.025,1.43,1.43)],segments=112,wobble=.015,seed=2)
    add_mesh_node(b,'shadow-basin-water',water,m['water'],t=[0,.23,-6.2])
    add_vines(b,'shadow-left-vines',-5.35,-7,6,7); add_vines(b,'shadow-right-vines',5.35,6,-7,7)
    for i,z in enumerate(np.linspace(-6.3,6.0,10)):
        add_lamp(b,f'shadow-left-light-{i}',-4.9,.65,float(z),cool=i%3==0)
        add_lamp(b,f'shadow-right-light-{i}',4.9,.65,float(z),cool=i%3==0)
    return b


def mirror():
    b=hero_builder('URAI Mirror Hero Chamber V2','mirror-hero-root',41); m=b._materials
    floor=heightfield(152,152,(13,13),lambda X,Z:.014*np.sin(X*3.1)+.014*np.cos(Z*3.0)+.008*np.sin((X+Z)*5.2))
    add_mesh_node(b,'mirror-stone-floor',floor,m['ivory'],extras={'walkable':True,'collisionSurface':True})
    dome=param_surface(144,72,lambda u,v:[math.cos(2*math.pi*u)*5.95*math.sin(v*math.pi/2),5.0+2.65*math.cos(v*math.pi/2),math.sin(2*math.pi*u)*5.95*math.sin(v*math.pi/2)],wrap_u=True)
    add_mesh_node(b,'mirror-dome',dome,m['stone'])
    wall_panel=radial_loft([(-1.6,.72,.055),(1.6,.72,.055)],segments=72,wobble=.012,seed=9)
    arch=arch_mesh(1.7,3.75,.36,.10,60,3)
    for i,a in enumerate(np.linspace(0,2*math.pi,18,endpoint=False)):
        x=math.cos(a)*5.82; z=math.sin(a)*5.82; yaw=-a+math.pi/2
        if i%2==0: add_mesh_node(b,f'mirror-wall-glass-{i}',wall_panel,m['glass'],t=[x,2.35,z],r=quat_euler(0,yaw,0))
        else: add_mesh_node(b,f'mirror-wall-arch-{i}',arch,m['gold'],t=[x,.4,z],r=quat_euler(0,yaw,0))
    pool=radial_loft([(0,2.22,2.22),(.05,2.22,2.22)],segments=128,wobble=.008,seed=1)
    add_mesh_node(b,'mirror-reflection-pool',pool,m['glass'],t=[0,.04,0])
    ring=[[math.cos(a)*2.5,.12,math.sin(a)*2.5] for a in np.linspace(0,2*math.pi,144,endpoint=False)]
    add_mesh_node(b,'mirror-pool-ring',tube_curve(ring,.055,sides=12,closed=True),m['gold'])
    monolith=crystal(seed=12,rings=8,segments=24,height=2.4,radius=.42)
    for i,a in enumerate(np.linspace(0,2*math.pi,10,endpoint=False)):
        add_mesh_node(b,f'mirror-monolith-{i}',monolith,m['violet'],t=[math.cos(a)*3.65,1.2,math.sin(a)*3.65],r=quat_euler(0,-a,0))
        add_lamp(b,f'mirror-practical-{i}',math.cos(a)*4.75,.6,math.sin(a)*4.75,True)
    add_floor_inlays(b,'mirror-floor',2.55,5.45,32)
    orb=deformed_sphere(64,38,.42,seed=15,deform=.055)
    add_mesh_node(b,'mirror-orb-reflection-anchor',orb,m['glass'],t=[0,.72,0],extras={'symbolicOverlayAnchor':True})
    return b


def legacy():
    b=hero_builder('URAI Legacy Hero Archive V2','legacy-hero-root',47); m=b._materials
    wood=b.material('legacy-walnut',[.17,.09,.05,1],.05,.74,clearcoat=.15)
    cloth=b.material('legacy-cloth',[.15,.14,.13,1],.01,.9)
    paper=b.material('legacy-paper',[.76,.71,.59,1],.0,.88)
    floor=heightfield(148,204,(13,18),lambda X,Z:.019*np.sin(X*2.5)*np.cos(Z*1.8)+.007*np.sin((X-Z)*4.5))
    add_mesh_node(b,'legacy-floor',floor,m['stone'],extras={'walkable':True,'collisionSurface':True})
    vault=param_surface(132,82,lambda u,v:[(u-.5)*12.25,5.45+1.68*math.sin(v*math.pi),-8.55+v*17.1])
    add_mesh_node(b,'legacy-vault',vault,m['stone'])
    shelf_case=radial_loft([(0,.32,.76),(4.5,.32,.76)],segments=44,wobble=.035,seed=18)
    shelf=radial_loft([(0,.40,.72),(.07,.40,.72)],segments=40,wobble=.02,seed=9)
    book=radial_loft([(0,.075,.05),(.48,.075,.05)],segments=20,wobble=.025,seed=4)
    bay_arch=arch_mesh(1.75,4.55,.38,.105,58,17)
    for side,x,sgn in [('left',-5.4,1),('right',5.4,-1)]:
        for bay,z in enumerate(np.linspace(-7.0,6.8,8)):
            add_mesh_node(b,f'legacy-{side}-case-{bay}',shelf_case,wood,t=[x,0,float(z)])
            for level,y in enumerate([.55,1.35,2.15,2.95,3.75]):
                add_mesh_node(b,f'legacy-{side}-shelf-{bay}-{level}',shelf,wood,t=[x-sgn*.1,y,float(z)])
                for n in range(10):
                    bz=float(z)-.58+n*.13
                    mat=paper if n%4==0 else cloth if n%3 else wood
                    add_mesh_node(b,f'legacy-{side}-book-{bay}-{level}-{n}',book,mat,t=[x-sgn*.43,y+.04,bz],r=quat_euler(0,sgn*.035*math.sin(n+bay),0),s=[1,.86+.18*math.sin(n*.7+bay),1])
            add_mesh_node(b,f'legacy-{side}-bay-arch-{bay}',bay_arch,m['gold'],t=[x-sgn*.18,.22,float(z)],r=quat_euler(0,math.pi/2,0))
    table=radial_loft([(0,1.2,.53),(.13,1.2,.53)],segments=72,wobble=.025,seed=5)
    base=radial_loft([(0,.34,.34),(.64,.24,.24),(.72,.18,.18)],segments=54,wobble=.03,seed=6)
    for i,z in enumerate([-5.5,-2.2,1.1,4.4]):
        add_mesh_node(b,f'legacy-reading-table-{i}',table,wood,t=[0,.74,z])
        add_mesh_node(b,f'legacy-reading-base-{i}',base,wood,t=[0,.05,z])
        add_lamp(b,f'legacy-table-light-a-{i}',-.65,1.38,z,False);add_lamp(b,f'legacy-table-light-b-{i}',.65,1.38,z,False)
    for k in range(13):
        pts=[]
        for t in np.linspace(0,1,72): pts.append([math.sin(t*math.pi*2+k*.67)*(.82+.035*k),.45+t*4.45,-7.7+t*14.7])
        add_mesh_node(b,f'legacy-lineage-thread-{k}',tube_curve(pts,.019,sides=9),m['gold'])
    portal=arch_mesh(3.5,4.7,.46,.15,72,23)
    add_mesh_node(b,'legacy-archive-portal',portal,m['gold'],t=[0,.35,-8.45])
    glass=radial_loft([(-1.7,1.45,.035),(1.7,1.45,.035)],segments=84,wobble=.01,seed=3)
    add_mesh_node(b,'legacy-archive-glass',glass,m['glass'],t=[0,2.7,-8.5],r=quat_euler(math.pi/2,0,0))
    return b


def main():
    builds=[
        ('council-chamber-hero-v2.glb','Council',council),
        ('shadow-hall-hero-v2.glb','Shadow',shadow),
        ('mirror-chamber-hero-v2.glb','Mirror',mirror),
        ('legacy-archive-hero-v2.glb','Legacy',legacy),
    ]
    receipt={
        'packId':'urai-hero-realms-v2',
        'cameraAspect':'5:4',
        'units':'meters',
        'selectedProduction':False,
        'qualityTier':'textured-hero-density-review',
        'sourceAuthority':'URAI Labs Final GLB Forge primitives/material system',
        'assets':[],
    }
    for filename,realm,fn in builds:
        builder=fn()
        record=builder.build(OUT/filename)
        record['realm']=realm
        record['cameraAspect']='5:4'
        record['units']='meters'
        receipt['assets'].append(record)
        print(json.dumps(record))
    receipt['totalBytes']=sum(a['bytes'] for a in receipt['assets'])
    receipt['totalTriangles']=sum(a['triangleCount'] for a in receipt['assets'])
    receipt['promotionRequires']=['github-binary-receipt','browser-render-proof','mobile-performance-proof','material-calibration','navigation-collision-validation']
    RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))

if __name__=='__main__':
    main()
