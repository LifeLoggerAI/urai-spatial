#!/usr/bin/env python3
"""R882: read-only Firebase Hosting site and live-release evidence collector.

No network calls by default. Authenticated --collect is reserved for an already
approved, short-lived READ-ONLY WIF context. Never grants production GO.
No bearer token, raw provider body, environment values, or secret fields are
written to the output. All network calls are HTTPS GET to fixed Google APIs.
"""
from __future__ import annotations
import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener

PROJECT = 'urai-4dc1d'
TARGET_DOMAIN = 'urai.app'
REGION = 'us-central1'
# Do not confuse the WIF pool's project number with the Firebase production project number.
# The real Firebase project number must be read independently from projects.get.
MANAGEMENT_HOST = 'firebase.googleapis.com'
HOST = 'firebasehosting.googleapis.com'
BASE = f'https://{HOST}/v1beta1'
SITE_PATTERN = re.compile(r'^[a-z][a-z0-9-]{0,29}$')
API_PATH_PATTERN = re.compile(r'^/v1beta1/(?:projects/urai-4dc1d/sites(?:/[a-z][a-z0-9-]{0,29}/customDomains)?|sites/[a-z][a-z0-9-]{0,29}/channels/live/releases)$')
MANAGEMENT_PATH = f'/v1beta1/projects/{PROJECT}'
LIVE_API_TEMPLATE = '/v1beta1/sites/{verified_site_id}/channels/live/releases'
SCHEMA = 'urai-r882-provider-live-site-evidence-v1'

class EvidenceError(Exception):
    pass

def site_id_from_resource(value: object, verified_project_number: str) -> str:
    if not isinstance(value, str):
        raise EvidenceError('site resource not a string')
    parts = value.split('/')
    if len(parts)!=4 or parts[0]!='projects' or parts[2]!='sites' or parts[1] not in (PROJECT,verified_project_number):
        raise EvidenceError('site resource not under a source-declared project identifier')
    site_id=parts[3]
    if not SITE_PATTERN.fullmatch(site_id):
        raise EvidenceError('invalid Hosting site ID')
    return site_id

def strict_page_walk(fetch_json, resource_path: str, array_name: str, *, max_pages: int = 50):
    all_items, seen = [], set()
    token = ''
    pages = 0
    while True:
        if pages >= max_pages:
            raise EvidenceError('pagination incomplete: page cap reached')
        qs = {'pageSize':'100'}
        if token:
            qs['pageToken'] = token
        url = f'https://{HOST}{resource_path}?{urlencode(qs)}'
        result = fetch_json(url)
        if not isinstance(result, dict):
            raise EvidenceError('provider response was not an object')
        raw_items = result.get(array_name, [])
        if not isinstance(raw_items,list) or any(not isinstance(item, dict) for item in raw_items):
            raise EvidenceError('provider array malformed')
        all_items.extend(raw_items)
        pages += 1
        next_token = result.get('nextPageToken','')
        if not next_token:
            break
        if not isinstance(next_token,str) or len(next_token)>2048 or next_token in seen:
            raise EvidenceError('invalid/repeated page token')
        seen.add(next_token)
        token = next_token
    return all_items,pages

def safe_release(x):
    version = x.get('version') if isinstance(x.get('version'),dict) else {}
    return {k:v for k,v in {
        'name':x.get('name'), 'type':x.get('type'),
        'releaseTime':x.get('releaseTime'), 'versionName':version.get('name'),
    }.items() if isinstance(v,str)}

def time_key(x):
    raw=x.get('releaseTime')
    if not isinstance(raw,str):raise EvidenceError('release missing timestamp')
    try:
        return datetime.fromisoformat(raw.replace('Z','+00:00')).timestamp()
    except ValueError as e:
        raise EvidenceError('invalid release timestamp') from e

def choose_live_release(releases):
    candidates=[safe_release(x) for x in releases if x.get('type')!='SITE_DISABLE']
    if not candidates:
        return None, 'HOLD_NO_LIVE_RELEASE'
    for r in candidates:
        if not r.get('versionName') or not r.get('releaseTime'):
            raise EvidenceError('live release missing required identity')
    candidates.sort(key=time_key, reverse=True)
    if len(candidates)>1 and time_key(candidates[0])==time_key(candidates[1]) and candidates[0]['versionName'] != candidates[1]['versionName']:
        return None, 'HOLD_AMBIGUOUS_LIVE_RELEASE'
    return candidates[0], 'READBACK_LIVE_RELEASE_METADATA_ONLY'

def exact_domain_name(x, verified_project_number):
    name=x.get('name')
    if not isinstance(name,str): return None
    match=re.fullmatch(r'projects/([^/]+)/sites/([a-z][a-z0-9-]{0,29})/customDomains/([^/]+)',name)
    if not match or match.group(1) not in (PROJECT, verified_project_number):return None
    return match.group(2), match.group(3).lower().rstrip('.')

def collect(fetch_json):
    """Collect site/domain/live-release metadata, with no provider writes.

    This collector never asserts GO or source-to-deployment equivalence.
    """
    management=fetch_json(f'https://{MANAGEMENT_HOST}{MANAGEMENT_PATH}')
    if not isinstance(management,dict) or management.get('projectId')!=PROJECT:
        raise EvidenceError('Firebase project identity mismatch')
    project_number=management.get('projectNumber')
    if not isinstance(project_number,str) or not re.fullmatch(r'[1-9][0-9]{4,19}',project_number):
        raise EvidenceError('Firebase project number not independently established')
    sites,pages=strict_page_walk(fetch_json,f'/v1beta1/projects/{PROJECT}/sites','sites')
    entries=[];domain_pages=0;matches=[]
    seen_sites=set()
    for site in sites:
        sid=site_id_from_resource(site.get('name'),project_number)
        if sid in seen_sites: raise EvidenceError('duplicate Hosting site ID across pages')
        seen_sites.add(sid)
        domains,dpages=strict_page_walk(fetch_json,f'/v1beta1/projects/{PROJECT}/sites/{sid}/customDomains','customDomains')
        domain_pages += dpages
        safe_domains=[]
        for item in domains:
            pair=exact_domain_name(item,project_number)
            if pair is None or pair[0]!=sid:
                raise EvidenceError('untrusted custom domain returned for site')
            name=pair[1]
            cert=item.get('cert') if isinstance(item.get('cert'),dict) else {}
            row={k:v for k,v in {
                'domain':name,
                'hostState':item.get('hostState'),
                'ownershipState':item.get('ownershipState'),
                'certState':cert.get('state'),
                'redirectTarget':item.get('redirectTarget'),
                'deleteTime':item.get('deleteTime'),
                'reconciling':item.get('reconciling'),
            }.items() if isinstance(v,(str,bool))}
            safe_domains.append(row)
            if name == TARGET_DOMAIN:
                matches.append({'siteId':sid,'siteType':site.get('type'),'domain':row})
        entries.append({
            'siteId':sid,
            'siteType':site.get('type') if isinstance(site.get('type'),str) else None,
            'defaultUrl':site.get('defaultUrl') if isinstance(site.get('defaultUrl'),str) else None,
            'customDomains':safe_domains,
        })
    result={
        'schemaVersion':SCHEMA,
        'project':PROJECT,
        'verifiedProjectNumber':project_number,
        'expectedDomain':TARGET_DOMAIN,
        'sourceConfig':{
            'firebaseStaticExplicitSite':False,
            'firebaseStaticExplicitHostingTarget':False,
            'firebaseRcHostingTargetsEmpty':True,
            'pinnedConfigBlob':'3bf2e673913b70ef513a794017bac255679b7383',
            'pinnedRcBlob':'0d4fc68d65f23254829cc0502621a6ffe2215788',
        },
        'sitePageCount':pages, 'domainPageCount':domain_pages,
        'siteCount':len(entries), 'sites':entries,
        'domainMatches':len(matches),
        'selectedSiteId':None, 'selectedSiteType':None,
        'liveReleasePageCount':0,'liveReleases':[], 'latestLiveRelease':None,
        'classification':'HOLD', 'productionGO':False,
        'provenanceLimit':'Provider site/domain/release metadata alone cannot prove the exact source commit, Functions revisions, or authenticated owner-security runtime.',
        'holdReasons':[],
    }
    if len(matches)!=1:
        result['holdReasons'].append('expected domain is absent or associated with more than one site')
        return result
    owner=matches[0]
    sid=owner['siteId']
    result['selectedSiteId']=sid
    result['selectedSiteType']=owner['siteType']
    if owner['siteType']!='DEFAULT_SITE':
        result['holdReasons'].append('implicit Hosting configuration does not explicitly bind non-default custom-domain site')
    if sid!=PROJECT:
        result['holdReasons'].append('workflow hardcodes project ID as Hosting site ID without provider confirmation')
    if owner['domain'].get('hostState')!='HOST_ACTIVE':
        result['holdReasons'].append('custom domain hostState is not independently HOST_ACTIVE')
    if owner['domain'].get('ownershipState')!='OWNERSHIP_ACTIVE':
        result['holdReasons'].append('custom domain ownershipState is not independently OWNERSHIP_ACTIVE')
    if owner['domain'].get('certState')!='CERT_ACTIVE':
        result['holdReasons'].append('custom domain cert.state is not independently CERT_ACTIVE')
    if owner['domain'].get('redirectTarget'):
        result['holdReasons'].append('custom domain is configured to redirect elsewhere')
    if owner['domain'].get('deleteTime'):
        result['holdReasons'].append('custom domain is soft-deleted')
    if owner['domain'].get('reconciling') is True:
        result['holdReasons'].append('custom domain is still reconciling')
    releases,rpages=strict_page_walk(fetch_json,f'/v1beta1/sites/{sid}/channels/live/releases','releases')
    result['liveReleasePageCount']=rpages
    result['liveReleases']=[safe_release(r) for r in releases]
    latest,code=choose_live_release(releases)
    result['latestLiveRelease']=latest
    if code.startswith('HOLD_'):result['holdReasons'].append(code)
    if not result['holdReasons']:
        result['classification']='READBACK_ONLY_NO_PRODUCTION_GO'
    return result

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, url):
        raise EvidenceError('provider redirect refused')

def make_live_fetcher(token):
    if not token or any(c in token for c in '\r\n'):
        raise EvidenceError('invalid short-lived access token')
    opener=build_opener(NoRedirect())
    def fetch(url):
        parsed=urlsplit(url)
        eligible=(parsed.hostname==MANAGEMENT_HOST and parsed.path==MANAGEMENT_PATH) or (parsed.hostname==HOST and API_PATH_PATTERN.fullmatch(parsed.path))
        if (parsed.scheme!='https' or not eligible or parsed.username or parsed.password or parsed.fragment):
            raise EvidenceError('provider endpoint outside fixed read-only allowlist')
        req=Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/json','Cache-Control':'no-store'},method='GET')
        with opener.open(req,timeout=20) as response:
            if response.status != 200:
                raise EvidenceError('unexpected provider response status')
            data=response.read(8_000_001)
        if len(data)>8_000_000:
            raise EvidenceError('provider response size exceeds bound')
        try:
            return json.loads(data)
        except ValueError as err:
            raise EvidenceError('invalid provider JSON') from err
    return fetch

def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument('--collect',action='store_true')
    parser.add_argument('--acknowledge-readonly-cloud-access',action='store_true')
    parser.add_argument('--output',type=Path,default=Path('R882_PROVIDER_SITE_READBACK.json'))
    args=parser.parse_args(argv)
    if not args.collect:
        print(json.dumps({
            'mode':'DRY_RUN_NO_NETWORK', 'project':PROJECT,'expectedDomain':TARGET_DOMAIN,
            'firstEndpoint':f'https://{MANAGEMENT_HOST}{MANAGEMENT_PATH}',
            'secondEndpoint':f'{BASE}/projects/{PROJECT}/sites',
            'subsequentEndpoints':'projects/{project}/sites/{verified_site}/customDomains and sites/{verified_site}/channels/live/releases',
            'cloudWrites':False,'productionGO':False},indent=2))
        return 0
    if not args.acknowledge_readonly_cloud_access:
        print('HOLD: independently approved read-only cloud access required; no provider calls',file=sys.stderr)
        return 2
    token=os.environ.get('GOOGLE_WIF_ACCESS_TOKEN','')
    if not token:
        print('HOLD: short-lived read-only WIF token unavailable; no provider calls',file=sys.stderr)
        return 2
    try:
        result=collect(make_live_fetcher(token))
        # Refuse to overwrite an existing local evidence receipt.
        with args.output.open('x',encoding='utf-8') as handle:
            handle.write(json.dumps(result,indent=2,sort_keys=True)+'\n')
        print(f'Redacted read-only site evidence saved; classification={result["classification"]}; productionGO=false')
        return 0 if not result['holdReasons'] else 2
    except Exception as exc:
        # Never include provider responses or token-bearing context in logs.
        print(f'HOLD: read-only evidence failed with {type(exc).__name__}',file=sys.stderr)
        return 2

if __name__=='__main__':
    sys.exit(main())
