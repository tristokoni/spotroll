"""Integration test. Requires a running app, Supabase URL/keys and disposable-user creation rights.
Creates only marked temporary users; deletes them (and their rows) in finally.
"""
import os,json,urllib.request,urllib.error,secrets,uuid,datetime,base64,subprocess
base=os.environ.get('TEST_APP_URL','http://127.0.0.1:3002')
sup=os.environ['NEXT_PUBLIC_SUPABASE_URL'];service=os.environ['SUPABASE_SERVICE_ROLE_KEY'];anon=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
users=[];checks=0

def http(url,body=None,method=None,headers=None,expected=200):
 global checks
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'content-type':'application/json',**(headers or {})},method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:status=r.status;raw=r.read()
 except urllib.error.HTTPError as e:status=e.code;raw=e.read()
 assert status==expected,f'{method or "GET"} {url.split("?")[0]} expected {expected}, got {status}'
 checks+=1
 return json.loads(raw) if raw else {}
def admin(path,body=None,method=None):return http(sup+'/auth/v1/admin/'+path,body,method,{'apikey':service,'Authorization':'Bearer '+service})
def call(path,session=None,body=None,method=None,expected=200):return http(base+'/api/'+path,body,method,{'Authorization':'Bearer '+session['access_token']} if session else {},expected)
def make_user():
 email='spotroll-test-'+uuid.uuid4().hex+'@example.com';pw=secrets.token_urlsafe(24)
 u=admin('users',{'email':email,'password':pw,'email_confirm':True,'user_metadata':{'username':'Temporary integration test'}});users.append(u['id'])
 return http(sup+'/auth/v1/token?grant_type=password',{'email':email,'password':pw},headers={'apikey':anon})
try:
 a=make_user();b=make_user()
 for path in ['spots','community/trips','community/polls','community/visits','community/tips','favorites']:
  call(path,expected=401)
 call('visit-photo',body={},expected=401)
 spots=call('spots',a)['spots'];assert len(spots)>=2,'At least two public places required';ids=[s['id'] for s in spots[:2]]
 trip=call('community/trips',a,{'title':'Temporary test trip','spot_ids':ids,'notes':'Private test','shared':False})['id']
 assert call('community/trips?id='+trip,a)['items'][0]['own']
 call('community/trips?id='+trip,b,expected=403)
 call('community/trips',b,{'id':trip,'title':'Unauthorized edit','spot_ids':ids},expected=403)
 call('community/trips',b,{'id':trip},'DELETE',403)
 call('community/trips',a,{'id':trip,'title':'Shared test trip','spot_ids':list(reversed(ids)),'shared':True})
 assert call('community/trips?id='+trip,b)['items'][0]['spot_ids']==list(reversed(ids))
 call('community/trips?id='+trip,expected=401)
 poll=call('community/polls',a,{'title':'Temporary test vote','spot_ids':ids})['id']
 call('community/vote',b,{'poll_id':poll,'spot_id':str(uuid.uuid4())},expected=400)
 call('community/vote',b,{'poll_id':poll,'spot_id':ids[0]})
 call('community/vote',b,{'poll_id':poll,'spot_id':ids[1]})
 p=call('community/polls?id='+poll,a)['items'][0];assert p['total']==1 and p['counts'][ids[1]]==1 and p['counts'][ids[0]]==0
 call('community/polls',b,{'id':poll,'closed':True},'PATCH',403)
 call('community/polls',a,{'id':poll,'closed':True},'PATCH')
 call('community/vote',b,{'poll_id':poll,'spot_id':ids[0]},expected=409)
 # Direct Supabase access must not bypass the server ownership checks.
 for table in ['trips','polls','poll_votes','visits','spot_tips']:
  http(sup+'/rest/v1/'+table+'?select=*',headers={'apikey':anon,'Authorization':'Bearer '+b['access_token']},expected=403)
 date=datetime.date.today().isoformat()
 visit=call('community/visits',a,{'spot_id':ids[0],'visited_on':date,'note':'A test memory'})['id']
 call('community/visits',a,{'spot_id':ids[0],'visited_on':date,'note':'Updated memory'})
 assert len(call('community/visits',a)['items'])==1
 assert len(call('community/visits',b)['items'])==0
 call('community/visits',b,{'id':visit},'DELETE',403)
 call('community/visits',a,{'spot_id':ids[0],'visited_on':'2999-01-01'},expected=400)
 boundary='Spotroll'+uuid.uuid4().hex
 png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvWQAAAAASUVORK5CYII=')
 data=(f'--{boundary}\r\nContent-Disposition: form-data; name="id"\r\n\r\n{visit}\r\n--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+f'\r\n--{boundary}--\r\n'.encode()
 req=urllib.request.Request(base+'/api/visit-photo',data=data,headers={'Authorization':'Bearer '+a['access_token'],'Content-Type':'multipart/form-data; boundary='+boundary})
 with urllib.request.urlopen(req,timeout=40) as r:assert r.status==200
 assert call('community/visits',a)['items'][0]['photo_url']
 tip=call('community/tips',a,{'spot_id':ids[0],'category':'access','body':'Temporary automated integration test. Will be deleted.'})['id']
 assert any(t['id']==tip for t in call('community/tips',b)['items'])
 call('community/tips',b,{'id':tip},'DELETE',403)
 call('community/tips',b,{'id':tip,'hidden':True},'PATCH',403)
 # Grant admin only to our disposable test account, then test moderation.
 http(sup+'/rest/v1/profiles?id=eq.'+b['user']['id'],{'role':'admin'},'PATCH',{'apikey':service,'Authorization':'Bearer '+service},204)
 call('community/tips',b,{'id':tip,'hidden':True},'PATCH')
 assert not any(t['id']==tip for t in call('community/tips',a)['items'])
 call('community/tips',b,{'id':tip,'hidden':False},'PATCH')
 call('community/tips',a,{'id':tip},'DELETE')
 print(f'PASS: {checks} API checks before browser tests.',flush=True)
 # Optional real-browser tests receive only the temporary user's session.
 if os.environ.get('TEST_BROWSER_SCRIPT'):
  env={**os.environ,'TEST_SESSION':json.dumps(a),'TEST_SPOT_IDS':json.dumps(ids)}
  subprocess.run(['node',os.environ['TEST_BROWSER_SCRIPT']],env=env,check=True)
 call('community/visits',a,{'id':visit},'DELETE')
 call('community/trips',a,{'id':trip},'DELETE')
 call('community/polls',a,{'id':poll},'DELETE')
 print(f'PASS: {checks} HTTP checks; account gates, ownership, sharing, vote replacement/closure, RLS, private journal/photo, tip moderation.')
finally:
 # Delete test photo objects even if an assertion failed before deleting its visit.
 for uid in users:
  try:
   rows=http(sup+'/rest/v1/visits?user_id=eq.'+uid+'&select=photo_path',headers={'apikey':service,'Authorization':'Bearer '+service})
   paths=[r['photo_path'] for r in rows if r.get('photo_path')]
   if paths:http(sup+'/storage/v1/object/visit-photos',{'prefixes':paths},'DELETE',{'apikey':service,'Authorization':'Bearer '+service})
  finally:admin('users/'+uid,method='DELETE')
 print('Temporary test users and related data removed.')
