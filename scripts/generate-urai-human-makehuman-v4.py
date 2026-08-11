from __future__ import annotations
import argparse, io, json, math, struct, hashlib
from pathlib import Path
import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter
from PIL import Image

REPO_ROOT=Path(__file__).resolve().parents[1]
OUT=REPO_ROOT/'urai-tier1'/'public'/'assets'/'urai'/'generated'/'human-makehuman-v4'
RECEIPT=REPO_ROOT/'operations'/'assets'/'generated-receipts'/'urai-human-makehuman-v4.json'
OUT.mkdir(parents=True,exist_ok=True); RECEIPT.parent.mkdir(parents=True,exist_ok=True)
F32=5126; U32=5125; U16=5123; ARRAY=34962; ELEMENT=34963
SOURCE_REPO='makehumancommunity/makehuman'; SOURCE_COMMIT='a8bc2d54ff0ac92e78ff71431b1023eda42bf482'; SOURCE_BLOB='d26635e9326e3cca30778fd7b9c00062b03cce09'; SOURCE_PATH='makehuman/data/3dobjs/base.obj'

def align4(n): return (n+3)&~3

def quat(rx=0,ry=0,rz=0):
    cx,sx=math.cos(rx/2),math.sin(rx/2); cy,sy=math.cos(ry/2),math.sin(ry/2); cz,sz=math.cos(rz/2),math.sin(rz/2)
    return [sx*cy*cz+cx*sy*sz,cx*sy*cz-sx*cy*sz,cx*cy*sz+sx*sy*cz,cx*cy*cz-sx*sy*sz]

def normals(v,f):
    n=np.zeros_like(v,dtype=np.float32); tri=v[f]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); fn/=np.maximum(np.linalg.norm(fn,axis=1)[:,None],1e-8)
    for k in range(3): np.add.at(n,f[:,k],fn)
    n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-8); return n.astype(np.float32)

def tex(base,seed,kind,size=128):
    rng=np.random.default_rng(seed); z=gaussian_filter(rng.normal(0,1,(size,size)).astype(np.float32),1 if kind=='skin' else .55); z=(z-z.min())/(z.max()-z.min()+1e-8)-.5; y,x=np.mgrid[0:size,0:size]
    if kind=='cloth': z+=.07*np.sin(x*.55)+.05*np.sin(y*.62)
    if kind=='hair': z+=.12*np.sin((x+y*.12)*.35)
    rgb=np.clip(np.array(base,dtype=np.float32)[None,None,:]+z[:,:,None]*({'skin':8,'cloth':13,'hair':9,'shoe':4}.get(kind,8)),0,255).astype(np.uint8); rgba=np.concatenate([rgb,np.full((size,size,1),255,dtype=np.uint8)],2); b=io.BytesIO(); Image.fromarray(rgba,'RGBA').save(b,format='PNG',optimize=True); return b.getvalue()

class GLB:
    def __init__(self,name): self.name=name; self.bin=bytearray(); self.views=[]; self.acc=[]; self.meshes=[]; self.nodes=[]; self.materials=[]; self.images=[]; self.textures=[]; self.samplers=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]; self.skins=[]; self.anims=[]
    def append(self,b,target=None):
        o=align4(len(self.bin)); self.bin.extend(b'\0'*(o-len(self.bin))); self.bin.extend(b); d={'buffer':0,'byteOffset':o,'byteLength':len(b)}; d.update({'target':target} if target else {}); self.views.append(d); return len(self.views)-1
    def accessor(self,a,t,c,target=None,minmax=True):
        a=np.asarray(a); comps={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[t]; d={'bufferView':self.append(a.tobytes(),target),'componentType':c,'count':int(a.size/comps),'type':t}
        if minmax and t!='MAT4': q=a.reshape(-1,comps).astype(float); d['min']=q.min(0).tolist(); d['max']=q.max(0).tolist()
        self.acc.append(d); return len(self.acc)-1
    def material(self,name,color,rough,metal,kind,seed):
        view=self.append(tex(color,seed,kind)); self.images.append({'name':name+'-albedo','mimeType':'image/png','bufferView':view}); self.textures.append({'sampler':0,'source':len(self.images)-1,'name':name+'-albedo'}); self.materials.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'baseColorTexture':{'index':len(self.textures)-1},'metallicFactor':metal,'roughnessFactor':rough}}); return len(self.materials)-1
    def node(self,name,parent=None,mesh=None,t=None,r=None,skin=None,extras=None):
        d={'name':name}
        if mesh is not None:d['mesh']=mesh
        if t is not None:d['translation']=[float(x) for x in t]
        if r is not None:d['rotation']=[float(x) for x in r]
        if skin is not None:d['skin']=skin
        if extras:d['extras']=extras
        self.nodes.append(d); i=len(self.nodes)-1
        if parent is not None:self.nodes[parent].setdefault('children',[]).append(i)
        return i
    def mesh(self,name,v,n,uv,j,w,groups):
        p=self.accessor(v.astype('<f4'),'VEC3',F32,ARRAY); no=self.accessor(n.astype('<f4'),'VEC3',F32,ARRAY); u=self.accessor(uv.astype('<f4'),'VEC2',F32,ARRAY); ja=self.accessor(j.astype('<u2'),'VEC4',U16,ARRAY); wa=self.accessor(w.astype('<f4'),'VEC4',F32,ARRAY); prim=[]
        for mat,faces in groups: prim.append({'attributes':{'POSITION':p,'NORMAL':no,'TEXCOORD_0':u,'JOINTS_0':ja,'WEIGHTS_0':wa},'indices':self.accessor(faces.astype('<u4').reshape(-1),'SCALAR',U32,ELEMENT),'material':mat,'mode':4})
        self.meshes.append({'name':name,'primitives':prim}); return len(self.meshes)-1
    def skin(self,joints,ibm,skeleton): self.skins.append({'name':'URAI MakeHuman humanoid rig','inverseBindMatrices':self.accessor(np.asarray(ibm,dtype='<f4').reshape(-1,16),'MAT4',F32,minmax=False),'joints':joints,'skeleton':skeleton}); return len(self.skins)-1
    def clip(self,name,tracks):
        sam=[]; ch=[]
        for node,path,times,values in tracks:
            ia=self.accessor(np.asarray(times,dtype='<f4'),'SCALAR',F32); comp=4 if path=='rotation' else 3; oa=self.accessor(np.asarray(values,dtype='<f4').reshape(-1,comp),f'VEC{comp}',F32); si=len(sam); sam.append({'input':ia,'output':oa,'interpolation':'LINEAR'}); ch.append({'sampler':si,'target':{'node':node,'path':path}})
        self.anims.append({'name':name,'samplers':sam,'channels':ch})
    def write(self,path,roots):
        doc={'asset':{'version':'2.0','generator':'URAI MakeHuman Rig Forge V4','extras':{'units':'meters','axis':'Y-up','cameraAspect':'5:4','rigged':True,'sourceRepo':SOURCE_REPO,'sourceCommit':SOURCE_COMMIT,'sourceBlob':SOURCE_BLOB,'sourceLicense':'CC0-1.0'}},'scene':0,'scenes':[{'name':self.name,'nodes':roots}],'nodes':self.nodes,'meshes':self.meshes,'materials':self.materials,'samplers':self.samplers,'textures':self.textures,'images':self.images,'skins':self.skins,'animations':self.anims,'buffers':[{'byteLength':align4(len(self.bin))}],'bufferViews':self.views,'accessors':self.acc}; jb=json.dumps(doc,separators=(',',':')).encode(); jp=jb+b' '*(align4(len(jb))-len(jb)); bp=bytes(self.bin)+b'\0'*(align4(len(self.bin))-len(self.bin)); total=12+8+len(jp)+8+len(bp); out=bytearray(total); struct.pack_into('<III',out,0,0x46546C67,2,total); struct.pack_into('<I4s',out,12,len(jp),b'JSON'); out[20:20+len(jp)]=jp; o=20+len(jp); struct.pack_into('<I4s',out,o,len(bp),b'BIN\0'); out[o+8:o+8+len(bp)]=bp; path.write_bytes(out); return bytes(out)

def load_base(obj_path):
    loaded=trimesh.load(obj_path,force='scene',process=False); meshes=[g.copy() for g in loaded.geometry.values() if isinstance(g,trimesh.Trimesh)]
    if not meshes: raise RuntimeError('MakeHuman OBJ contains no triangle mesh')
    m=trimesh.util.concatenate(meshes); v=np.asarray(m.vertices,dtype=np.float32); f=np.asarray(m.faces,dtype=np.uint32); ext=np.ptp(v,axis=0); hy=int(np.argmax(ext)); rem=[a for a in range(3) if a!=hy]; wx=rem[int(ext[rem[1]]>ext[rem[0]])]; dz=[a for a in rem if a!=wx][0]; v=v[:,[wx,hy,dz]]; v[:,0]-=(v[:,0].min()+v[:,0].max())/2; v[:,2]-=(v[:,2].min()+v[:,2].max())/2; v[:,1]-=v[:,1].min(); return v,f

def skeleton(h,span):
    sx=max(.14*h,min(.21*h,span*.17)); wx=max(sx+.12*h,min(.48*h,span*.47)); ex=(sx+wx)*.53
    p={'hips':np.array([0,.49*h,0]),'spine':np.array([0,.61*h,0]),'chest':np.array([0,.735*h,0]),'neck':np.array([0,.835*h,0]),'head':np.array([0,.91*h,0]),'L_shoulder':np.array([-sx,.735*h,0]),'L_elbow':np.array([-ex,.68*h,0]),'L_wrist':np.array([-wx,.61*h,0]),'R_shoulder':np.array([sx,.735*h,0]),'R_elbow':np.array([ex,.68*h,0]),'R_wrist':np.array([wx,.61*h,0]),'L_hip':np.array([-.07*h,.49*h,0]),'L_knee':np.array([-.07*h,.275*h,0]),'L_ankle':np.array([-.07*h,.07*h,.02*h]),'R_hip':np.array([.07*h,.49*h,0]),'R_knee':np.array([.07*h,.275*h,0]),'R_ankle':np.array([.07*h,.07*h,.02*h])}; parents={'hips':None,'spine':'hips','chest':'spine','neck':'chest','head':'neck','L_shoulder':'chest','L_elbow':'L_shoulder','L_wrist':'L_elbow','R_shoulder':'chest','R_elbow':'R_shoulder','R_wrist':'R_elbow','L_hip':'hips','L_knee':'L_hip','L_ankle':'L_knee','R_hip':'hips','R_knee':'R_hip','R_ankle':'R_knee'}; return p,parents

def weights(v,h,names,p):
    idx={n:i for i,n in enumerate(names)}; J=np.zeros((len(v),4),dtype=np.uint16); W=np.zeros((len(v),4),dtype=np.float32); y=v[:,1]/h; x=v[:,0]; ax=np.abs(x); shoulder=abs(p['R_shoulder'][0]); wrist=abs(p['R_wrist'][0])
    def blend(mask,a,b,q):
        ii=np.where(mask)[0]; qq=np.clip(q[ii],0,1); J[ii,0]=idx[a];J[ii,1]=idx[b];W[ii,0]=1-qq;W[ii,1]=qq
    arm=(ax>shoulder*.92)&(y>.48); t=(ax-shoulder)/max(wrist-shoulder,1e-5)
    for mask,prefix in [(arm&(x<0),'L'),(arm&(x>=0),'R')]: blend(mask&(t<=.5),f'{prefix}_shoulder',f'{prefix}_elbow',t*2); blend(mask&(t>.5),f'{prefix}_elbow',f'{prefix}_wrist',(t-.5)*2)
    leg=(y<.5)&(ax>.022*h)
    for mask,prefix in [(leg&(x<0),'L'),(leg&(x>=0),'R')]: blend(mask&(y>=.275),f'{prefix}_hip',f'{prefix}_knee',(.49-y)/(.49-.275)); blend(mask&(y<.275),f'{prefix}_knee',f'{prefix}_ankle',(.275-y)/(.275-.07))
    core=~(arm|leg); blend(core&(y>.84),'neck','head',(y-.84)/.075); torso=core&(y<=.84)&(y>.49)
    for i in np.where(torso)[0]:
        yy=y[i]
        if yy<.61:a,b,q='hips','spine',(yy-.49)/.12
        elif yy<.735:a,b,q='spine','chest',(yy-.61)/.125
        else:a,b,q='chest','neck',(yy-.735)/.105
        J[i,0]=idx[a];J[i,1]=idx[b];W[i,0]=1-q;W[i,1]=q
    pelvis=core&(y<=.49); J[pelvis,0]=idx['hips'];W[pelvis,0]=1; zero=W.sum(1)==0; J[zero,0]=idx['hips'];W[zero,0]=1; W/=W.sum(1,keepdims=True); return J,W

def groups(v,f,h,m):
    c=v[f].mean(1); y=c[:,1]/h; x=np.abs(c[:,0]); skin=(y>.79)|((x>.18*h)&(y>.48)); shoe=y<.09; trouser=(y<.50)&(~shoe)&(~skin); shirt=~(skin|shoe|trouser); return [(m['skin'],f[skin]),(m['shirt'],f[shirt]),(m['trouser'],f[trouser]),(m['shoe'],f[shoe])]

def build(role,cfg,base_v,faces):
    v=base_v.copy(); v*=cfg['height']/np.ptp(v[:,1]); v[:,0]*=cfg.get('width',1); v[:,2]*=cfg.get('depth',1); v[:,1]-=v[:,1].min(); h=float(np.ptp(v[:,1])); span=float(np.ptp(v[:,0])); n=normals(v,faces); lo=v.min(0); hi=v.max(0); uv=np.stack([(np.arctan2(v[:,2],v[:,0])/(2*np.pi)+.5),(v[:,1]-lo[1])/(hi[1]-lo[1]+1e-8)],1).astype(np.float32); b=GLB('URAI '+role+' MakeHuman V4'); root=b.node(role+'-root',extras={'productionClass':'makehuman-cc0-rigged-candidate','units':'meters','cameraAspect':'5:4'}); mats={'skin':b.material('skin',cfg['skin'],.52,0,'skin',cfg['seed']),'shirt':b.material('shirt',cfg['shirt'],.88,0,'cloth',cfg['seed']+10),'trouser':b.material('trouser',(38,41,46),.92,0,'cloth',cfg['seed']+20),'shoe':b.material('shoe',(22,22,24),.72,.02,'shoe',cfg['seed']+30)}; p,parents=skeleton(h,span); names=list(parents); nodes={}; globals={}
    for name in names:
        par=parents[name]; local=p[name] if par is None else p[name]-p[par]; parent=root if par is None else nodes[par]; nodes[name]=b.node(name,parent,t=local.tolist(),extras={'joint':True}); G=np.eye(4,dtype=np.float32);G[:3,3]=p[name];globals[name]=G
    ibm=[np.linalg.inv(globals[name]).astype(np.float32).T.reshape(16) for name in names]; skin=b.skin([nodes[n] for n in names],ibm,nodes['hips']); J,W=weights(v,h,names,p); mi=b.mesh(role+'-makehuman-body',v,n,uv,J,W,groups(v,faces,h,mats)); b.node(role+'-body',root,mi,skin=skin,extras={'skinned':True,'heightMeters':round(h,4),'source':'MakeHuman CC0 base mesh'}); hips,chest,head,rs,re,ls=nodes['hips'],nodes['chest'],nodes['head'],nodes['R_shoulder'],nodes['R_elbow'],nodes['L_shoulder']; hip=p['hips'].tolist(); b.clip('idle_breath',[(hips,'translation',[0,1.5,3],[hip,[hip[0],hip[1]+.006,hip[2]],hip]),(chest,'rotation',[0,1.5,3],[quat(0,0,-.008),quat(.012,0,.008),quat(0,0,-.008)])]); b.clip('listen_acknowledge',[(head,'rotation',[0,.45,.9,1.35],[quat(),quat(-.05,0,0),quat(.025,0,0),quat()])]); b.clip('speak_calm',[(head,'rotation',[0,.5,1,1.5,2],[quat(0,-.025,0),quat(.015,.028,0),quat(-.01,-.018,0),quat(.012,.022,0),quat(0,-.025,0)])]); b.clip('gesture_open',[(rs,'rotation',[0,.6,1.4,2],[quat(),quat(.12,0,-.34),quat(.08,0,-.28),quat()]),(re,'rotation',[0,.6,1.4,2],[quat(),quat(0,0,.20),quat(0,0,.12),quat()]),(ls,'rotation',[0,.6,1.4,2],[quat(),quat(.08,0,.18),quat(.05,0,.14),quat()])]); b.clip('gaze_shift',[(head,'rotation',[0,.7,1.4,2.1],[quat(),quat(0,.13,0),quat(.015,-.10,0),quat()])]); file=('home-human-makehuman-v4.glb' if role=='home' else f'council-{role}-human-makehuman-v4.glb'); path=OUT/file; data=b.write(path,[root]); return {'role':role,'fileName':file,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'heightMeters':round(h,4),'vertices':len(v),'faces':len(faces),'joints':17,'animations':[a['name'] for a in b.anims]}

CFG={'home':{'height':1.82,'width':.98,'depth':.98,'skin':(185,133,106),'shirt':(57,74,73),'seed':11},'guide':{'height':1.84,'width':1,'depth':1,'skin':(184,121,94),'shirt':(42,59,77),'seed':21},'mirror':{'height':1.76,'width':.97,'depth':.98,'skin':(111,72,55),'shirt':(85,93,98),'seed':31},'guardian':{'height':1.92,'width':1.04,'depth':1.02,'skin':(145,95,73),'shirt':(40,58,78),'seed':41},'archivist':{'height':1.73,'width':.96,'depth':.97,'skin':(208,161,131),'shirt':(170,161,146),'seed':51},'builder':{'height':1.88,'width':1.03,'depth':1.01,'skin':(169,120,92),'shirt':(104,89,75),'seed':61},'trickster':{'height':1.80,'width':.96,'depth':.96,'skin':(147,96,74),'shirt':(48,48,51),'seed':71}}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); args=ap.parse_args(); base_v,faces=load_base(args.source); assets=[build(role,cfg,base_v,faces) for role,cfg in CFG.items()]; receipt={'schemaVersion':'4.0.0','packId':'urai-human-makehuman-v4','cameraAspect':'5:4','units':'meters','selectedProduction':False,'source':{'repository':SOURCE_REPO,'commit':SOURCE_COMMIT,'blobSha':SOURCE_BLOB,'path':SOURCE_PATH,'license':'CC0-1.0'},'promotionRequires':['rendered-motion-proof','garment-geometry-pass','hair-and-eye-asset-pass','facial-blendshape-pass','mobile-lod','final-visual-approval'],'modelCount':len(assets),'assets':assets}; RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n'); print(json.dumps(receipt,indent=2))
if __name__=='__main__': main()
