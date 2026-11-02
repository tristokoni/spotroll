"""Tests friend requests with temporary Supabase users; requires TEST_APP_URL and Supabase env vars."""
import os,json,urllib.request,urllib.error,secrets,uuid,subprocess
base=os.environ.get('TEST_APP_URL','http://127.0.0.1:3002');sup=os.environ['NEXT_PUBLIC_SUPABASE_URL'];service=os.environ['SUPABASE_SERVICE_ROLE_KEY'];anon=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'];users=[];checks=0

def http(url,body=None,method=None,headers=None,expected=200):
 global checks
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'content-type':'application/json',**(headers or {})},method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:status=r.status;raw=r.read()
 except urllib.error.HTTPError as e:status=e.code;raw=e.read()
 assert status==expected,f'{method or "GET"} {url.split("?")[0]} expected {expected}, got {status}'
 checks+=1;return json.loads(raw) if raw else {}
def admin(path,body=None,method=None):return http(sup+'/auth/v1/admin/'+path,body,method,{'apikey':service,'Authorization':'Bearer '+service})
def call(path,session=None,body=None,method=None,expected=200):return http(base+'/api/'+path,body,method,{'Authorization':'Bearer '+session['access_token']} if session else {},expected)
def make_user(letter):
 name='test_'+letter+'_'+uuid.uuid4().hex[:8];email=name+'@example.com';pw=secrets.token_urlsafe(24)
 u=admin('users',{'email':email,'password':pw,'email_confirm':True,'user_metadata':{'username':name}});users.append(u['id'])
 session=http(sup+'/auth/v1/token?grant_type=password',{'email':email,'password':pw},headers={'apikey':anon});session['test_username']=name;return session
try:
 a,b,c,d=[make_user(letter) for letter in 'abcd']
 call('friends',expected=401);call('friends',body={'username':b['test_username']},expected=401);call('friends',body={'id':str(uuid.uuid4()),'action':'accept'},method='PATCH',expected=401)
 found=call('friends?username='+b['test_username'].upper(),a);assert found['person']['id']==b['user']['id'];assert set(found['person'])=={'id','username'}
 assert call('friends?username=test_',a)['person'] is None,'Exact matching must not treat underscore as wildcard'
 assert call('friends?username='+a['test_username'],a)['self']
 call('friends',a,{'username':a['test_username']},expected=400)
 call('friends',a,{'username':'does_not_exist_'+uuid.uuid4().hex[:8]},expected=404)
 call('profile',a,{'username':b['test_username'].upper()},'PATCH',409)
 call('friends',a,{'username':b['test_username']});request_id=call('friends',a)['items'][0]['id']
 call('friends',a,{'username':b['test_username']},expected=409);call('friends',b,{'username':a['test_username']},expected=409)
 assert call('friends',c)['items']==[]
 call('friends',c,{'id':request_id,'action':'accept'},'PATCH',403);call('friends',a,{'id':request_id,'action':'accept'},'PATCH',403);call('friends',b,{'id':request_id,'action':'cancel'},'PATCH',403)
 call('friends',b,{'id':request_id,'action':'accept'},'PATCH')
 assert call('friends',a)['items'][0]['status']=='accepted';assert call('friends',b)['items'][0]['status']=='accepted'
 call('friends',c,{'id':request_id,'action':'remove'},'PATCH',403)
 # Cancellation and rejection are distinct, and prevent immediate repeat requests.
 call('friends',b,{'username':c['test_username']});r=next(x for x in call('friends',b)['items'] if x['status']=='pending')
 call('friends',b,{'id':r['id'],'action':'cancel'},'PATCH');call('friends',b,{'username':c['test_username']},expected=429)
 call('friends',a,{'username':d['test_username']});r=next(x for x in call('friends',a)['items'] if x['status']=='pending')
 call('friends',d,{'id':r['id'],'action':'decline'},'PATCH');call('friends',a,{'username':d['test_username']},expected=429)
 http(sup+'/rest/v1/friendships?select=*',headers={'apikey':anon,'Authorization':'Bearer '+a['access_token']},expected=403)
 print(f'PASS: {checks} friend API checks before browser tests.',flush=True)
 if os.environ.get('TEST_BROWSER_SCRIPT'):
  subprocess.run(['node',os.environ['TEST_BROWSER_SCRIPT']],env={**os.environ,'TEST_SESSION':json.dumps(a),'TEST_FRIEND_SESSION':json.dumps(c)},check=True)
 call('friends',a,{'id':request_id,'action':'remove'},'PATCH')
 assert not any(x['id']==request_id for x in call('friends',b)['items'])
 print(f'PASS: {checks} checks; username uniqueness, exact lookup, self/duplicate rejection, request ownership, acceptance, cancellation, rejection, removal, cooldown and RLS.')
finally:
 for uid in users:admin('users/'+uid,method='DELETE')
 print('Temporary friendship test users and requests removed.')
