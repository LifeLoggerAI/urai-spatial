from __future__ import annotations
import io, json, math, struct, hashlib
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure
from PIL import Image

REPO_ROOT=Path(__file__).resolve().parents[1]
OUT=REPO_ROOT/'urai-tier1'/'public'/'assets'/'urai'/'generated'/'human-rig-v3'; OUT.mkdir(parents=True,exist_ok=True)
RECEIPT=REPO_ROOT/'operations'/'assets'/'generated-receipts'/'urai-human-rig-v3.json'; RECEIPT.parent.mkdir(parents=True,exist_ok=True)
F32=5126; U32=5125; U16=5123; ARRAY=34962; ELEMENT=34963

def align4(n): return (n+3)&~3

def quat(rx=0,ry=0,rz=0):
    cx,sx=math.cos(rx/2),math.sin(rx/2); cy,sy=math.cos(ry/2),math.sin(ry/2); cz,sz=math.cos(rz/2),math.sin(rz/2)
    return [sx*cy*cz+cx*sy*sz,cx*sy*cz-sx*cy*sz,cx*cy*sz+sx*sy*cz,cx*cy*cz-sx*sy*sz]

def compute_normals(v,f):
    n=np.zeros_like(v,dtype=np.float32); tri=v[f]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); ln=np.linalg.norm(fn,axis=1); fn/=np.maximum(ln[:,None],1e-8)
    for k in range(3): np.add.at(n,f[:,k],fn)
    ln=np.linalg.norm(n,axis=1); n/=np.maximum(ln[:,None],1e-8); return n.astype(np.float32)

def texture_png(base, seed, kind='skin', size=128):
    rng=np.random.default_rng(seed); noise=rng.normal(0,1,(size,size)).astype(np.float32)
    noise=gaussian_filter(noise, sigma=1.0 if kind=='skin' else .55)
    noise=(noise-noise.min())/(noise.max()-noise.min()+1e-8)-.5
    y,x=np.mgrid[0:size,0:size]
    if kind=='cloth': noise += .08*np.sin(x*.55)+.06*np.sin(y*.62)
    if kind=='hair': noise += .13*np.sin((x+y*.12)*.35)
    base=np.array(base,dtype=np.float32)
    amp={'skin':9,'cloth':14,'hair':10,'shoe':5}.get(kind,8)
    rgb=np.clip(base[None,None,:]+noise[:,:,None]*amp,0,255).astype(np.uint8)
    rgba=np.concatenate([rgb,np.full((size,size,1),255,dtype=np.uint8)],axis=2)
    buf=io.BytesIO(); Image.fromarray(rgba,'RGBA').save(buf,format='PNG',optimize=True); return buf.getvalue()

class GLB:
    def __init__(self,name):
        self.name=name; self.bin=bytearray(); self.views=[]; self.acc=[]; self.meshes=[]; self.nodes=[]; self.materials=[]; self.images=[]; self.textures=[]; self.samplers=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]; self.anim=[]; self.skins=[]
    def append(self,b,target=None):
        off=align4(len(self.bin)); self.bin.extend(b'\0'*(off-len(self.bin))); self.bin.extend(b); d={'buffer':0,'byteOffset':off,'byteLength':len(b)}
        if target: d['target']=target
        self.views.append(d); return len(self.views)-1
    def accessor(self,a,type_,component,target=None,normalized=False,minmax=True):
        a=np.asarray(a); view=self.append(a.tobytes(),target); comps={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[type_]; d={'bufferView':view,'componentType':component,'count':int(a.size/comps),'type':type_}
        if normalized:d['normalized']=True
        if minmax and type_!='MAT4':
            flat=a.reshape(-1,comps).astype(np.float64); d['min']=flat.min(0).tolist(); d['max']=flat.max(0).tolist()
        self.acc.append(d); return len(self.acc)-1
    def add_texture(self,png,name):
        v=self.append(png); self.images.append({'name':name,'mimeType':'image/png','bufferView':v}); self.textures.append({'sampler':0,'source':len(self.images)-1,'name':name}); return len(self.textures)-1
    def material(self,name,color,rough=.7,metal=0,kind='cloth',seed=1):
        tex=self.add_texture(texture_png(color,seed,kind),name+'-albedo')
        d={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'baseColorTexture':{'index':tex},'metallicFactor':metal,'roughnessFactor':rough}}
        self.materials.append(d); return len(self.materials)-1
    def node(self,name,parent=None,mesh=None,t=None,r=None,skin=None,extras=None):
        d={'name':name}
        if mesh is not None:d['mesh']=mesh
        if t is not None:d['translation']=[float(x) for x in t]
        if r is not None:d['rotation']=[float(x) for x in r]
        if skin is not None:d['skin']=skin
        if extras:d['extras']=extras
        self.nodes.append(d); idx=len(self.nodes)-1
        if parent is not None:self.nodes[parent].setdefault('children',[]).append(idx)
        return idx
    def add_mesh(self,name,v,n,uv,joints,weights,face_groups):
        p=self.accessor(v.astype('<f4'),'VEC3',F32,ARRAY); no=self.accessor(n.astype('<f4'),'VEC3',F32,ARRAY); u=self.accessor(uv.astype('<f4'),'VEC2',F32,ARRAY); j=self.accessor(joints.astype('<u2'),'VEC4',U16,ARRAY); w=self.accessor(weights.astype('<f4'),'VEC4',F32,ARRAY)
        prim=[]
        for material,faces in face_groups:
            ind=self.accessor(faces.astype('<u4').reshape(-1),'SCALAR',U32,ELEMENT)
            prim.append({'attributes':{'POSITION':p,'NORMAL':no,'TEXCOORD_0':u,'JOINTS_0':j,'WEIGHTS_0':w},'indices':ind,'material':material,'mode':4})
        self.meshes.append({'name':name,'primitives':prim}); return len(self.meshes)-1
    def add_rigid_mesh(self,name,v,f,n,uv,material):
        p=self.accessor(v.astype('<f4'),'VEC3',F32,ARRAY); no=self.accessor(n.astype('<f4'),'VEC3',F32,ARRAY); u=self.accessor(uv.astype('<f4'),'VEC2',F32,ARRAY); ind=self.accessor(f.astype('<u4').reshape(-1),'SCALAR',U32,ELEMENT)
        self.meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':p,'NORMAL':no,'TEXCOORD_0':u},'indices':ind,'material':material,'mode':4}]}); return len(self.meshes)-1
    def add_skin(self,joints,ibm,skeleton):
        a=self.accessor(np.asarray(ibm,dtype='<f4').reshape(-1,16),'MAT4',F32,minmax=False); self.skins.append({'name':'URAI humanoid rig','inverseBindMatrices':a,'joints':joints,'skeleton':skeleton}); return len(self.skins)-1
    def clip(self,name,tracks):
        sam=[]; ch=[]
        for node,path,times,values in tracks:
            ia=self.accessor(np.asarray(times,dtype='<f4'),'SCALAR',F32); comp=4 if path=='rotation' else 3; oa=self.accessor(np.asarray(values,dtype='<f4').reshape(-1,comp),f'VEC{comp}',F32)
            si=len(sam); sam.append({'input':ia,'output':oa,'interpolation':'LINEAR'}); ch.append({'sampler':si,'target':{'node':node,'path':path}})
        self.anim.append({'name':name,'samplers':sam,'channels':ch})
    def write(self,path,scene_roots):
        doc={'asset':{'version':'2.0','generator':'URAI Human Rig Forge V3','extras':{'units':'meters','axis':'Y-up','cameraAspect':'5:4','rigged':True}},'scene':0,'scenes':[{'name':self.name,'nodes':scene_roots}],'nodes':self.nodes,'meshes':self.meshes,'materials':self.materials,'samplers':self.samplers,'textures':self.textures,'images':self.images,'skins':self.skins,'animations':self.anim,'buffers':[{'byteLength':align4(len(self.bin))}],'bufferViews':self.views,'accessors':self.acc}
        jb=json.dumps(doc,separators=(',',':')).encode(); jp=jb+b' '*(align4(len(jb))-len(jb)); bp=bytes(self.bin)+b'\0'*(align4(len(self.bin))-len(self.bin)); total=12+8+len(jp)+8+len(bp); out=bytearray(total); struct.pack_into('<III',out,0,0x46546C67,2,total); struct.pack_into('<I4s',out,12,len(jp),b'JSON'); out[20:20+len(jp)]=jp; bo=20+len(jp); struct.pack_into('<I4s',out,bo,len(bp),b'BIN\0'); out[bo+8:bo+8+len(bp)]=bp; path.write_bytes(out); return bytes(out)

def sphere_mesh(scale=(1,1,1),sub=2):
    import trimesh
    m=trimesh.creation.icosphere(subdivisions=sub,radius=1); m.apply_scale(scale); v=np.asarray(m.vertices,dtype=np.float32); f=np.asarray(m.faces,dtype=np.uint32); n=compute_normals(v,f); lo=v.min(0); hi=v.max(0); uv=np.stack([(v[:,0]-lo[0])/(hi[0]-lo[0]+1e-8),(v[:,1]-lo[1])/(hi[1]-lo[1]+1e-8)],1).astype(np.float32); return v,f,n,uv

def implicit_body(cfg,res=(72,148,64)):
    nx,ny,nz=res; xs=np.linspace(-1.45,1.45,nx); ys=np.linspace(-.08,5.03,ny); zs=np.linspace(-.88,.88,nz); X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij'); field=np.full(res,12.0,dtype=np.float32)
    def e(cx,cy,cz,rx,ry,rz):
        nonlocal field; d=((X-cx)/rx)**2+((Y-cy)/ry)**2+((Z-cz)/rz)**2; field=np.minimum(field,d)
    sh=cfg.get('shoulder',1); hip=cfg.get('hip',1); mass=cfg.get('mass',1); head=cfg.get('head',1)
    e(0,4.39,.015,.455*head,.555*head,.40*head); e(0,4.00,.0,.27,.34,.27); e(0,3.55,.0,.74*sh,.76,.44*mass); e(0,2.98,.0,.61*mass,.65,.41*mass); e(0,2.48,0,.58*hip,.55,.42*hip)
    for side in (-1,1):
        e(side*.70*sh,3.51,0,.33,.50,.30); e(side*.87*sh,3.13,.015,.26,.48,.25); e(side*.82*sh,2.72,.08,.24,.44,.23); e(side*.72*sh,2.35,.17,.22,.28,.24)
    for side in (-1,1):
        e(side*.33*hip,1.75,0,.34*hip,.84,.34*mass); e(side*.34*hip,.94,.018,.29,.78,.30); e(side*.34*hip,.28,.18,.30,.38,.49)
    e(0,4.16,.24,.31,.30,.24); e(0,4.02,.25,.22,.18,.20)
    field=gaussian_filter(field,sigma=(1.0,1.15,1.0)); verts,faces,_,_=measure.marching_cubes(field,level=1.0,spacing=(xs[1]-xs[0],ys[1]-ys[0],zs[1]-zs[0])); verts[:,0]+=xs[0]; verts[:,1]+=ys[0]; verts[:,2]+=zs[0]
    verts[:,0]*=.325*cfg.get('width',1); verts[:,1]*=.372*cfg.get('stature',1); verts[:,2]*=.325*cfg.get('depth',1); verts[:,1]-=verts[:,1].min(); faces=faces.astype(np.uint32); n=compute_normals(verts,faces); lo=verts.min(0); hi=verts.max(0); uv=np.stack([(np.arctan2(verts[:,2],verts[:,0])/(2*np.pi)+.5), (verts[:,1]-lo[1])/(hi[1]-lo[1]+1e-8)],1).astype(np.float32); return verts.astype(np.float32),faces,n,uv

def face_groups(v,f,h,mats):
    c=v[f].mean(1); x=np.abs(c[:,0]); y=c[:,1]/h; head=y>.80; hands=(y>.39)&(y<.69)&(x>.19); shoes=y<.115; trousers=(y<.49)&(~shoes)&(~hands); shirt=(~head)&(~hands)&(~shoes)&(~trousers)
    return [(mats['skin'],f[head|hands]),(mats['shirt'],f[shirt]),(mats['trouser'],f[trousers]),(mats['shoe'],f[shoes])]

def skeleton_for(h):
    p={'hips':np.array([0,.49*h,0.0]),'spine':np.array([0,.61*h,0]),'chest':np.array([0,.735*h,0]),'neck':np.array([0,.835*h,0]),'head':np.array([0,.905*h,0]),'L_shoulder':np.array([-.135*h,.735*h,0]),'L_elbow':np.array([-.17*h,.59*h,.012*h]),'L_wrist':np.array([-.145*h,.43*h,.055*h]),'R_shoulder':np.array([.135*h,.735*h,0]),'R_elbow':np.array([.17*h,.59*h,.012*h]),'R_wrist':np.array([.145*h,.43*h,.055*h]),'L_hip':np.array([-.07*h,.49*h,0]),'L_knee':np.array([-.07*h,.275*h,.008*h]),'L_ankle':np.array([-.07*h,.07*h,.035*h]),'R_hip':np.array([.07*h,.49*h,0]),'R_knee':np.array([.07*h,.275*h,.008*h]),'R_ankle':np.array([.07*h,.07*h,.035*h])}
    parents={'hips':None,'spine':'hips','chest':'spine','neck':'chest','head':'neck','L_shoulder':'chest','L_elbow':'L_shoulder','L_wrist':'L_elbow','R_shoulder':'chest','R_elbow':'R_shoulder','R_wrist':'R_elbow','L_hip':'hips','L_knee':'L_hip','L_ankle':'L_knee','R_hip':'hips','R_knee':'R_hip','R_ankle':'R_knee'}
    return p,parents

def skin_weights(v,h,names,p):
    idx={n:i for i,n in enumerate(names)}; J=np.zeros((len(v),4),dtype=np.uint16); W=np.zeros((len(v),4),dtype=np.float32)
    def pair(mask,a,b,t):
        inds=np.where(mask)[0]; tt=np.clip(t[inds],0,1); J[inds,0]=idx[a];J[inds,1]=idx[b];W[inds,0]=1-tt;W[inds,1]=tt
    y=v[:,1]/h; x=v[:,0]; ax=np.abs(x)
    arm=(ax>.115*h)&(y>.35)&(y<.78); left=arm&(x<0); right=arm&(x>=0)
    for mask,prefix in [(left,'L'),(right,'R')]:
        upper=mask&(y>=.58); pair(upper,f'{prefix}_shoulder',f'{prefix}_elbow',(.735-y)/(.735-.59))
        lower=mask&(y<.58); pair(lower,f'{prefix}_elbow',f'{prefix}_wrist',(.59-y)/(.59-.43))
    leg=(y<.50)&(ax>.025*h); l=leg&(x<0); r=leg&(x>=0)
    for mask,prefix in [(l,'L'),(r,'R')]:
        thigh=mask&(y>=.275); pair(thigh,f'{prefix}_hip',f'{prefix}_knee',(.49-y)/(.49-.275))
        calf=mask&(y<.275); pair(calf,f'{prefix}_knee',f'{prefix}_ankle',(.275-y)/(.275-.07))
    core=~(arm|leg); head=core&(y>.835); pair(head,'neck','head',(y-.835)/(.905-.835)); torso=core&(y<=.835)&(y>.49); inds=np.where(torso)[0]
    for i in inds:
        yy=y[i]
        if yy<.61: a,b,q='hips','spine',(yy-.49)/(.61-.49)
        elif yy<.735: a,b,q='spine','chest',(yy-.61)/(.735-.61)
        else: a,b,q='chest','neck',(yy-.735)/(.835-.735)
        J[i,0]=idx[a];J[i,1]=idx[b];W[i,0]=1-q;W[i,1]=q
    pelvis=core&(y<=.49); J[pelvis,0]=idx['hips'];W[pelvis,0]=1
    z=W.sum(1)==0; J[z,0]=idx['hips'];W[z,0]=1; W/=W.sum(1,keepdims=True)
    return J,W

def rigid_feature(builder,parent,name,scale,t,mat):
    v,f,n,uv=sphere_mesh(scale,2); mi=builder.add_rigid_mesh(name,v,f,n,uv,mat); builder.node(name,parent,mi,t=t)

def build(role,cfg):
    b=GLB('URAI '+role+' rigged human V3'); root=b.node(role+'-root',extras={'productionClass':'rigged-human-candidate','units':'meters','cameraAspect':'5:4'})
    mats={'skin':b.material('skin',cfg['skin_rgb'],.54,0,'skin',cfg['seed']), 'shirt':b.material('shirt',cfg['shirt_rgb'],.88,0,'cloth',cfg['seed']+10), 'trouser':b.material('trouser',(37,40,45),.92,0,'cloth',cfg['seed']+20), 'shoe':b.material('shoe',(22,22,24),.72,.02,'shoe',cfg['seed']+30), 'hair':b.material('hair',cfg['hair_rgb'],.94,0,'hair',cfg['seed']+40), 'eye':b.material('eye',(42,52,49),.25,0,'skin',cfg['seed']+50), 'eye_white':b.material('eye-white',(235,234,228),.28,0,'skin',cfg['seed']+60), 'lip':b.material('lip',(124,71,65),.64,0,'skin',cfg['seed']+70)}
    v,f,n,uv=implicit_body(cfg); current_h=float(v[:,1].max()-v[:,1].min()); target_h=float(cfg['target_height']); v=(v*(target_h/current_h)).astype(np.float32); n=compute_normals(v,f); h=float(v[:,1].max()-v[:,1].min()); p,parents=skeleton_for(h); names=list(parents.keys()); joint_nodes={}; globals={}
    for name in names:
        par=parents[name]; local=p[name] if par is None else p[name]-p[par]; parent=root if par is None else joint_nodes[par]; joint_nodes[name]=b.node(name,parent,t=local.tolist(),extras={'joint':True}); G=np.eye(4,dtype=np.float32);G[:3,3]=p[name];globals[name]=G
    ibm=[np.linalg.inv(globals[name]).astype(np.float32).T.reshape(16) for name in names]
    skin=b.add_skin([joint_nodes[nm] for nm in names],ibm,joint_nodes['hips']); J,W=skin_weights(v,h,names,p); mi=b.add_mesh(role+'-body-skinned',v,n,uv,J,W,face_groups(v,f,h,mats)); b.node(role+'-body',root,mi,skin=skin,extras={'skinned':True,'heightMeters':round(h,4),'jointCount':len(names)})
    head=joint_nodes['head']
    rigid_feature(b,head,role+'-eye-white-L',(h*.0105,h*.0052,h*.0048),[-h*.021,h*.013,h*.055],mats['eye_white']); rigid_feature(b,head,role+'-eye-white-R',(h*.0105,h*.0052,h*.0048),[h*.021,h*.013,h*.055],mats['eye_white']); rigid_feature(b,head,role+'-iris-L',(h*.0034,h*.0034,h*.0026),[-h*.021,h*.013,h*.060],mats['eye']); rigid_feature(b,head,role+'-iris-R',(h*.0034,h*.0034,h*.0026),[h*.021,h*.013,h*.060],mats['eye']); rigid_feature(b,head,role+'-mouth',(h*.018,h*.0038,h*.0035),[0,-h*.030,h*.054],mats['lip']); rigid_feature(b,head,role+'-hair-cap',(h*.067,h*.048,h*.063),[0,h*.040,-h*.012],mats['hair'])
    hips=joint_nodes['hips']; chest=joint_nodes['chest']; headn=joint_nodes['head']; ls=joint_nodes['L_shoulder']; rs=joint_nodes['R_shoulder']; le=joint_nodes['L_elbow']; re=joint_nodes['R_elbow']; hip_local=p['hips'].tolist()
    b.clip('idle_breath',[(hips,'translation',[0,1.5,3],[hip_local,[hip_local[0],hip_local[1]+.006,hip_local[2]],hip_local]),(chest,'rotation',[0,1.5,3],[quat(0,0,-.008),quat(.012,0,.008),quat(0,0,-.008)]),(headn,'rotation',[0,1.5,3],[quat(0,-.012,0),quat(.006,.012,0),quat(0,-.012,0)])])
    b.clip('listen_acknowledge',[(headn,'rotation',[0,.45,.9,1.35],[quat(0,0,0),quat(-.05,0,0),quat(.025,0,0),quat(0,0,0)]),(chest,'rotation',[0,.65,1.35],[quat(0,0,0),quat(-.018,0,0),quat(0,0,0)])])
    b.clip('speak_calm',[(headn,'rotation',[0,.5,1,1.5,2],[quat(0,-.025,0),quat(.015,.028,0),quat(-.01,-.018,0),quat(.012,.022,0),quat(0,-.025,0)]),(rs,'rotation',[0,1,2],[quat(0,0,0),quat(.05,0,-.08),quat(0,0,0)])])
    b.clip('gesture_open',[(rs,'rotation',[0,.6,1.4,2],[quat(0,0,0),quat(.12,0,-.34),quat(.08,0,-.28),quat(0,0,0)]),(re,'rotation',[0,.6,1.4,2],[quat(0,0,0),quat(0,0,.20),quat(0,0,.12),quat(0,0,0)]),(ls,'rotation',[0,.6,1.4,2],[quat(0,0,0),quat(.08,0,.18),quat(.05,0,.14),quat(0,0,0)])])
    b.clip('gaze_shift',[(headn,'rotation',[0,.7,1.4,2.1],[quat(0,0,0),quat(0,.13,0),quat(.015,-.10,0),quat(0,0,0)])])
    path=OUT/(('home-human-rigged-v3.glb') if role=='home' else f'council-{role}-human-rigged-v3.glb'); data=b.write(path,[root]); return {'role':role,'fileName':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'heightMeters':round(h,4),'vertices':len(v),'faces':len(f),'joints':len(names),'animations':[a['name'] for a in b.anim],'embeddedTextures':len(b.images)}

CONFIG={
'home':{'target_height':1.82,'skin_rgb':(185,133,106),'hair_rgb':(66,44,34),'shirt_rgb':(57,74,73),'seed':11,'stature':1,'shoulder':.98,'hip':1,'mass':1,'width':.96,'depth':.97},
'guide':{'target_height':1.84,'skin_rgb':(184,121,94),'hair_rgb':(72,48,35),'shirt_rgb':(42,59,77),'seed':21,'stature':1.01,'shoulder':1.02,'hip':.98,'mass':.98,'width':.98,'depth':.98},
'mirror':{'target_height':1.76,'skin_rgb':(111,72,55),'hair_rgb':(18,18,18),'shirt_rgb':(85,93,98),'seed':31,'stature':.97,'shoulder':.96,'hip':1.03,'mass':.98,'width':.97,'depth':.98},
'guardian':{'target_height':1.92,'skin_rgb':(145,95,73),'hair_rgb':(17,17,17),'shirt_rgb':(40,58,78),'seed':41,'stature':1.05,'shoulder':1.08,'hip':1,'mass':1.04,'width':1.02,'depth':1.03},
'archivist':{'target_height':1.73,'skin_rgb':(208,161,131),'hair_rgb':(104,97,91),'shirt_rgb':(170,161,146),'seed':51,'stature':.96,'shoulder':.94,'hip':1.02,'mass':.96,'width':.96,'depth':.97},
'builder':{'target_height':1.88,'skin_rgb':(169,120,92),'hair_rgb':(67,45,34),'shirt_rgb':(104,89,75),'seed':61,'stature':1.03,'shoulder':1.07,'hip':1,'mass':1.03,'width':1.01,'depth':1.02},
'trickster':{'target_height':1.80,'skin_rgb':(147,96,74),'hair_rgb':(18,18,18),'shirt_rgb':(48,48,51),'seed':71,'stature':.99,'shoulder':.95,'hip':.98,'mass':.94,'width':.96,'depth':.96},
}

assets=[build(role,cfg) for role,cfg in CONFIG.items()]
receipt={'schemaVersion':'3.0.0','packId':'urai-human-rig-v3','generated':'2026-08-11','cameraAspect':'5:4','units':'meters','selectedProduction':False,'promotionRequires':['rendered-motion-proof','facial-expression-upgrade','mobile-lod','final-topology/provenance-review'],'modelCount':len(assets),'totalVertices':sum(a['vertices'] for a in assets),'totalFaces':sum(a['faces'] for a in assets),'assets':assets}
RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n'); (OUT/'README.md').write_text('# URAI Human Rig V3\n\nSeven actual skinned GLBs with JOINTS_0/WEIGHTS_0, inverse bind matrices, a 17-joint humanoid skeleton, five named animation clips, embedded PBR albedo textures, continuous body topology, and relaxed bent-arm rest silhouettes. 5:4 framing; meters; Y-up. Production candidates pending final topology/facial/LOD/render QA.\n')
print(json.dumps(receipt,indent=2))
