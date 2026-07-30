#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageStat

ROOT=Path(__file__).resolve().parents[1]/'urai-tier1'
REGISTRY=ROOT/'src/spatial/assets/uraiV2Assets.ts'
PUBLIC=ROOT/'public/assets/urai/v2'
OUT=ROOT/'artifacts/v2-certification'
GROUPS={'helperSpecs':'helpers','objectSpecs':'objects','starSpecs':'stars','focusSpecs':'focus','replaySpecs':'replay','mirrorSpecs':'mirror','passportSpecs':'passport','onboardingSpecs':'onboarding','accessibilitySpecs':'accessibility'}
ALPHA_GROUPS={'helpers','objects','stars','mirror'}

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def phash(image:Image.Image)->str:
    g=image.convert('L').resize((8,8),Image.Resampling.LANCZOS)
    vals=list(g.getdata()); avg=sum(vals)/len(vals)
    return ''.join('1' if v>=avg else '0' for v in vals)

def hamming(a:str,b:str)->int: return sum(x!=y for x,y in zip(a,b))

def main()->int:
    OUT.mkdir(parents=True,exist_ok=True)
    source=REGISTRY.read_text(encoding='utf-8')
    expected=[]
    for var,folder in GROUPS.items():
        m=re.search(rf'const {var} = \[([\s\S]*?)\] as const',source)
        if not m: raise SystemExit(f'missing registry group {var}')
        for slug in re.findall(r"^\s*\['([^']+)'",m.group(1),re.M): expected.append((folder,slug))
    if len(expected)!=80: raise SystemExit(f'expected 80 registry assets, found {len(expected)}')
    records=[]; hashes={}; perceptual={}; thumbs=[]
    for folder,slug in expected:
        rel=f'{folder}/{slug}.webp'; path=PUBLIC/rel
        rec={'name':f'v2_{slug.replace("-","_")}','family':folder,'canonicalPath':f'assets/urai/v2/{rel}','exists':path.is_file(),'sourceIdentity':'repository-existing','provider':'unknown','costUsd':None,'rightsStatus':'incomplete','provenanceStatus':'incomplete','runtimeReferenced':f"{folder}/{slug}.webp" in source}
        if path.is_file():
            try:
                with Image.open(path) as im:
                    im.load(); rgba=im.convert('RGBA'); stat=ImageStat.Stat(rgba.convert('L'))
                    alpha=rgba.getchannel('A'); amin,amax=alpha.getextrema(); alpha_required=folder in ALPHA_GROUPS
                    alpha_ok=(amin<255) if alpha_required else True
                    near_empty=(stat.mean[0]<2 and stat.stddev[0]<2) or path.stat().st_size<256
                    rec.update({'readable':True,'format':im.format,'width':im.width,'height':im.height,'mode':im.mode,'bytes':path.stat().st_size,'sha256':sha256(path),'alphaRequired':alpha_required,'alphaMin':amin,'alphaMax':amax,'alphaValid':alpha_ok,'nearEmpty':near_empty,'technicalStatus':'passed' if im.format=='WEBP' and im.width>0 and im.height>0 and alpha_ok and not near_empty else 'noncompliant'})
                    hashes[rel]=rec['sha256']; perceptual[rel]=phash(rgba)
                    bg=Image.new('RGBA',rgba.size,(18,22,32,255)); bg.alpha_composite(rgba); bg.thumbnail((220,180),Image.Resampling.LANCZOS)
                    card=Image.new('RGB',(240,220),(8,10,16)); card.paste(bg.convert('RGB'),((240-bg.width)//2,10)); ImageDraw.Draw(card).text((8,194),slug[:34],fill='white',font=ImageFont.load_default()); thumbs.append((folder,card))
            except Exception as e: rec.update({'readable':False,'technicalStatus':'noncompliant','error':str(e)})
        else: rec.update({'readable':False,'technicalStatus':'missing'})
        records.append(rec)
    near=[]
    keys=sorted(perceptual)
    for i,a in enumerate(keys):
        for b in keys[i+1:]:
            d=hamming(perceptual[a],perceptual[b])
            if d<=3: near.append({'a':a,'b':b,'distance':d})
    for rec in records:
        if rec.get('technicalStatus')=='passed': rec['classification']='provenance-incomplete'
        elif rec.get('technicalStatus')=='missing': rec['classification']='technically-noncompliant'
        else: rec['classification']='technically-noncompliant'
    summary={'schemaVersion':'1.0.0','version':'v2','expected':80,'present':sum(r['exists'] for r in records),'technicallyPassed':sum(r.get('technicalStatus')=='passed' for r in records),'accepted':sum(r.get('classification')=='accepted' for r in records),'rejected':sum(r.get('classification')=='rejected' for r in records),'provenanceIncomplete':sum(r.get('classification')=='provenance-incomplete' for r in records),'technicallyNoncompliant':sum(r.get('classification')=='technically-noncompliant' for r in records),'providerCalls':0,'spendUsd':'0.00','promotionAuthorized':False,'deploymentAuthorized':False,'nearDuplicatePairs':near,'assets':records}
    (OUT/'v2-certification.json').write_text(json.dumps(summary,indent=2,sort_keys=True)+'\n')
    (OUT/'v2-sha256-inventory.json').write_text(json.dumps(hashes,indent=2,sort_keys=True)+'\n')
    for family in GROUPS.values():
        cards=[c for f,c in thumbs if f==family]
        if not cards: continue
        cols=4; rows=(len(cards)+cols-1)//cols; sheet=Image.new('RGB',(cols*240,rows*220),(4,6,10))
        for i,c in enumerate(cards): sheet.paste(c,((i%cols)*240,(i//cols)*220))
        sheet.save(OUT/f'contact-sheet-{family}.png','PNG',optimize=True)
    print(json.dumps({k:summary[k] for k in ('expected','present','technicallyPassed','accepted','provenanceIncomplete','technicallyNoncompliant','providerCalls','spendUsd')},sort_keys=True))
    if summary['present']!=80 or summary['technicallyNoncompliant']!=0: return 2
    return 0

if __name__=='__main__': raise SystemExit(main())
