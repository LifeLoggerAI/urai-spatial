from __future__ import annotations
import json, math, struct, hashlib
from pathlib import Path
from collections import OrderedDict
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
from trimesh.transformations import translation_matrix, rotation_matrix

REPO_ROOT=Path(__file__).resolve().parents[1]
OUT=REPO_ROOT/'urai-tier1'/'public'/'assets'/'urai'/'generated'/'articulated-humans-v1'
RECEIPT=REPO_ROOT/'operations'/'assets'/'generated-receipts'/'urai-articulated-humans-v1.json'
OUT.mkdir(parents=True,exist_ok=True)
RECEIPT.parent.mkdir(parents=True,exist_ok=True)

def rgba(h,a=255):
    h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]+[a]
def mat(name,c,rough=.7,metal=0):
    return PBRMaterial(name=name,baseColorFactor=rgba(c),roughnessFactor=rough,metallicFactor=metal)
def apply(m,material):
    m.visual=TextureVisuals(material=material); return m

def ellipsoid(scale,material,sub=3):
    m=trimesh.creation.icosphere(subdivisions=sub,radius=1);m.apply_scale(scale);return apply(m,material)
def capsule_y(radius,height,material,count=18):
    m=trimesh.creation.capsule(radius=radius,height=height,count=[count,count]);m.apply_transform(rotation_matrix(math.pi/2,[1,0,0]));return apply(m,material)
def cyl_y(radius,height,material,sections=20):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=sections);m.apply_transform(rotation_matrix(math.pi/2,[1,0,0]));return apply(m,material)
def T(x=0,y=0,z=0):return translation_matrix([x,y,z])

def qx(a): return [math.sin(a/2),0,0,math.cos(a/2)]
def qy(a): return [0,math.sin(a/2),0,math.cos(a/2)]
def qz(a): return [0,0,math.sin(a/2),math.cos(a/2)]
def qmul(a,b):
    ax,ay,az,aw=a; bx,by,bz,bw=b
    return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]

def add_joint(scene,name,parent,translation):
    scene.graph.update(frame_to=name,frame_from=parent,matrix=T(*translation),metadata={'uraiJoint':True})

def add_geom(scene,geom,name,parent,translation=(0,0,0),rotation=None):
    tr=T(*translation)
    if rotation is not None:
        tr=tr@rotation_matrix(rotation[0],rotation[1])
    scene.add_geometry(geom,node_name=name,geom_name=name,parent_node_name=parent,transform=tr)

def build_scene(role,skin_color,hair_color,shirt_color,stature=1.0,hair_style='short'):
    skin=mat(role+'-skin',skin_color,.56,0);hair=mat(role+'-hair',hair_color,.96,0);shirt=mat(role+'-shirt',shirt_color,.9,.01);pants=mat(role+'-pants','#262a2f',.93,.01);shoe=mat(role+'-shoe','#171819',.76,.03);white=mat(role+'-eye-white','#f2f0ea',.3,0);iris=mat(role+'-iris','#35413d',.24,0);lip=mat(role+'-lip','#7b4842',.66,0)
    s=trimesh.Scene(base_frame='world')
    root=role+'_root'; add_joint(s,root,'world',(0,0,0))
    hips=role+'_hips'; add_joint(s,hips,root,(0,.90,0))
    spine=role+'_spine'; add_joint(s,spine,hips,(0,.15,0))
    chest=role+'_chest'; add_joint(s,chest,spine,(0,.22,0))
    neck=role+'_neck_joint'; add_joint(s,neck,chest,(0,.25,0))
    head=role+'_head_joint'; add_joint(s,head,neck,(0,.19,0))
    jaw=role+'_jaw_joint'; add_joint(s,jaw,head,(0,-.055,.06))
    for side,sgn in [('L',-1),('R',1)]:
        hip=f'{role}_hip_{side}'; knee=f'{role}_knee_{side}'; ankle=f'{role}_ankle_{side}'
        add_joint(s,hip,hips,(sgn*.09,-.07,0));add_joint(s,knee,hip,(0,-.38,0));add_joint(s,ankle,knee,(0,-.34,0))
        add_geom(s,capsule_y(.072,.36,pants),f'{role}_thigh_mesh_{side}',hip,(0,-.18,0))
        add_geom(s,capsule_y(.055,.32,pants),f'{role}_calf_mesh_{side}',knee,(0,-.16,0))
        add_geom(s,ellipsoid((.09,.055,.17),shoe,2),f'{role}_shoe_mesh_{side}',ankle,(0,-.04,.065))
    add_geom(s,ellipsoid((.21,.16,.14),pants,2),role+'_pelvis_mesh',hips,(0,0,0))
    add_geom(s,ellipsoid((.245,.33,.15),shirt,3),role+'_torso_mesh',spine,(0,.16,0))
    add_geom(s,cyl_y(.06,.12,skin),role+'_neck_mesh',neck,(0,.02,0))
    for side,sgn in [('L',-1),('R',1)]:
        shoulder=f'{role}_shoulder_{side}'; elbow=f'{role}_elbow_{side}'; wrist=f'{role}_wrist_{side}'
        add_joint(s,shoulder,chest,(sgn*.265,.10,0));add_joint(s,elbow,shoulder,(sgn*.035,-.27,0));add_joint(s,wrist,elbow,(sgn*.01,-.25,.01))
        add_geom(s,capsule_y(.052,.27,shirt),f'{role}_upperarm_mesh_{side}',shoulder,(0,-.135,0),(-sgn*.08,[0,0,1]))
        add_geom(s,capsule_y(.043,.245,skin),f'{role}_forearm_mesh_{side}',elbow,(0,-.122,.015))
        add_geom(s,ellipsoid((.052,.078,.038),skin,2),f'{role}_hand_mesh_{side}',wrist,(0,-.055,.025))
    add_geom(s,ellipsoid((.113,.144,.107),skin,4),role+'_head_mesh',head,(0,0,0))
    add_geom(s,ellipsoid((.087,.064,.092),skin,3),role+'_jaw_volume',jaw,(0,-.025,-.02))
    add_geom(s,ellipsoid((.015,.032,.018),skin,2),role+'_ear_L',head,(-.115,0,0)); add_geom(s,ellipsoid((.015,.032,.018),skin,2),role+'_ear_R',head,(.115,0,0))
    nose=trimesh.creation.cone(radius=.014,height=.048,sections=16);nose.apply_transform(rotation_matrix(math.pi/2,[1,0,0]));apply(nose,skin);add_geom(s,nose,role+'_nose',head,(0,-.01,.108))
    for side,x in [('L',-.041),('R',.041)]:
        add_geom(s,ellipsoid((.019,.010,.007),white,2),role+'_eye_'+side,head,(x,.027,.101)); add_geom(s,ellipsoid((.0065,.0065,.0045),iris,2),role+'_iris_'+side,head,(x,.027,.109))
    add_geom(s,ellipsoid((.034,.0065,.006),lip,2),role+'_mouth',jaw,(0,-.012,.047))
    if hair_style=='shoulder':
        add_geom(s,ellipsoid((.118,.110,.11),hair,3),role+'_haircap',head,(0,.062,-.035));add_geom(s,capsule_y(.032,.18,hair),role+'_hair_L',head,(-.105,-.09,-.04));add_geom(s,capsule_y(.032,.18,hair),role+'_hair_R',head,(.105,-.09,-.04))
    elif hair_style=='bun':
        add_geom(s,ellipsoid((.112,.098,.105),hair,3),role+'_haircap',head,(0,.065,-.025));add_geom(s,ellipsoid((.075,.075,.075),hair,2),role+'_hair_bun',head,(0,.13,-.06))
    elif hair_style=='crop':
        add_geom(s,ellipsoid((.108,.070,.103),hair,3),role+'_haircap',head,(0,.075,-.025))
    else:
        add_geom(s,ellipsoid((.115,.090,.108),hair,3),role+'_haircap',head,(0,.07,-.025))
    s.graph.update(frame_to=root,frame_from='world',matrix=np.diag([stature,stature,stature,1.0]),metadata={'uraiJoint':True,'realWorldHeightMeters':round(1.82*stature,3),'role':role})
    s.metadata={'urai':{'assetType':'articulated-human','role':role,'units':'meters','axis':'Y-up','cameraAspect':'5:4','riggingType':'articulated-rigid-joint-hierarchy','smoothSkinningGate':'pending','animationSet':['Idle','Listen','Speak','GuideGesture']}}
    return s

def make_anim_postprocessor(role):
    def add_array(buffer_items,tree,key,arr,atype):
        arr=np.asarray(arr,dtype='<f4'); raw=arr.tobytes(); raw+=b'\x00' * ((4-len(raw)%4)%4)
        view_index=len(buffer_items); buffer_items[key]=raw
        acc={'bufferView':view_index,'componentType':5126,'count':len(arr) if arr.ndim==1 else arr.shape[0],'type':atype}
        if atype=='SCALAR': acc['min']=[float(np.min(arr))];acc['max']=[float(np.max(arr))]
        accessors=tree.setdefault('accessors',OrderedDict()); accessor_index=len(accessors); accessors[f'anim_accessor_{key}']=acc; return accessor_index
    def pp(buffer_items,tree):
        nodes={n.get('name'):i for i,n in enumerate(tree.get('nodes',[]))}
        for joint_name in [role+'_chest', role+'_head_joint', role+'_jaw_joint', role+'_shoulder_R', role+'_elbow_R', role+'_shoulder_L']:
            idx=nodes.get(joint_name)
            if idx is not None and 'matrix' in tree['nodes'][idx]:
                matrix=tree['nodes'][idx].pop('matrix')
                tree['nodes'][idx]['translation']=[float(matrix[12]),float(matrix[13]),float(matrix[14])]
        clips=[]
        def clip(name,tracks):
            samplers=[];channels=[]
            for ti,(node_name,path,times,values) in enumerate(tracks):
                if node_name not in nodes: raise RuntimeError(f'missing node {node_name}')
                ia=add_array(buffer_items,tree,f'{name}_{ti}_t',np.asarray(times,dtype=np.float32),'SCALAR')
                vals=np.asarray(values,dtype=np.float32); otype='VEC4' if path=='rotation' else 'VEC3'
                oa=add_array(buffer_items,tree,f'{name}_{ti}_v',vals,otype)
                samplers.append({'input':ia,'output':oa,'interpolation':'LINEAR'}); channels.append({'sampler':len(samplers)-1,'target':{'node':nodes[node_name],'path':path}})
            clips.append({'name':name,'samplers':samplers,'channels':channels})
        chest=role+'_chest'; head=role+'_head_joint'; jaw=role+'_jaw_joint'; rs=role+'_shoulder_R'; re=role+'_elbow_R'; ls=role+'_shoulder_L'
        clip('Idle',[(chest,'scale',[0,1.5,3],[[1,1,1],[1.008,1.012,1.008],[1,1,1]]),(head,'rotation',[0,1.5,3],[qy(0),qy(.018),qy(0)])])
        clip('Listen',[(head,'rotation',[0,.7,1.4,2.1],[qy(0),qmul(qy(-.08),qz(.025)),qmul(qy(-.05),qz(.035)),qy(0)]),(chest,'rotation',[0,1.0,2.1],[qx(0),qx(-.025),qx(0)])])
        clip('Speak',[(jaw,'rotation',[0,.18,.36,.54,.72,.9,1.08,1.26],[qx(0),qx(.07),qx(.015),qx(.06),qx(.01),qx(.075),qx(.02),qx(0)]),(head,'rotation',[0,.63,1.26],[qy(0),qy(.025),qy(0)])])
        clip('GuideGesture',[(rs,'rotation',[0,.55,1.1,1.65,2.2],[qz(0),qmul(qz(-.55),qx(-.12)),qmul(qz(-.85),qx(-.18)),qmul(qz(-.55),qx(-.12)),qz(0)]),(re,'rotation',[0,.55,1.1,1.65,2.2],[qz(0),qz(-.35),qz(-.65),qz(-.35),qz(0)]),(ls,'rotation',[0,1.1,2.2],[qz(0),qz(.08),qz(0)])])
        tree['animations']=clips
        tree['asset'].setdefault('extras',{})['uraiAnimationAuthority']='articulated-human-v1'
    return pp

def glb_json(path):
    data=path.read_bytes(); jlen,jtype=struct.unpack_from('<II',data,12); assert jtype==0x4E4F534A
    return json.loads(data[20:20+jlen].decode('utf-8').rstrip(' \x00'))

def main():
    people=[('guide','#b8795e','#4b3327','#293b50',1.01,'short'),('mirror','#704837','#111111','#555c63',.97,'shoulder'),('guardian','#925d46','#111111','#293b50',1.05,'crop'),('archivist','#d0a183','#67615b','#b7ad9d',.96,'bun'),('builder','#aa765c','#4b3327','#66574a',1.03,'short'),('trickster','#925d46','#111111','#303033',.99,'crop')]
    manifest={'packId':'urai-articulated-humans-v1','cameraAspect':'5:4','units':'meters','models':[]}
    for role,skin,hair,shirt,stature,style in people:
        scene=build_scene(role,skin,hair,shirt,stature,style)
        data=trimesh.exchange.gltf.export_glb(scene,include_normals=True,buffer_postprocessor=make_anim_postprocessor(role))
        path=OUT/f'council-{role}-human-articulated-v1.glb';path.write_bytes(data)
        doc=glb_json(path)
        manifest['models'].append({'file':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'nodes':len(doc.get('nodes',[])),'meshes':len(doc.get('meshes',[])),'animations':[a['name'] for a in doc.get('animations',[])]})
    manifest['authority']={'selectedProduction':False,'riggingType':'articulated-rigid-joint-hierarchy','smoothSkinningGate':'pending','promotionRequires':['github-binary-receipt','runtime-useAnimations-proof','multi-device-render-proof','smooth-skin-or-scanned-character-review']}
    RECEIPT.write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
