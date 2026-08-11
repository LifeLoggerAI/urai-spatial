from __future__ import annotations
import json, math, struct, hashlib
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure

REPO_ROOT=Path(__file__).resolve().parents[1]
OUT=REPO_ROOT/'urai-tier1'/'public'/'assets'/'urai'/'generated'/'smooth-skinned-humans-v1'
RECEIPT=REPO_ROOT/'operations'/'assets'/'generated-receipts'/'urai-smooth-skinned-humans-v1.json'
OUT.mkdir(parents=True,exist_ok=True)
RECEIPT.parent.mkdir(parents=True,exist_ok=True)
F32=5126; U16=5123; U32=5125; ARRAY=34962; ELEMENT=34963

def align4(n): return (n+3)&~3

def compute_normals(pos, idx):
    n=np.zeros_like(pos,dtype=np.float32)
    tri=pos[idx]
    fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    for j in range(3): np.add.at(n,idx[:,j],fn)
    length=np.linalg.norm(n,axis=1); length[length<1e-8]=1
    return (n/length[:,None]).astype(np.float32)

def continuous_body(stature=1.0,res=(62,124,50)):
    nx,ny,nz=res
    xs=np.linspace(-.47,.47,nx); ys=np.linspace(-.015,1.84,ny); zs=np.linspace(-.25,.25,nz)
    X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij')
    field=np.full(res,100.0,dtype=np.float32)
    def ell(cx,cy,cz,rx,ry,rz):
        nonlocal field
        d=((X-cx)/rx)**2+((Y-cy)/ry)**2+((Z-cz)/rz)**2
        field=np.minimum(field,d.astype(np.float32))
    ell(0,1.675,0,.113,.145,.108)
    ell(0,1.535,0,.075,.105,.075)
    ell(0,1.29,0,.245,.36,.155)
    ell(0,1.01,0,.195,.21,.135)
    ell(0,.89,0,.215,.18,.145)
    for side in (-1,1):
        ell(side*.275,1.29,0,.075,.255,.072)
        ell(side*.31,1.04,.01,.058,.225,.055)
        ell(side*.315,.82,.035,.058,.085,.045)
        ell(side*.09,.66,0,.085,.34,.085)
        ell(side*.09,.32,0,.065,.30,.067)
        ell(side*.09,.075,.065,.095,.07,.175)
    field=gaussian_filter(field,sigma=1.15)
    verts,faces,_,_=measure.marching_cubes(field,level=1.0,spacing=(xs[1]-xs[0],ys[1]-ys[0],zs[1]-zs[0]))
    verts[:,0]+=xs[0]; verts[:,1]+=ys[0]; verts[:,2]+=zs[0]
    verts*=stature
    faces=faces.astype(np.uint32)
    return verts.astype(np.float32),faces,compute_normals(verts.astype(np.float32),faces)

def radial_loft(levels,segments=36):
    verts=[]
    for y,rx,rz,cx,cz in levels:
        for i in range(segments):
            a=2*math.pi*i/segments
            verts.append([cx+math.cos(a)*rx,y,cz+math.sin(a)*rz])
    faces=[]
    for row in range(len(levels)-1):
        for i in range(segments):
            k=(i+1)%segments; a=row*segments+i;b=row*segments+k;c=(row+1)*segments+i;d=(row+1)*segments+k
            faces += [[a,c,b],[b,c,d]]
    bottom=len(verts); verts.append([levels[0][3],levels[0][0],levels[0][4]])
    top=len(verts); verts.append([levels[-1][3],levels[-1][0],levels[-1][4]])
    for i in range(segments):
        k=(i+1)%segments
        faces += [[bottom,k,i],[top,(len(levels)-1)*segments+i,(len(levels)-1)*segments+k]]
    p=np.array(verts,np.float32); f=np.array(faces,np.uint32)
    return p,f,compute_normals(p,f)

def ellipsoid(rx,ry,rz,nu=28,nv=18):
    points=[]
    for row in range(nv+1):
        phi=math.pi*row/nv
        for col in range(nu+1):
            theta=2*math.pi*col/nu
            points.append([rx*math.sin(phi)*math.cos(theta),ry*math.cos(phi),rz*math.sin(phi)*math.sin(theta)])
    faces=[]; stride=nu+1
    for row in range(nv):
        for col in range(nu):
            a=row*stride+col;b=a+1;c=a+stride;d=c+1
            faces += [[a,c,b],[b,c,d]]
    p=np.array(points,np.float32);f=np.array(faces,np.uint32)
    return p,f,compute_normals(p,f)

def cone(radius,height,segments=20):
    points=[[0,0,height/2],[0,0,-height/2]]
    for i in range(segments):
        angle=2*math.pi*i/segments
        points.append([math.cos(angle)*radius,math.sin(angle)*radius,-height/2])
    faces=[]
    for i in range(segments):
        k=(i+1)%segments
        faces += [[0,2+i,2+k],[1,2+k,2+i]]
    p=np.array(points,np.float32);f=np.array(faces,np.uint32)
    return p,f,compute_normals(p,f)

def quat_x(a): return [math.sin(a/2),0,0,math.cos(a/2)]
def quat_y(a): return [0,math.sin(a/2),0,math.cos(a/2)]
def quat_z(a): return [0,0,math.sin(a/2),math.cos(a/2)]
def qmul(a,b):
    ax,ay,az,aw=a; bx,by,bz,bw=b
    return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz]

BONE_NAMES=['root','hips','spine','chest','neck','head','jaw','shoulder_L','elbow_L','wrist_L','shoulder_R','elbow_R','wrist_R','hip_L','knee_L','ankle_L','hip_R','knee_R','ankle_R']
PARENT=[-1,0,1,2,3,4,5,3,7,8,3,10,11,1,13,14,1,16,17]
GLOBAL=np.array([
 [0,0,0],[0,.90,0],[0,1.08,0],[0,1.31,0],[0,1.51,0],[0,1.67,0],[0,1.615,.06],
 [-.25,1.40,0],[-.31,1.15,0],[-.315,.90,.01],[.25,1.40,0],[.31,1.15,0],[.315,.90,.01],
 [-.09,.85,0],[-.09,.48,0],[-.09,.14,.04],[.09,.85,0],[.09,.48,0],[.09,.14,.04]
],dtype=np.float32)

def local_transforms(stature=1.0):
    global_pos=GLOBAL*stature; local=[]
    for i,parent in enumerate(PARENT): local.append(global_pos[i] if parent<0 else global_pos[i]-global_pos[parent])
    return global_pos,np.array(local,np.float32)

def weights_for(vertices,stature=1.0):
    global_pos,_=local_transforms(stature)
    joints=np.zeros((len(vertices),4),np.uint16); weights=np.zeros((len(vertices),4),np.float32)
    for index,point in enumerate(vertices):
        x,y,_=point
        if y>1.48*stature and abs(x)<.22*stature: candidates=[4,5]
        elif x<-.20*stature and y>.72*stature: candidates=[7,8,9,3]
        elif x>.20*stature and y>.72*stature: candidates=[10,11,12,3]
        elif y<.92*stature and x<0: candidates=[13,14,15,1]
        elif y<.92*stature: candidates=[16,17,18,1]
        else: candidates=[1,2,3,4]
        distance=np.array([np.linalg.norm(point-global_pos[joint]) for joint in candidates],np.float32)
        sigma=.23*stature
        weight=np.exp(-(distance*distance)/(2*sigma*sigma))+1e-4
        if 5 in candidates and y>1.58*stature: weight[candidates.index(5)]*=4
        if 9 in candidates and y<1.0*stature: weight[candidates.index(9)]*=2
        if 12 in candidates and y<1.0*stature: weight[candidates.index(12)]*=2
        weight/=weight.sum()
        joints[index,:len(candidates)]=candidates
        weights[index,:len(candidates)]=weight
    return joints,weights

class GLB:
    def __init__(self,name,extras):
        self.name=name;self.parts=[];self.length=0;self.views=[];self.accessors=[];self.materials=[];self.meshes=[];self.nodes=[];self.skins=[];self.animations=[];self.extras=extras
    def add_bytes(self,array,target=None):
        pad=align4(self.length)-self.length
        if pad:self.parts.append(bytes(pad));self.length+=pad
        raw=array.tobytes(order='C');offset=self.length;self.parts.append(raw);self.length+=len(raw)
        view={'buffer':0,'byteOffset':offset,'byteLength':len(raw)}
        if target:view['target']=target
        self.views.append(view);return len(self.views)-1
    def accessor(self,array,component_type,value_type,target=None,minmax=False):
        array=np.ascontiguousarray(array);view=self.add_bytes(array,target)
        accessor={'bufferView':view,'componentType':component_type,'count':len(array),'type':value_type}
        if minmax and value_type=='VEC3': accessor['min']=array.min(0).astype(float).tolist();accessor['max']=array.max(0).astype(float).tolist()
        if minmax and value_type=='SCALAR': accessor['min']=[float(array.min())];accessor['max']=[float(array.max())]
        self.accessors.append(accessor);return len(self.accessors)-1
    def material(self,name,color,roughness=.7,metallic=0):
        h=color.lstrip('#');rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        self.materials.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1],'roughnessFactor':roughness,'metallicFactor':metallic}})
        return len(self.materials)-1
    def mesh(self,name,positions,faces,normals,joints=None,weights=None,material=0):
        attributes={'POSITION':self.accessor(positions.astype('<f4'),F32,'VEC3',ARRAY,True),'NORMAL':self.accessor(normals.astype('<f4'),F32,'VEC3',ARRAY)}
        if joints is not None: attributes['JOINTS_0']=self.accessor(joints.astype('<u2'),U16,'VEC4',ARRAY)
        if weights is not None: attributes['WEIGHTS_0']=self.accessor(weights.astype('<f4'),F32,'VEC4',ARRAY)
        indices=self.accessor(faces.reshape(-1).astype('<u4'),U32,'SCALAR',ELEMENT)
        self.meshes.append({'name':name,'primitives':[{'attributes':attributes,'indices':indices,'material':material}]})
        return len(self.meshes)-1
    def node(self,name,**kwargs):
        node={'name':name};node.update({key:value for key,value in kwargs.items() if value is not None});self.nodes.append(node);return len(self.nodes)-1
    def animation_accessor(self,array,value_type): return self.accessor(np.array(array,dtype='<f4'),F32,value_type,None,value_type=='SCALAR')
    def clip(self,name,tracks):
        samplers=[];channels=[]
        for node,path,times,values in tracks:
            input_accessor=self.animation_accessor(times,'SCALAR');output_accessor=self.animation_accessor(values,'VEC4' if path=='rotation' else 'VEC3')
            samplers.append({'input':input_accessor,'output':output_accessor,'interpolation':'LINEAR'})
            channels.append({'sampler':len(samplers)-1,'target':{'node':node,'path':path}})
        self.animations.append({'name':name,'samplers':samplers,'channels':channels})
    def write(self,path,scene_roots):
        binary=b''.join(self.parts);binary+=bytes(align4(len(binary))-len(binary))
        document={'asset':{'version':'2.0','generator':'URAI Smooth-Skinned Human Forge 1.0','extras':self.extras},'scene':0,'scenes':[{'name':self.name,'nodes':scene_roots}],'nodes':self.nodes,'meshes':self.meshes,'materials':self.materials,'skins':self.skins,'animations':self.animations,'buffers':[{'byteLength':len(binary)}],'bufferViews':self.views,'accessors':self.accessors}
        encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*(align4(len(encoded))-len(encoded));total=12+8+len(encoded)+8+len(binary)
        output=bytearray(total);struct.pack_into('<III',output,0,0x46546c67,2,total);struct.pack_into('<I4s',output,12,len(encoded),b'JSON');output[20:20+len(encoded)]=encoded
        offset=20+len(encoded);struct.pack_into('<I4s',output,offset,len(binary),b'BIN\0');output[offset+8:offset+8+len(binary)]=binary
        path.write_bytes(output);return bytes(output)

def build(role,skin_hex,hair_hex,shirt_hex,stature=1.0):
    glb=GLB('URAI '+role.title()+' Smooth Human',{'packId':'urai-smooth-skinned-humans-v1','cameraAspect':'5:4','units':'meters','riggingType':'glTF-skin-joints-weights','smoothSkinning':True,'selectedProduction':False})
    skin=glb.material(role+'-skin',skin_hex,.56,0);shirt=glb.material(role+'-shirt',shirt_hex,.9,.01);pants=glb.material(role+'-pants','#272b30',.92,.01);hair=glb.material(role+'-hair',hair_hex,.96,0);eye_white=glb.material(role+'-eye-white','#f2f0ea',.3,0);iris=glb.material(role+'-iris','#37433f',.22,0);lip=glb.material(role+'-lip','#7b4842',.66,0);shoe=glb.material(role+'-shoe','#171819',.78,.02)
    global_pos,local=local_transforms(stature)
    joint_nodes=[]
    for index,name in enumerate(BONE_NAMES):
        parent=PARENT[index]
        node=glb.node(role+'_'+name,translation=local[index].astype(float).tolist(),children=[])
        joint_nodes.append(node)
        if parent>=0: glb.nodes[joint_nodes[parent]]['children'].append(node)
    root=joint_nodes[0]
    positions,faces,normals=continuous_body(stature);joints,weights=weights_for(positions,stature)
    body=glb.mesh(role+'-body',positions,faces,normals,joints,weights,skin);body_node=glb.node(role+'-body-node',mesh=body,skin=0)
    shirt_levels=[(.96,.19,.145,0,0),(1.08,.21,.15,0,0),(1.28,.25,.16,0,0),(1.48,.22,.14,0,0)]
    shirt_levels=[(y*stature,rx*stature,rz*stature,cx,cz) for y,rx,rz,cx,cz in shirt_levels]
    shirt_pos,shirt_faces,shirt_normals=radial_loft(shirt_levels);shirt_joints,shirt_weights=weights_for(shirt_pos,stature)
    shirt_mesh=glb.mesh(role+'-shirt-mesh',shirt_pos,shirt_faces,shirt_normals,shirt_joints,shirt_weights,shirt);shirt_node=glb.node(role+'-shirt-node',mesh=shirt_mesh,skin=0)
    trouser_nodes=[]
    for side,sign in [('L',-1),('R',1)]:
        x=sign*.09*stature
        levels=[(.13*stature,.065*stature,.07*stature,x,0),(.47*stature,.07*stature,.075*stature,x,0),(.82*stature,.085*stature,.085*stature,x,0),(.96*stature,.11*stature,.11*stature,x,0)]
        pos,fc,nm=radial_loft(levels,30);jn,wt=weights_for(pos,stature);mesh=glb.mesh(role+'-trouser-'+side,pos,fc,nm,jn,wt,pants);trouser_nodes.append(glb.node(role+'-trouser-node-'+side,mesh=mesh,skin=0))
    head=joint_nodes[5];jaw=joint_nodes[6]
    for side,x in [('L',-.041),('R',.041)]:
        pos,fc,nm=ellipsoid(.019*stature,.010*stature,.007*stature,18,10);mesh=glb.mesh(role+'-eye-'+side,pos,fc,nm,material=eye_white);node=glb.node(role+'-eye-node-'+side,mesh=mesh,translation=[x*stature,.027*stature,.101*stature]);glb.nodes[head]['children'].append(node)
        pos,fc,nm=ellipsoid(.0065*stature,.0065*stature,.0045*stature,16,8);mesh=glb.mesh(role+'-iris-'+side,pos,fc,nm,material=iris);node=glb.node(role+'-iris-node-'+side,mesh=mesh,translation=[x*stature,.027*stature,.109*stature]);glb.nodes[head]['children'].append(node)
    pos,fc,nm=cone(.014*stature,.048*stature,18);mesh=glb.mesh(role+'-nose',pos,fc,nm,material=skin);node=glb.node(role+'-nose-node',mesh=mesh,translation=[0,-.01*stature,.108*stature],rotation=quat_x(math.pi/2));glb.nodes[head]['children'].append(node)
    pos,fc,nm=ellipsoid(.034*stature,.0065*stature,.006*stature,18,8);mesh=glb.mesh(role+'-mouth',pos,fc,nm,material=lip);node=glb.node(role+'-mouth-node',mesh=mesh,translation=[0,-.012*stature,.047*stature]);glb.nodes[jaw]['children'].append(node)
    pos,fc,nm=ellipsoid(.118*stature,.10*stature,.11*stature,32,18);mesh=glb.mesh(role+'-hair',pos,fc,nm,material=hair);node=glb.node(role+'-hair-node',mesh=mesh,translation=[0,.07*stature,-.025*stature]);glb.nodes[head]['children'].append(node)
    for bone,side in [(15,'L'),(18,'R')]:
        pos,fc,nm=ellipsoid(.095*stature,.06*stature,.175*stature,24,14);mesh=glb.mesh(role+'-shoe-'+side,pos,fc,nm,material=shoe);node=glb.node(role+'-shoe-node-'+side,mesh=mesh,translation=[0,-.07*stature,.055*stature]);glb.nodes[joint_nodes[bone]]['children'].append(node)
    inverse=[]
    for position in global_pos:
        matrix=np.eye(4,dtype=np.float32);matrix[:3,3]=-position;inverse.append(matrix.T.reshape(-1))
    inverse=np.array(inverse,dtype='<f4');inverse_accessor=glb.accessor(inverse,F32,'MAT4')
    glb.skins=[{'name':role+'-skin-rig','inverseBindMatrices':inverse_accessor,'skeleton':root,'joints':joint_nodes}]
    scene_roots=[root,body_node,shirt_node,*trouser_nodes]
    glb.clip('Idle',[(joint_nodes[3],'scale',[0,1.5,3],[[1,1,1],[1.006,1.010,1.006],[1,1,1]]),(joint_nodes[5],'rotation',[0,1.5,3],[quat_y(0),quat_y(.018),quat_y(0)])])
    glb.clip('Listen',[(joint_nodes[5],'rotation',[0,.7,1.4,2.1],[quat_y(0),qmul(quat_y(-.075),quat_z(.022)),qmul(quat_y(-.045),quat_z(.032)),quat_y(0)]),(joint_nodes[3],'rotation',[0,1.0,2.1],[quat_x(0),quat_x(-.022),quat_x(0)])])
    glb.clip('Speak',[(joint_nodes[6],'rotation',[0,.18,.36,.54,.72,.9,1.08,1.26],[quat_x(0),quat_x(.06),quat_x(.012),quat_x(.05),quat_x(.01),quat_x(.065),quat_x(.015),quat_x(0)]),(joint_nodes[5],'rotation',[0,.63,1.26],[quat_y(0),quat_y(.02),quat_y(0)])])
    glb.clip('GuideGesture',[(joint_nodes[10],'rotation',[0,.55,1.1,1.65,2.2],[quat_z(0),qmul(quat_z(-.45),quat_x(-.1)),qmul(quat_z(-.72),quat_x(-.16)),qmul(quat_z(-.45),quat_x(-.1)),quat_z(0)]),(joint_nodes[11],'rotation',[0,.55,1.1,1.65,2.2],[quat_z(0),quat_z(-.28),quat_z(-.52),quat_z(-.28),quat_z(0)])])
    return glb.write(OUT/f'council-{role}-human-smooth-v1.glb',scene_roots)

def parse_glb(path):
    data=path.read_bytes();json_length,json_type=struct.unpack_from('<II',data,12);assert json_type==0x4E4F534A
    return json.loads(data[20:20+json_length].decode().rstrip(' \x00'))

def main():
    people=[('guide','#b8795e','#4b3327','#293b50',1.01),('mirror','#704837','#111111','#555c63',.97),('guardian','#925d46','#111111','#293b50',1.05),('archivist','#d0a183','#67615b','#b7ad9d',.96),('builder','#aa765c','#4b3327','#66574a',1.03),('trickster','#925d46','#111111','#303033',.99)]
    receipt={'packId':'urai-smooth-skinned-humans-v1','cameraAspect':'5:4','units':'meters','riggingType':'glTF-skin-joints-weights','smoothSkinning':True,'selectedProduction':False,'promotionRequires':['github-binary-receipt','runtime-useAnimations-proof','multi-device-render-proof','final-face-material-review'],'models':[]}
    for role,skin,hair,shirt,stature in people:
        data=build(role,skin,hair,shirt,stature)
        path=OUT/f'council-{role}-human-smooth-v1.glb';document=parse_glb(path)
        receipt['models'].append({'file':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'nodes':len(document['nodes']),'meshes':len(document['meshes']),'skins':len(document.get('skins',[])),'joints':len(document['skins'][0]['joints']),'animations':[animation['name'] for animation in document.get('animations',[])]})
    RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
