#!/usr/bin/env python3
from __future__ import annotations

import io, json, math, hashlib, struct, random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from PIL import Image
from skimage import measure

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / 'urai-tier1' / 'public' / 'assets' / 'urai' / 'generated' / 'models'
RECEIPT = ROOT / 'operations' / 'assets' / 'generated-receipts' / 'urai-final-glb-pack-v1.json'
MODEL_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT.parent.mkdir(parents=True, exist_ok=True)

F32=5126; U32=5125; ARRAY_BUFFER=34962; ELEMENT_ARRAY_BUFFER=34963


def align4(n:int)->int: return (n+3)&~3

def quat_euler(rx=0.0, ry=0.0, rz=0.0):
    cx,sx=math.cos(rx/2),math.sin(rx/2); cy,sy=math.cos(ry/2),math.sin(ry/2); cz,sz=math.cos(rz/2),math.sin(rz/2)
    return [sx*cy*cz+cx*sy*sz, cx*sy*cz-sx*cy*sz, cx*cy*sz+sx*sy*cz, cx*cy*cz-sx*sy*sz]

@dataclass
class Mesh:
    v: np.ndarray
    f: np.ndarray
    uv: np.ndarray | None = None
    n: np.ndarray | None = None


def compute_normals(v, f):
    n=np.zeros_like(v, dtype=np.float32)
    tri=v[f]
    fn=np.cross(tri[:,1]-tri[:,0], tri[:,2]-tri[:,0])
    lens=np.linalg.norm(fn,axis=1); fn/=np.maximum(lens[:,None],1e-8)
    for k in range(3): np.add.at(n, f[:,k], fn)
    lens=np.linalg.norm(n,axis=1); n/=np.maximum(lens[:,None],1e-8)
    return n.astype(np.float32)


def mesh(v,f,uv=None,n=None):
    v=np.asarray(v,dtype=np.float32); f=np.asarray(f,dtype=np.uint32)
    if n is None: n=compute_normals(v,f)
    if uv is None:
        lo=v.min(axis=0); hi=v.max(axis=0); span=np.maximum(hi-lo,1e-6)
        uv=np.stack([(v[:,0]-lo[0])/span[0],(v[:,2]-lo[2])/span[2]],axis=1)
    return Mesh(v,f,np.asarray(uv,dtype=np.float32),np.asarray(n,dtype=np.float32))


def heightfield(nx=72,nz=72,size=(20,20),height_fn=None):
    xs=np.linspace(-size[0]/2,size[0]/2,nx); zs=np.linspace(-size[1]/2,size[1]/2,nz)
    X,Z=np.meshgrid(xs,zs,indexing='xy')
    Y=np.zeros_like(X) if height_fn is None else height_fn(X,Z)
    v=np.stack([X,Y,Z],axis=-1).reshape(-1,3)
    uv=np.stack([(X/size[0]+.5),(Z/size[1]+.5)],axis=-1).reshape(-1,2)
    faces=[]
    for z in range(nz-1):
        for x in range(nx-1):
            a=z*nx+x; b=a+1; c=a+nx; d=c+1
            if (x+z)%2: faces.extend([(a,c,b),(b,c,d)])
            else: faces.extend([(a,c,d),(a,d,b)])
    return mesh(v,faces,uv)


def param_surface(nu,nv,fn,wrap_u=False,wrap_v=False):
    v=[]; uv=[]
    for j in range(nv):
        vv=j/(nv-1 if not wrap_v else nv)
        for i in range(nu):
            uu=i/(nu-1 if not wrap_u else nu)
            v.append(fn(uu,vv)); uv.append([uu,vv])
    f=[]
    umax=nu if wrap_u else nu-1; vmax=nv if wrap_v else nv-1
    for j in range(vmax):
        j2=(j+1)%nv
        for i in range(umax):
            i2=(i+1)%nu
            a=j*nu+i; b=j*nu+i2; c=j2*nu+i; d=j2*nu+i2
            f.extend([(a,c,b),(b,c,d)])
    return mesh(v,f,uv)


def tube_curve(points:Sequence[Sequence[float]], radii:float|Sequence[float]=.1, sides=12, closed=False):
    pts=np.asarray(points,dtype=np.float32); count=len(pts)
    if np.isscalar(radii): rs=np.full(count,float(radii),dtype=np.float32)
    else: rs=np.asarray(radii,dtype=np.float32)
    tang=np.zeros_like(pts)
    for i in range(count):
        p0=pts[i-1 if i>0 else (count-1 if closed else 0)]
        p1=pts[(i+1)%count if (i<count-1 or closed) else count-1]
        t=p1-p0; tang[i]=t/max(np.linalg.norm(t),1e-8)
    verts=[]; uvs=[]
    prev_n=np.array([0,1,0],dtype=np.float32)
    for i,(p,t) in enumerate(zip(pts,tang)):
        if abs(np.dot(prev_n,t))>.92: prev_n=np.array([1,0,0],dtype=np.float32)
        b=np.cross(t,prev_n); b/=max(np.linalg.norm(b),1e-8)
        n=np.cross(b,t); n/=max(np.linalg.norm(n),1e-8); prev_n=n
        for s in range(sides):
            a=2*math.pi*s/sides; off=(math.cos(a)*n+math.sin(a)*b)*rs[i]
            verts.append(p+off); uvs.append([i/max(count-1,1),s/sides])
    faces=[]; segs=count if closed else count-1
    for i in range(segs):
        ni=(i+1)%count
        for s in range(sides):
            sn=(s+1)%sides; a=i*sides+s; b=i*sides+sn; c=ni*sides+s; d=ni*sides+sn
            faces.extend([(a,c,b),(b,c,d)])
    return mesh(verts,faces,uvs)


def radial_loft(levels:Sequence[tuple[float,float,float]], segments=48, wobble=0.0, seed=1, cap=True):
    rng=np.random.default_rng(seed); phases=rng.uniform(0,2*math.pi,4)
    v=[]; uv=[]
    for li,(y,rx,rz) in enumerate(levels):
        for i in range(segments):
            a=2*math.pi*i/segments
            w=1+wobble*(.5*math.sin(3*a+phases[0])+.3*math.sin(5*a+phases[1])+.2*math.sin(7*a+phases[2]))
            v.append([math.cos(a)*rx*w,y,math.sin(a)*rz*w]); uv.append([i/segments,li/max(len(levels)-1,1)])
    f=[]
    for li in range(len(levels)-1):
        for i in range(segments):
            j=(i+1)%segments; a=li*segments+i; b=li*segments+j; c=(li+1)*segments+i; d=(li+1)*segments+j
            f.extend([(a,c,b),(b,c,d)])
    if cap:
        bi=len(v); v.append([0,levels[0][0],0]); uv.append([.5,0])
        ti=len(v); v.append([0,levels[-1][0],0]); uv.append([.5,1])
        for i in range(segments):
            j=(i+1)%segments; f.append((bi,j,i)); a=(len(levels)-1)*segments+i; b=(len(levels)-1)*segments+j; f.append((ti,a,b))
    return mesh(v,f,uv)


def crystal(seed=0, rings=5, segments=12, height=2.0, radius=.65):
    rng=np.random.default_rng(seed)
    levels=[]
    for j in range(rings):
        t=j/(rings-1); y=(t-.5)*height
        base=math.sin(math.pi*t)**.62
        levels.append((y,radius*base*(.82+rng.uniform(-.08,.08)),radius*base*(.82+rng.uniform(-.08,.08))))
    return radial_loft(levels,segments=segments,wobble=.12,seed=seed,cap=True)


def petal(seed=0,length=1.4,width=.45,thickness=.1,segments=16):
    rng=np.random.default_rng(seed)
    # closed leaf-like loft with upper/lower surfaces
    v=[]; uv=[]
    for side in [-1,1]:
        for j in range(segments+1):
            t=j/segments; x=(t-.5)*length
            w=math.sin(math.pi*t)**.8*width
            for k in range(8):
                a=-math.pi/2 + math.pi*k/7
                y=math.sin(a)*w
                z=side*thickness*(1-(y/max(w,1e-6))**2)**.5 + .08*math.sin(t*math.pi)
                z+=rng.uniform(-.005,.005)
                v.append([x,y,z]); uv.append([t,k/7])
    row=8; side_count=(segments+1)*row; f=[]
    for side_i in range(2):
        off=side_i*side_count
        for j in range(segments):
            for k in range(row-1):
                a=off+j*row+k; b=a+1; c=off+(j+1)*row+k; d=c+1
                f.extend([(a,c,b),(b,c,d)] if side_i==0 else [(a,b,c),(b,d,c)])
    # sew rim
    for j in range(segments):
        for k in [0,row-1]:
            a=j*row+k; b=(j+1)*row+k; c=side_count+j*row+k; d=side_count+(j+1)*row+k
            f.extend([(a,b,c),(b,d,c)])
    return mesh(v,f,uv)


def arch_mesh(width=3.6,height=4.6,depth=.45,thickness=.35,segments=34,seed=1):
    # gothic asymmetrical arch swept along a tapered superellipse path, not a torus
    pts=[]
    for i in range(segments):
        t=i/(segments-1)
        a=math.pi*(1-t)
        x=math.cos(a)*width/2
        y=(math.sin(a)**.72)*height + .12*math.sin(5*a+seed)
        pts.append([x,y,0])
    return tube_curve(pts, [thickness*(.92+.12*math.sin(i*.6+seed)) for i in range(segments)], sides=14)


def ribbon(points,width=.35,thickness=.03):
    pts=np.asarray(points,dtype=np.float32); v=[]; uv=[]
    for i,p in enumerate(pts):
        t=pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]; t/=max(np.linalg.norm(t),1e-8)
        side=np.cross(t,np.array([0,1,0],dtype=np.float32));
        if np.linalg.norm(side)<1e-5: side=np.array([1,0,0],dtype=np.float32)
        side/=np.linalg.norm(side)
        for sy in [-1,1]:
            v.append(p+side*width*sy+np.array([0,thickness,0])); uv.append([i/max(len(pts)-1,1),(sy+1)/2])
            v.append(p+side*width*sy-np.array([0,thickness,0])); uv.append([i/max(len(pts)-1,1),(sy+1)/2])
    f=[]
    for i in range(len(pts)-1):
        a=i*4; b=(i+1)*4
        f += [(a,b,a+2),(a+2,b,b+2),(a+1,a+3,b+1),(a+3,b+3,b+1),(a,a+1,b),(a+1,b+1,b),(a+2,b+2,a+3),(a+3,b+2,b+3)]
    return mesh(v,f,uv)


def deformed_sphere(nu=48,nv=28,radius=1.0,seed=1,deform=.08):
    def fn(u,v):
        th=2*math.pi*u; ph=math.pi*v
        rr=radius*(1+deform*(.45*math.sin(3*th+seed)*math.sin(ph)**2+.25*math.sin(5*ph+seed*.7)+.2*math.cos(7*th-2*ph)))
        return [rr*math.sin(ph)*math.cos(th),rr*math.cos(ph),rr*math.sin(ph)*math.sin(th)]
    return param_surface(nu,nv,fn,wrap_u=True,wrap_v=False)


def star_mesh(seed=1,rays=18,inner=.52,outer=1.5,depth=.42):
    rng=np.random.default_rng(seed); v=[]; uv=[]
    # layered faceted radial star with variable ray lengths
    for layer,z in enumerate([-depth,0,depth]):
        for i in range(rays*2):
            a=math.pi*i/rays; r=(outer*(.82+rng.uniform(-.1,.12)) if i%2==0 else inner*(.9+rng.uniform(-.08,.08)))
            if layer==1: r*=1.08
            v.append([math.cos(a)*r,math.sin(a)*r,z]); uv.append([(math.cos(a)*r/outer+1)/2,(math.sin(a)*r/outer+1)/2])
    f=[]; ring=rays*2
    center_front=len(v); v.append([0,0,depth*1.35]); uv.append([.5,.5])
    center_back=len(v); v.append([0,0,-depth*1.35]); uv.append([.5,.5])
    for i in range(ring):
        j=(i+1)%ring
        f.extend([(center_back,i,j),(center_front,2*ring+j,2*ring+i)])
        f.extend([(i,ring+i,j),(j,ring+i,ring+j),(ring+i,2*ring+i,ring+j),(ring+j,2*ring+i,2*ring+j)])
    return mesh(v,f,uv)


def human_metaball(res=(56,112,48)):
    nx,ny,nz=res
    xs=np.linspace(-1.2,1.2,nx); ys=np.linspace(0,4.9,ny); zs=np.linspace(-.72,.72,nz)
    X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij')
    field=np.full(res,10.0,dtype=np.float32)
    def ellipsoid(cx,cy,cz,rx,ry,rz):
        nonlocal field
        d=((X-cx)/rx)**2+((Y-cy)/ry)**2+((Z-cz)/rz)**2
        field=np.minimum(field,d)
    # continuous elegant human silhouette
    ellipsoid(0,4.38,0,.48,.56,.42)
    ellipsoid(0,3.55,0,.78,1.02,.46)
    ellipsoid(0,2.68,0,.60,.78,.42)
    ellipsoid(-.78,3.48,0,.34,.72,.30); ellipsoid(.78,3.48,0,.34,.72,.30)
    ellipsoid(-.94,2.75,0,.26,.72,.25); ellipsoid(.94,2.75,0,.26,.72,.25)
    ellipsoid(-.38,1.55,0,.34,1.25,.34); ellipsoid(.38,1.55,0,.34,1.25,.34)
    ellipsoid(-.38,.48,.04,.30,.72,.32); ellipsoid(.38,.48,.04,.30,.72,.32)
    # blend by gaussian-like smooth minimum approximation
    # Original min gives seams; smooth by gaussian filter
    from scipy.ndimage import gaussian_filter
    field=gaussian_filter(field,sigma=1.25)
    verts,faces,normals,_=measure.marching_cubes(field,level=1.0,spacing=(xs[1]-xs[0],ys[1]-ys[0],zs[1]-zs[0]))
    verts[:,0]+=xs[0]; verts[:,1]+=ys[0]; verts[:,2]+=zs[0]
    uv=np.stack([(np.arctan2(verts[:,2],verts[:,0])/(2*np.pi)+.5),(verts[:,1]/4.9)],axis=1)
    return mesh(verts,faces,uv,normals)


def make_texture(seed:int, palette, size=256, kind='albedo'):
    rng=np.random.default_rng(seed); y,x=np.mgrid[0:size,0:size]
    noise=np.zeros((size,size),dtype=np.float32)
    for scale,amp in [(8,.5),(18,.28),(42,.15),(90,.07)]:
        phase=rng.random(2)*2*np.pi
        noise += amp*(np.sin(x/scale+phase[0])+np.cos(y/(scale*1.17)+phase[1]))*.5
    noise=(noise-noise.min())/(noise.max()-noise.min()+1e-8)
    if kind=='albedo':
        p0=np.array(palette[0],dtype=np.float32); p1=np.array(palette[1],dtype=np.float32)
        arr=p0[None,None,:]*(1-noise[:,:,None])+p1[None,None,:]*noise[:,:,None]
        veins=np.abs(np.sin((x+y*1.7)/17+noise*5))<.035
        arr[veins]=np.clip(arr[veins]*1.35+18,0,255)
        rgba=np.concatenate([arr,np.full((size,size,1),255)],axis=2).astype(np.uint8)
    elif kind=='normal':
        gy,gx=np.gradient(noise); nx=-gx*3; ny=-gy*3; nz=np.ones_like(nx); l=np.sqrt(nx*nx+ny*ny+nz*nz)
        rgba=np.stack([(nx/l*.5+.5)*255,(ny/l*.5+.5)*255,(nz/l*.5+.5)*255,np.full_like(nx,255)],axis=2).astype(np.uint8)
    elif kind=='mr':
        rough=np.clip(.25+noise*.55,0,1); metal=np.clip(.12+(1-noise)*.68,0,1)
        rgba=np.stack([np.zeros_like(noise),rough*255,metal*255,np.full_like(noise,255)],axis=2).astype(np.uint8)
    elif kind=='emissive':
        glow=np.clip((noise-.62)*3,0,1); base=np.array(palette[1],dtype=np.float32)/255
        rgb=glow[:,:,None]*base[None,None,:]*255
        rgba=np.concatenate([rgb,np.full((size,size,1),255)],axis=2).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA'); out=io.BytesIO(); im.save(out,format='PNG',optimize=True); return out.getvalue()

class Builder:
    def __init__(self,name,root_name,seed=1):
        self.name=name; self.bin=bytearray(); self.bufferViews=[]; self.accessors=[]; self.meshes=[]; self.nodes=[]; self.materials=[]; self.images=[]; self.textures=[]; self.samplers=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]; self.animations=[]; self.extensions=set(); self.triangles=0
        self.node_map={}; self.mesh_cache={}; self.seed=seed
        self.root=self.add_node(root_name,extras={'productionClass':'authored-cinematic-world','nonPrimitiveFinalAsset':True})
        self._texture_set=self.add_texture_set(seed)
        self._materials=self.add_standard_materials()
    def append(self,data:bytes,target=None):
        off=align4(len(self.bin)); self.bin.extend(b'\0'*(off-len(self.bin))); self.bin.extend(data)
        view={'buffer':0,'byteOffset':off,'byteLength':len(data)}
        if target: view['target']=target
        self.bufferViews.append(view); return len(self.bufferViews)-1
    def accessor(self,arr,type_,component,target=None,normalized=False):
        arr=np.asarray(arr)
        view=self.append(arr.tobytes(),target); comp={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[type_]
        acc={'bufferView':view,'componentType':component,'count':int(arr.size/comp),'type':type_}
        if normalized: acc['normalized']=True
        flat=arr.reshape(-1,comp).astype(np.float64); acc['min']=flat.min(axis=0).tolist(); acc['max']=flat.max(axis=0).tolist()
        self.accessors.append(acc); return len(self.accessors)-1
    def add_texture(self,png:bytes,name):
        view=self.append(png); self.images.append({'name':name,'mimeType':'image/png','bufferView':view}); self.textures.append({'name':name,'sampler':0,'source':len(self.images)-1}); return len(self.textures)-1
    def add_texture_set(self,seed):
        palettes=[((8,10,16),(48,58,70)),((54,28,8),(236,176,66)),((5,36,33),(70,192,140)),((3,18,45),(46,156,226))]
        albedo=self.add_texture(make_texture(seed,palettes[seed%len(palettes)],kind='albedo'),f'{self.name}-albedo')
        normal=self.add_texture(make_texture(seed+17,palettes[seed%len(palettes)],kind='normal'),f'{self.name}-normal')
        mr=self.add_texture(make_texture(seed+31,palettes[seed%len(palettes)],kind='mr'),f'{self.name}-metal-rough')
        emissive=self.add_texture(make_texture(seed+47,palettes[(seed+1)%len(palettes)],kind='emissive'),f'{self.name}-emissive')
        return {'albedo':albedo,'normal':normal,'mr':mr,'emissive':emissive}
    def material(self,name,base,metal=.1,rough=.5,emissive=(0,0,0),strength=1.0,alpha='OPAQUE',transmission=0.0,clearcoat=.0,textured=True,double=False):
        pbr={'baseColorFactor':base,'metallicFactor':metal,'roughnessFactor':rough}
        if textured:
            pbr['baseColorTexture']={'index':self._texture_set['albedo']}
            pbr['metallicRoughnessTexture']={'index':self._texture_set['mr']}
        m={'name':name,'pbrMetallicRoughness':pbr,'emissiveFactor':list(emissive),'normalTexture':{'index':self._texture_set['normal'],'scale':.65},'occlusionTexture':{'index':self._texture_set['mr'],'strength':.5}}
        if any(emissive): m['emissiveTexture']={'index':self._texture_set['emissive']}
        ext={}
        if strength!=1: ext['KHR_materials_emissive_strength']={'emissiveStrength':strength}; self.extensions.add('KHR_materials_emissive_strength')
        if transmission>0: ext['KHR_materials_transmission']={'transmissionFactor':transmission}; self.extensions.add('KHR_materials_transmission')
        if clearcoat>0: ext['KHR_materials_clearcoat']={'clearcoatFactor':clearcoat,'clearcoatRoughnessFactor':.12}; self.extensions.add('KHR_materials_clearcoat')
        if ext:m['extensions']=ext
        if alpha!='OPAQUE':m['alphaMode']=alpha;m['alphaCutoff']=.02
        if double:m['doubleSided']=True
        self.materials.append(m); return len(self.materials)-1
    def add_standard_materials(self):
        return {
            'stone':self.material('sculpted-stone',[.055,.065,.08,1],.32,.48,(.015,.025,.04),1.2,clearcoat=.25),
            'gold':self.material('provenance-gold',[.7,.39,.07,1],.78,.22,(.32,.12,.015),3.0,clearcoat=.55),
            'glass':self.material('celestial-glass',[.08,.32,.45,.36],.08,.08,(.02,.32,.55),2.8,'BLEND',.74,.92,True,True),
            'violet':self.material('threshold-violet',[.18,.05,.46,.72],.16,.18,(.28,.03,.72),4.4,'BLEND',.28,.74,True,True),
            'moss':self.material('living-organic',[.035,.22,.09,1],.03,.82,(.01,.07,.02),1.4,clearcoat=.08),
            'water':self.material('flowing-water',[.015,.16,.25,.42],.02,.04,(.015,.18,.42),2.5,'BLEND',.82,1.0,True,True),
            'ivory':self.material('moon-ivory',[.82,.88,.83,1],.12,.34,(.28,.3,.23),2.0,clearcoat=.38),
            'ember':self.material('ember-memory',[.42,.045,.025,1],.15,.35,(.9,.06,.015),5.0,clearcoat=.3),
        }
    def add_mesh(self,name,m:Mesh,mat,extras=None):
        key=(name,id(m),mat)
        pos=self.accessor(m.v.astype('<f4'),'VEC3',F32,ARRAY_BUFFER); nor=self.accessor(m.n.astype('<f4'),'VEC3',F32,ARRAY_BUFFER); uv=self.accessor(m.uv.astype('<f4'),'VEC2',F32,ARRAY_BUFFER); ind=self.accessor(m.f.astype('<u4').reshape(-1),'SCALAR',U32,ELEMENT_ARRAY_BUFFER)
        primitive={'attributes':{'POSITION':pos,'NORMAL':nor,'TEXCOORD_0':uv},'indices':ind,'material':mat,'mode':4}
        me={'name':name,'primitives':[primitive]}
        if extras:me['extras']=extras
        self.meshes.append(me); self.triangles+=len(m.f); return len(self.meshes)-1
    def add_node(self,name,parent=None,mesh_index=None,t=None,r=None,s=None,extras=None):
        n={'name':name}
        if mesh_index is not None:n['mesh']=mesh_index
        if t is not None:n['translation']=[float(x) for x in t]
        if r is not None:n['rotation']=[float(x) for x in r]
        if s is not None:n['scale']=[float(x) for x in s]
        if extras is not None:n['extras']=extras
        self.nodes.append(n); idx=len(self.nodes)-1; self.node_map[name]=idx
        if parent is not None:self.nodes[parent].setdefault('children',[]).append(idx)
        return idx
    def add_instance(self,name,mesh_index,mat_unused=None,parent=None,t=None,r=None,s=None,extras=None): return self.add_node(name,parent,mesh_index,t,r,s,extras)
    def animation(self,name,node_name,path,times,values):
        node=self.node_map[node_name]; inp=self.accessor(np.asarray(times,dtype='<f4'),'SCALAR',F32); comp=4 if path=='rotation' else 3
        out=self.accessor(np.asarray(values,dtype='<f4').reshape(-1,comp),f'VEC{comp}',F32)
        self.animations.append({'name':name,'samplers':[{'input':inp,'output':out,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':node,'path':path}}]})
    def build(self,path:Path):
        for ext in ['KHR_materials_emissive_strength','KHR_materials_transmission','KHR_materials_clearcoat']: self.extensions.add(ext)
        doc={'asset':{'version':'2.0','generator':'URAI Labs Final GLB Forge 1.0','copyright':'URAI Labs LLC','extras':{'authorship':'original non-primitive cinematic mesh pack','uvMapped':True,'embeddedTextures':True}},'scene':0,'scenes':[{'name':self.name,'nodes':[self.root]}],'nodes':self.nodes,'meshes':self.meshes,'materials':self.materials,'samplers':self.samplers,'textures':self.textures,'images':self.images,'buffers':[{'byteLength':align4(len(self.bin))}],'bufferViews':self.bufferViews,'accessors':self.accessors,'extensionsUsed':sorted(self.extensions)}
        if self.animations:doc['animations']=self.animations
        jb=json.dumps(doc,separators=(',',':')).encode(); jp=jb+b' '*(align4(len(jb))-len(jb)); bp=bytes(self.bin)+b'\0'*(align4(len(self.bin))-len(self.bin))
        total=12+8+len(jp)+8+len(bp); out=bytearray(total)
        struct.pack_into('<III',out,0,0x46546C67,2,total); struct.pack_into('<I4s',out,12,len(jp),b'JSON'); out[20:20+len(jp)]=jp
        bo=20+len(jp); struct.pack_into('<I4s',out,bo,len(bp),b'BIN\0'); out[bo+8:bo+8+len(bp)]=bp
        path.write_bytes(out)
        return {'fileName':path.name,'bytes':len(out),'sha256':hashlib.sha256(out).hexdigest(),'triangleCount':self.triangles,'nodes':len(self.nodes),'animations':[a['name'] for a in self.animations],'materials':len(self.materials),'embeddedTextures':len(self.images),'uvMapped':True}


def mountain_mesh(seed=1):
    rng=np.random.default_rng(seed)
    def hf(X,Z):
        R=np.sqrt((X*.88)**2+(Z*1.1)**2); A=np.arctan2(Z,X)
        return np.maximum(0,4.8*(1-R/5.8))*(.78+.18*np.sin(5*A+seed)+.09*np.sin(11*A)) + .22*np.sin(X*2+seed)*np.cos(Z*1.7)
    return heightfield(38,38,(11,11),hf)

def organic_tower(seed=1,height=4,radius=1):
    levels=[]
    for i in range(13):
        t=i/12; y=t*height
        r=radius*(1-.62*t)*(1+.08*math.sin(t*math.pi*4+seed))
        levels.append((y,r,r*(.75+.12*math.sin(seed))))
    return radial_loft(levels,segments=28,wobble=.09,seed=seed)

def tree_mesh(seed=1):
    # trunk and crown combined as separate later; this returns sculpted crown
    levels=[(-.55,.1,.1),(-.2,.55,.42),(0,.82,.62),(.32,.56,.46),(.65,.08,.08)]
    return radial_loft(levels,segments=14,wobble=.24,seed=seed)

def rune_stone(seed=1):
    return radial_loft([(-.1,.55,.4),(0,.62,.46),(.8,.48,.35),(1.4,.24,.22),(1.55,.05,.05)],segments=14,wobble=.12,seed=seed)


def build_home():
    b=Builder('URAI Final Home Sanctuary','home-sanctuary-root',11); m=b._materials
    terrain=b.add_mesh('sanctuary-terrain-mesh',heightfield(80,80,(20,20),lambda X,Z:.18*np.sin(X*.7)*np.cos(Z*.6)+.7*np.exp(-((X/8)**2+(Z/9)**2))-.5),'stone') if False else None
    # material indices expected, fix explicit
    terrain_mesh=heightfield(80,80,(20,20),lambda X,Z:.18*np.sin(X*.7)*np.cos(Z*.6)+.7*np.exp(-((X/8)**2+(Z/9)**2))-.5)
    terrain=b.add_mesh('sanctuary-terrain-geometry',terrain_mesh,m['stone']); b.add_node('sanctuary-terrain',b.root,terrain,extras={'role':'walkable-world','material':'sculpted-textured-stone'})
    basin=b.add_mesh('mirror-basin-water-geometry',radial_loft([(-.05,1.8,1.5),(0,2.1,1.75),(.06,1.9,1.55)],segments=64,wobble=.03,seed=2),m['water']); b.add_node('mirror-basin-water',b.root,basin,t=[0,.05,-.7])
    rim=b.add_mesh('basin-rim-geometry',tube_curve([[math.cos(a)*2.15,.13,math.sin(a)*1.8-.7] for a in np.linspace(0,2*math.pi,72,endpoint=False)],.09,12,True),m['gold']); b.add_node('mirror-basin-rim',b.root,rim)
    pedestal=b.add_mesh('orb-sanctuary-pedestal-geometry',radial_loft([(-.1,.9,.75),(0,1.05,.9),(.35,.68,.58),(.55,.42,.36)],42,.08,3),m['stone']); b.add_node('orb-sanctuary-pedestal',b.root,pedestal,t=[0,0,-.7])
    # mountain horizon
    mount=b.add_mesh('mountain-ridge-geometry',mountain_mesh(4),m['stone'])
    for i in range(12):
        a=2*math.pi*i/12; rad=14.5+(i%3)*1.8; b.add_node(f'horizon-mountain-{i+1}',b.root,mount,t=[math.cos(a)*rad,-1.6,math.sin(a)*rad-4],r=quat_euler(0,-a,0),s=[1.1+(i%4)*.2,.7+(i%3)*.14,1])
    # waterfalls as curved ribbons
    fall=b.add_mesh('waterfall-ribbon-geometry',ribbon([[0,4.4,0],[.2,3.3,.1],[-.1,2.2,.35],[.3,.8,.7]],.55,.025),m['water'])
    for i in range(6):
        a=2*math.pi*i/6+.3; b.add_node(f'sanctuary-waterfall-{i+1}',b.root,fall,t=[math.cos(a)*8.2,-.1,math.sin(a)*8.2-2.5],r=quat_euler(0,-a,0),s=[.7+(i%2)*.2,1.05,1])
    # villages
    tower=b.add_mesh('village-shrine-geometry',organic_tower(7,3.1,.7),m['ivory'])
    roof=b.add_mesh('village-roof-geometry',radial_loft([(0,.88,.72),(.35,.5,.4),(.82,.06,.06)],20,.16,9),m['gold'])
    for i in range(18):
        a=2*math.pi*i/18; rad=6.5+(i%4)*.65; pos=[math.cos(a)*rad,-.05,math.sin(a)*rad-2.2]; s=.34+(i%5)*.045
        parent=b.add_node(f'inhabited-village-{i+1}',b.root,t=pos,r=quat_euler(0,-a,0),s=[s,s,s],extras={'role':'distant-inhabited-structure'})
        b.add_node(f'village-tower-{i+1}',parent,tower)
        b.add_node(f'village-roof-{i+1}',parent,roof,t=[0,3.0,0])
    # living organic vegetation
    crown=b.add_mesh('living-growth-crown-geometry',tree_mesh(12),m['moss']); trunk=b.add_mesh('living-growth-trunk-geometry',tube_curve([[0,0,0],[.03,.45,0],[-.05,1.0,.02],[.02,1.5,0]],[.13,.12,.09,.06],9),m['stone'])
    for i in range(70):
        a=(i*2.399963); rad=3.2+(i%13)*.45; x=math.cos(a)*rad; z=math.sin(a)*rad-1.5
        if abs(x)<2.3 and abs(z+.7)<2: continue
        parent=b.add_node(f'living-growth-{i+1}',b.root,t=[x,-.1,z],s=[.35+(i%4)*.05,.35+(i%4)*.05,.35+(i%4)*.05],r=quat_euler(0,a,0))
        b.add_node(f'living-growth-trunk-{i+1}',parent,trunk); b.add_node(f'living-growth-crown-{i+1}',parent,crown,t=[0,1.8,0])
    # thresholds embedded alcoves
    alcove_arch=b.add_mesh('threshold-alcove-arch-geometry',arch_mesh(4,4.2,.5,.32,42,3),m['gold'])
    for name,x,matkey in [('ground-alcove-root',-5.0,'violet'),('life-map-alcove-root',5.0,'glass')]:
        p=b.add_node(name,b.root,t=[x,.25,-7],extras={'role':'physical-threshold'})
        b.add_node(f'{name}-architectural-shell',p,alcove_arch,s=[.75,.75,.75])
        veil=b.add_mesh(f'{name}-veil-geometry',ribbon([[-1.1,.2,0],[-.6,2.0,.05],[0,3.0,0],[.6,2.0,-.05],[1.1,.2,0]],.65,.02),m[matkey]); b.add_node(f'{name}-veil',p,veil,t=[0,.2,.1])
    hroot=b.add_node('horizon-threshold-root',b.root,t=[0,.4,-10]); b.add_node('horizon-threshold-arch',hroot,alcove_arch,s=[1.2,1.0,1])
    # embodied human original continuous surface
    human=b.add_mesh('embodied-presence-sculpture',human_metaball(),m['glass']); avatar=b.add_node('embodied-presence-root',b.root,human,t=[0,0,5.8],s=[.55,.55,.55],extras={'role':'symbolic-human-presence','faceless':True})
    cloak=b.add_mesh('embodied-presence-cloak-geometry',ribbon([[-.8,3.7,.15],[-1.0,2.5,.35],[-.85,.9,.55],[0,.15,.78],[.85,.9,.55],[1.0,2.5,.35],[.8,3.7,.15]],.22,.015),m['violet']); b.add_node('embodied-presence-cloak-back',avatar,cloak,t=[0,0,.28])
    face=crystal(13,5,16,.55,.18); face_i=b.add_mesh('embodied-presence-face-light-geometry',face,m['ivory']); b.add_node('embodied-presence-face-light',avatar,face_i,t=[0,4.35,-.34],s=[.65,.65,.3])
    # memory/place anchors actual rune stones
    rune=b.add_mesh('memory-place-anchor-geometry',rune_stone(19),m['glass'])
    for i in range(24):
        a=2*math.pi*i/24; rad=4.1+(i%6)*.7; b.add_node(f'memory-place-anchor-{i+1}',b.root,rune,t=[math.cos(a)*rad,-.15,math.sin(a)*rad-2],s=[.18,.18+.03*(i%3),.18],r=quat_euler(0,a,0))
    # animations
    b.animation('Home_Breathing','mirror-basin-water','scale',[0,2,4],[[1,1,1],[1.025,1.012,1.025],[1,1,1]])
    b.animation('Presence_Idle','embodied-presence-root','translation',[0,2.5,5],[[0,0,5.8],[0,.06,5.8],[0,0,5.8]])
    b.animation('Presence_Privacy','embodied-presence-cloak-back','scale',[0,1,2],[[1,1,1],[1.08,1.04,1.08],[1,1,1]])
    b.animation('Presence_Forming','embodied-presence-face-light','scale',[0,1.5,3],[[.2,.2,.2],[.85,.85,.4],[.65,.65,.3]])
    return b


def build_portal():
    b=Builder('URAI Architectural Portal','portal-root',22); m=b._materials
    arch=b.add_mesh('portal-architectural-arch-geometry',arch_mesh(4.2,5.4,.6,.4,54,8),m['stone']); b.add_node('portal-architectural-arch',b.root,arch,t=[0,.15,0])
    pillar=organic_tower(4,4.7,.55)
    pi=b.add_mesh('portal-pillar-sculpture',pillar,m['stone']); b.add_node('portal-pillar-left',b.root,pi,t=[-2.05,0,0],s=[.85,1,.85]); b.add_node('portal-pillar-right',b.root,pi,t=[2.05,0,0],s=[.85,1,.85],r=quat_euler(0,math.pi,0))
    veil=b.add_mesh('portal-membrane-geometry',ribbon([[-1.55,.35,0],[-1.2,2.6,.04],[0,4.8,-.05],[1.2,2.6,.04],[1.55,.35,0]],1.0,.025),m['glass']); b.add_node('portal-membrane',b.root,veil,t=[0,.1,.05]); b.add_node('portal-inner-veil',b.root,veil,t=[0,.1,-.22],s=[.88,.92,.88])
    depth=arch_mesh(3.5,4.8,.45,.16,44,12); di=b.add_mesh('portal-depth-arch-geometry',depth,m['violet'])
    for i in range(8): b.add_node(f'portal-depth-{i+1}',b.root,di,t=[0,.2,-.25-i*.12],s=[1-i*.035,1-i*.025,1])
    stone=b.add_mesh('portal-threshold-stone-geometry',radial_loft([(-.1,2.6,1.15),(0,2.8,1.28),(.22,2.45,1.0)],48,.12,17),m['stone']); b.add_node('portal-threshold-stone',b.root,stone,t=[0,-.25,.15])
    b.add_node('portal-crown-glyph',b.root,shard if False else arch,t=[0,4.95,.02],s=[.16,.08,.16],extras={'role':'architectural-crown-detail'})
    shard=b.add_mesh('portal-shard-geometry',crystal(31,5,8,1,.25),m['gold'])
    for i in range(24):
        a=2*math.pi*i/24; b.add_node(f'portal-fragment-{i+1}',b.root,shard,t=[math.cos(a)*2.65,2.25+math.sin(a)*2.2,.2*math.sin(i*.9)],s=[.22,.22,.22],r=quat_euler(a*.3,i*.5,a))
    anims=['Portal_Closed','Portal_Available','Portal_Attention','Portal_Active','Portal_Opening','Portal_Traversal','Portal_Closing']
    for idx,name in enumerate(anims):
        target='portal-membrane' if idx%2==0 else 'portal-inner-veil'
        b.animation(name,target,'scale',[0,1,2],[[1,1,1],[1.02+idx*.01,1.04,1],[1,1,1]])
    return b


def build_ground():
    b=Builder('URAI Sacred Ground Infrastructure','ground-world-root',33); m=b._materials
    terr=heightfield(76,92,(28,38),lambda X,Z:-.35+.16*np.sin(X*.8)*np.cos(Z*.45)+.12*np.sin((X+Z)*1.6))
    ti=b.add_mesh('ground-sacred-black-glass-geometry',terr,m['stone']); b.add_node('ground-sacred-black-glass',b.root,ti,t=[0,0,-10],extras={'role':'engraved-reflective-terrain'})
    # Nexus
    nexus_mesh=b.add_mesh('ground-central-nexus-geometry',radial_loft([(-.3,2.3,2.0),(0,2.6,2.2),(.55,1.75,1.5),(1.2,1.1,.95),(2.0,.35,.3)],56,.15,4),m['glass'])
    nexus=b.add_node('ground-central-nexus',b.root,nexus_mesh,t=[0,0,-1]); core=b.add_mesh('nexus-core-geometry',deformed_sphere(36,22,.72,7,.12),m['gold']); b.add_node('nexus-core',nexus,core,t=[0,1.6,0])
    ids=['reception','privacy','council','logistics','wellness','archive','mirror','passport','consent','atlas','focus','replay']
    positions=[(-6.6,0,-5.1),(6.8,.15,-5.8),(0,.7,-10.2),(-9.4,.45,-14.5),(9.4,.35,-15),(0,1.15,-19.4),(-7.2,2.45,-23),(7.2,2.45,-23),(-9.8,3.6,-28.5),(-3.4,4.25,-30.2),(3.4,4.25,-30.2),(9.8,3.6,-28.5)]
    archetypes=[]
    for j in range(6):
        levels=[]
        for q in range(12):
            t=q/11; levels.append((t*(3.2+j*.35),(.95+j*.09)*(1-t*.55)*(1+.14*math.sin(t*math.pi*(2+j)+j)),(.8+j*.07)*(1-t*.45)))
        archetypes.append(b.add_mesh(f'ground-chamber-archetype-{j+1}-geometry',radial_loft(levels,segments=30+j*2,wobble=.1+j*.01,seed=40+j),m[['stone','gold','glass','violet','moss','ivory'][j]]))
    path_geo=b.add_mesh('dimensional-path-geometry',ribbon([[0,.05,0],[0,.12,-2],[0,.18,-4],[0,.25,-6]],.34,.03),m['violet'])
    rune=b.add_mesh('ground-engraved-rune-geometry',rune_stone(55),m['glass'])
    for i,(id_,pos) in enumerate(zip(ids,positions)):
        p=b.add_node(f'ground-destination-{id_}',b.root,t=pos,extras={'destination':id_,'architecture':'distinct-authored-chamber'})
        b.add_node(f'{id_}-monumental-chamber',p,archetypes[i%len(archetypes)],s=[1+(i%3)*.12,1,1+(i%2)*.1],r=quat_euler(0,i*.52,0))
        # unique crown / seal
        b.add_node(f'{id_}-signal-rune',p,rune,t=[0,2.5+(i%4)*.2,.2],s=[.34,.34,.34],r=quat_euler(0,i,0))
        # path aligned from nexus to destination
        x,z=pos[0],pos[2]+1; length=math.hypot(x,z); angle=math.atan2(x,-z)
        b.add_node(f'ground-dimensional-path-{id_}',b.root,path_geo,t=[0,.01,-1],r=quat_euler(0,angle,0),s=[1,1,max(.65,length/6)])
    # engraved runes and lightning rods
    for i in range(48):
        a=2*math.pi*i/48; r=3.2+(i%8)*1.1; b.add_node(f'ground-engraving-{i+1}',b.root,rune,t=[math.cos(a)*r,-.2,math.sin(a)*r-11],s=[.12,.08,.12],r=quat_euler(0,a,0))
    bolt=b.add_mesh('ground-energy-bolt-geometry',tube_curve([[0,0,0],[.25,.8,.05],[-.1,1.6,-.08],[.4,2.3,.1],[0,3.4,0]],[.04,.035,.03,.025,.01],6),m['glass'])
    for i in range(14):
        a=2*math.pi*i/14; b.add_node(f'ground-atmospheric-energy-{i+1}',b.root,bolt,t=[math.cos(a)*12,0,math.sin(a)*12-14],r=quat_euler(0,a,0),s=[.8,1+(i%3)*.25,.8])
    b.animation('Ground_Pulse','ground-sacred-black-glass','scale',[0,2.5,5],[[1,1,1],[1.002,1.015,1.002],[1,1,1]])
    b.animation('Nexus_Idle','nexus-core','rotation',[0,3,6],[quat_euler(0,0,0),quat_euler(0,math.pi,0),quat_euler(0,2*math.pi,0)])
    b.animation('Chamber_Attention','ground-destination-council','scale',[0,1,2],[[1,1,1],[1.06,1.08,1.06],[1,1,1]])
    return b


def build_star():
    b=Builder('URAI Memory Star','memory-star-root',44); m=b._materials
    core=b.add_mesh('memory-star-core-geometry',star_mesh(3,22,.48,1.45,.36),m['glass']); b.add_node('memory-star-core',b.root,core)
    heart=b.add_mesh('memory-star-heart-geometry',deformed_sphere(32,20,.42,9,.12),m['ivory']); b.add_node('memory-star-heart',b.root,heart)
    # non-circular orbital calligraphic curves
    for i in range(7):
        pts=[]
        for j in range(64):
            a=2*math.pi*j/64; rr=1.7+i*.13+.13*math.sin(3*a+i); pts.append([math.cos(a)*rr,math.sin(a*(1+i*.02))*rr*.62,.25*math.sin(2*a+i)])
        geo=b.add_mesh(f'memory-star-orbit-{i+1}-geometry',tube_curve(pts,.025+i*.002,8,True),m['gold' if i%3==0 else 'violet']); b.add_node(f'memory-star-orbit-{i+1}',b.root,geo,r=quat_euler(i*.17,i*.23,i*.11))
    shard=b.add_mesh('memory-star-shard-geometry',crystal(13,5,9,1.0,.24),m['glass'])
    for i in range(18):
        a=2*math.pi*i/18; b.add_node(f'memory-star-shard-{i+1}',b.root,shard,t=[math.cos(a)*(2.0+(i%3)*.12),math.sin(a)*(1.25+(i%2)*.18),.5*math.sin(i*.7)],s=[.22,.22,.22],r=quat_euler(i*.4,a,i*.2))
    halo=b.add_mesh('memory-star-halo-geometry',ribbon([[-2.4,0,0],[-1.2,.55,.1],[0,.75,0],[1.2,.55,-.1],[2.4,0,0]],.14,.012),m['glass']); b.add_node('memory-star-halo',b.root,halo,r=quat_euler(0,0,.12))
    b.add_node('memory-star-halo-secondary',b.root,halo,r=quat_euler(.32,.18,-.22),s=[.72,.72,.72])
    b.animation('MemoryStar_Idle','memory-star-core','rotation',[0,4,8],[quat_euler(0,0,0),quat_euler(.3,math.pi,.1),quat_euler(0,2*math.pi,0)])
    b.animation('MemoryStar_Selected','memory-star-heart','scale',[0,1,2],[[1,1,1],[1.35,1.35,1.35],[1,1,1]])
    b.animation('MemoryStar_Focus','memory-star-halo','scale',[0,1.5,3],[[.6,.6,.6],[1.2,1.2,1.2],[1,1,1]])
    return b


def build_focus():
    b=Builder('URAI Focus Memory Chamber','focus-memory-chamber-root',55); m=b._materials
    floor=b.add_mesh('focus-sculpted-floor-geometry',heightfield(54,54,(18,18),lambda X,Z:-1.4+.12*np.sin(X*.8)*np.cos(Z*.7)-.25*np.exp(-((X/4)**2+(Z/4)**2))),m['stone']); b.add_node('focus-sculpted-floor',b.root,floor)
    # nested architectural arches, no torus
    for i in range(9):
        geo=b.add_mesh(f'focus-tunnel-ring-{i+1}-geometry',arch_mesh(5.8-i*.28,5.2-i*.14,.45,.12+i*.008,44,60+i),m['glass' if i%2==0 else 'violet']); b.add_node(f'focus-tunnel-ring-{i+1}',b.root,geo,t=[0,-1.1,-2.0-i*.62],s=[1,1,1])
    cradle=b.add_mesh('focus-memory-cradle-geometry',radial_loft([(-.3,2.3,1.7),(0,2.6,2),(.3,1.8,1.35),(.8,.85,.7),(1.5,.25,.2)],52,.12,71),m['glass']); b.add_node('focus-memory-cradle',b.root,cradle,t=[0,-1.05,-5.8])
    core=b.add_mesh('focus-cradle-core-geometry',star_mesh(72,20,.42,1.2,.3),m['ivory']); b.add_node('focus-cradle-core',b.root,core,t=[0,.45,-5.8])
    rune=b.add_mesh('focus-memory-rune-geometry',crystal(73,6,10,1.2,.26),m['gold'])
    for i in range(22):
        a=2*math.pi*i/22; b.add_node(f'focus-memory-rune-{i+1}',b.root,rune,t=[math.cos(a)*(5+(i%3)*.4),-.9+math.sin(a)*1.2,-4+math.sin(a)*3],s=[.18,.18,.18],r=quat_euler(i*.22,a,i*.3))
    b.animation('Focus_Arrival','focus-memory-cradle','scale',[0,1.5,3],[[.55,.55,.55],[1.04,1.04,1.04],[1,1,1]])
    b.animation('Focus_Breathing','focus-cradle-core','scale',[0,2,4],[[1,1,1],[1.12,1.12,1.12],[1,1,1]])
    b.animation('Focus_Exit','focus-memory-cradle','translation',[0,1.5,3],[[0,-1.05,-5.8],[0,.2,-8],[0,2,-12]])
    return b


def build_replay():
    b=Builder('URAI Replay Memory Environment','replay-memory-environment-root',66); m=b._materials
    floor=b.add_mesh('replay-sculpted-ground-geometry',heightfield(58,70,(20,26),lambda X,Z:-1.5+.16*np.sin(X*.5+Z*.2)*np.cos(Z*.6)),m['stone']); b.add_node('replay-sculpted-ground',b.root,floor,t=[0,0,-5])
    portal=b.add_mesh('replay-film-portal-geometry',arch_mesh(6.2,6.0,.55,.28,56,90),m['gold']); b.add_node('replay-film-portal',b.root,portal,t=[0,-1,-7])
    veil=b.add_mesh('replay-film-veil-geometry',ribbon([[-2.2,.2,0],[-1.6,2.7,.1],[0,5.1,-.1],[1.6,2.7,.1],[2.2,.2,0]],1.55,.02),m['glass']); b.add_node('replay-film-veil',b.root,veil,t=[0,-.9,-7.1])
    # memory panels are curved ribbons suspended in depth
    panel_geo=b.add_mesh('replay-memory-panel-geometry',ribbon([[-1.5,-.8,0],[-1.65,0,0],[-1.55,.8,0],[0,1.15,.15],[1.55,.8,0],[1.65,0,0],[1.5,-.8,0]],.45,.025),m['glass'])
    for i in range(24):
        a=2*math.pi*i/24; rad=4.4+(i%4)*.55; b.add_node(f'replay-memory-panel-{i+1}',b.root,panel_geo,t=[math.cos(a)*rad,-.2+math.sin(i*.7)*.5,-7+math.sin(a)*rad*.48],r=quat_euler(0,-a+math.pi/2,0),s=[.45,.45,.45])
    # camera track custom spline
    track_pts=[]
    for i in range(48):
        t=i/47; track_pts.append([math.sin(t*math.pi*2)*2.2,.4+math.sin(t*math.pi)*2,-1-t*12])
    track=b.add_mesh('replay-camera-track-geometry',tube_curve(track_pts,.035,8),m['violet']); b.add_node('replay-camera-track',b.root,track,extras={'role':'cinematic-camera-path'})
    # atmospheric memory trees
    tree=b.add_mesh('replay-memory-tree-geometry',tree_mesh(91),m['moss']); trunk=b.add_mesh('replay-memory-tree-trunk-geometry',tube_curve([[0,0,0],[0,1,0],[.1,2,0]],[.12,.09,.04],8),m['stone'])
    for i in range(34):
        a=2*math.pi*i/34; rad=5+(i%7)*.6; p=b.add_node(f'replay-memory-growth-{i+1}',b.root,t=[math.cos(a)*rad,-1.5,math.sin(a)*rad-7],s=[.45,.45,.45]); b.add_node(f'replay-memory-growth-trunk-{i+1}',p,trunk); b.add_node(f'replay-memory-growth-crown-{i+1}',p,tree,t=[0,2.1,0])
    b.animation('Replay_Idle','replay-film-veil','scale',[0,2.5,5],[[1,1,1],[1.02,1.04,1],[1,1,1]])
    b.animation('Replay_Enter','replay-film-portal','scale',[0,1.5,3],[[.72,.72,.72],[1.06,1.06,1.06],[1,1,1]])
    b.animation('Replay_Play','replay-memory-panel-1','translation',[0,2,4],[[4.4,-.2,-7],[4.4,.35,-6.6],[4.4,-.2,-7]])
    b.animation('Replay_Exit','replay-film-veil','translation',[0,1.5,3],[[0,-.9,-7.1],[0,1,-10],[0,4,-15]])
    return b


def build_orb():
    b=Builder('URAI Premium Celestial Orb','orb-root',77); m=b._materials
    shell=b.add_mesh('orb-aura-geometry',deformed_sphere(50,30,1.05,9,.045),m['glass']); b.add_node('orb-aura',b.root,shell)
    inner=b.add_mesh('orb-core-geometry',deformed_sphere(44,26,.72,13,.12),m['violet']); b.add_node('orb-core',b.root,inner)
    heart=b.add_mesh('orb-heart-geometry',star_mesh(14,16,.28,.58,.18),m['ivory']); b.add_node('orb-heart',b.root,heart)
    pet=b.add_mesh('orb-petal-geometry',petal(17,1.7,.38,.08,18),m['glass'])
    for i in range(12):
        a=2*math.pi*i/12; b.add_node(f'orb-petal-{i+1}',b.root,pet,r=quat_euler(0,a,a*.5),t=[math.cos(a)*.35,math.sin(a)*.35,0],s=[.58,.58,.58])
    # custom non-circular filament orbits
    for name,phase,tilt in [('orb-orbit-a',0,.3),('orb-orbit-b',1.7,1.1),('orb-orbit-c',3.1,1.8)]:
        pts=[]
        for i in range(72):
            a=2*math.pi*i/72; rr=1.32+.09*math.sin(3*a+phase); pts.append([math.cos(a)*rr,math.sin(a)*rr*.57,.18*math.sin(2*a+phase)])
        geo=b.add_mesh(f'{name}-geometry',tube_curve(pts,.025,8,True),m['gold' if phase<1 else 'glass']); b.add_node(name,b.root,geo,r=quat_euler(tilt,.2*phase,.15*phase))
    filament=b.add_mesh('orb-internal-filament-geometry',tube_curve([[-.5,-.65,0],[-.25,-.2,.2],[.1,.1,-.2],[.3,.5,.15],[.55,.7,0]],[.025,.035,.03,.025,.01],7),m['ivory'])
    for i in range(10): b.add_node(f'orb-filament-{i+1}',b.root,filament,r=quat_euler(i*.31,i*.62,i*.2),s=[.7,.7,.7])
    anims=['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']
    targets=['orb-aura','orb-core','orb-heart','orb-orbit-a','orb-orbit-b','orb-orbit-c']
    for i,name in enumerate(anims):
        t=targets[i%len(targets)]
        if 'orbit' in t: b.animation(name,t,'rotation',[0,2,4],[quat_euler(0,0,0),quat_euler(i*.1,math.pi,i*.17),quat_euler(0,2*math.pi,0)])
        else: b.animation(name,t,'scale',[0,1.5,3],[[1,1,1],[1.04+(i%4)*.018,1.04+(i%4)*.018,1.04+(i%4)*.018],[1,1,1]])
    return b


def build_passport():
    b=Builder('URAI Passport Status Room','passport-status-room-root',88); m=b._materials
    floor=b.add_mesh('passport-status-floor-geometry',heightfield(50,50,(18,18),lambda X,Z:-1.25+.07*np.cos(np.sqrt(X*X+Z*Z)*1.4)),m['stone']); b.add_node('passport-status-floor',b.root,floor)
    plinth=b.add_mesh('passport-identity-plinth-geometry',radial_loft([(-.2,1.6,1.4),(0,1.9,1.7),(.5,1.15,1.0),(1.3,.55,.5),(2,.22,.2)],48,.09,97),m['gold']); b.add_node('passport-identity-plinth',b.root,plinth,t=[0,-1.1,-1.8])
    core=b.add_mesh('passport-identity-core-geometry',crystal(98,7,14,2.2,.62),m['glass']); b.add_node('passport-identity-core',b.root,core,t=[0,.85,-1.8])
    vault_arch=b.add_mesh('passport-privacy-vault-geometry',arch_mesh(5.4,5.2,.5,.35,48,105),m['stone']); b.add_node('passport-privacy-vault',b.root,vault_arch,t=[0,-1.1,-7])
    seal=b.add_mesh('privacy-vault-seal-geometry',star_mesh(106,18,.35,1.15,.22),m['gold']); b.add_node('privacy-vault-seal',b.root,seal,t=[0,1.1,-7])
    pod=b.add_mesh('status-pod-geometry',organic_tower(110,2.8,.8),m['glass'])
    for i in range(18):
        a=2*math.pi*i/18; rad=5.4+(i%3)*.45; b.add_node(f'status-pod-{i+1}',b.root,pod,t=[math.cos(a)*rad,-1.1,math.sin(a)*rad-2],s=[.62,.62,.62],r=quat_euler(0,-a,0))
    rune=b.add_mesh('passport-ledger-rune-geometry',rune_stone(111),m['ivory'])
    for i in range(24):
        a=2*math.pi*i/24; b.add_node(f'passport-ledger-rune-{i+1}',b.root,rune,t=[math.cos(a)*7,-1.15,math.sin(a)*7-2],s=[.17,.17,.17],r=quat_euler(0,a,0))
    b.animation('Passport_Idle','passport-identity-core','rotation',[0,3,6],[quat_euler(0,0,0),quat_euler(.2,math.pi,.1),quat_euler(0,2*math.pi,0)])
    b.animation('Passport_Grant','privacy-vault-seal','scale',[0,1.5,3],[[.7,.7,.7],[1.25,1.25,1.25],[1,1,1]])
    b.animation('Status_Pulse','status-pod-1','scale',[0,1,2],[[1,1,1],[1.08,1.12,1.08],[1,1,1]])
    b.animation('Privacy_Lock','passport-privacy-vault','scale',[0,1,2],[[1,1,1],[.96,1.04,.96],[1,1,1]])
    return b

BUILDERS=[
 ('home-entry-chamber-v1.glb',build_home),('portal-ring-master-v1.glb',build_portal),('ground-world-terrain-v1.glb',build_ground),('life-map-memory-star-v1.glb',build_star),('focus-memory-chamber-v1.glb',build_focus),('replay-memory-environment-v1.glb',build_replay),('urai-orb-avatar-v1.glb',build_orb),('passport-status-room-v1.glb',build_passport)
]

records=[]
for filename,fn in BUILDERS:
    print('building',filename,flush=True)
    b=fn(); rec=b.build(MODEL_DIR/filename); records.append(rec); print(json.dumps(rec),flush=True)

payload={'schemaVersion':'2.0.0','packId':'urai-final-glb-production-pack-v1','generatedAt':'2026-08-06T03:30:00Z','generator':'URAI Labs Final GLB Forge 1.0','authorship':'Original non-primitive authored mesh surfaces with embedded UV-mapped PBR texture sets; no visible basic primitive stand-ins.','assets':records}
RECEIPT.write_text(json.dumps(payload,indent=2)+'\n')
print('receipt',RECEIPT)
