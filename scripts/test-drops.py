"""Integration checks for private geocaching drops. Uses temporary users; removes them in finally."""
import os,json,urllib.request,urllib.error,secrets,uuid,subprocess,concurrent.futures
base=os.environ.get('TEST_APP_URL','http://127.0.0.1:3002');sup=os.environ['NEXT_PUBLIC_SUPABASE_URL'];service=os.environ['SUPABASE_SERVICE_ROLE_KEY'];anon=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'];users=[];checks=0

def http(url,body=None,method=None,headers=None,expected=200):
 global checks
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'content-type':'application/json',**(headers or {})},method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:status=r.status;raw=r.read()
 except urllib.error.HTTPError as e:status=e.code;raw=e.read()
 allowed=expected if isinstance(expected,tuple) else (expected,)
 assert status in allowed,f'{method or "GET"} {url.split("?")[0]} expected {allowed}, got {status}'
 checks+=1;data=json.loads(raw) if raw else {}
 return (status,data) if isinstance(expected,tuple) else data

def admin(path,body=None,method=None):return http(sup+'/auth/v1/admin/'+path,body,method,{'apikey':service,'Authorization':'Bearer '+service})
def call(session=None,body=None,method=None,expected=200,query=''):return http(base+'/api/drops'+query,body,method,{'Authorization':'Bearer '+session['access_token']} if session else {},expected)
def make_user(letter):
 name='drop_'+letter+'_'+uuid.uuid4().hex[:8];email=name+'@example.com';pw=secrets.token_urlsafe(24)
 u=admin('users',{'email':email,'password':pw,'email_confirm':True,'user_metadata':{'username':name}});users.append(u['id'])
 s=http(sup+'/auth/v1/token?grant_type=password',{'email':email,'password':pw},headers={'apikey':anon});s['test_username']=name;return s
try:
 a,b,c=[make_user(k) for k in 'abc']
 for method in ['GET','POST','PATCH']:call(body={} if method!='GET' else None,method=method,expected=401)
 body={'kind':'gift','title':'Temporary geocache test','description':'Game collectible','hint':'Test hint','username':b['test_username'].upper(),'latitude':48.123456,'longitude':19.654321}
 for patch in [{'latitude':91},{'longitude':181},{'latitude':None},{'latitude':''},{'username':a['test_username']},{'kind':'invalid'}]:call(a,{**body,**patch},expected=400)
 call(a,{**body,'username':'missing_'+uuid.uuid4().hex[:8]},expected=404)
 gift=call(a,{**body,'status':'collected','recipient_id':a['user']['id']})['id']
 ga=call(a,query='?id='+gift)['items'][0];gb=call(b,query='?id='+gift)['items'][0]
 assert ga['is_sender'] and gb['is_recipient'] and ga['status']=='ready';assert ga['latitude']==body['latitude'] and gb['longitude']==body['longitude']
 assert 'sender_id' not in ga and 'creator_id' not in ga
 call(c,query='?id='+gift,expected=404);assert call(c)['items']==[]
 # Even admin role alone must not grant access to private GPS or notes.
 http(sup+'/rest/v1/profiles?id=eq.'+c['user']['id'],{'role':'admin'},'PATCH',{'apikey':service,'Authorization':'Bearer '+service},204)
 call(c,query='?id='+gift,expected=404);call(c,{'id':gift,'action':'collect'},'PATCH',404)
 call(a,{'id':gift,'action':'collect'},'PATCH',403)
 call(b,{'id':gift,'action':'ready','latitude':0,'longitude':0},'PATCH',403)
 call(b,{'id':gift,'action':'collect','pickup_note':'Found, thank you!'},'PATCH')
 done=call(a,query='?id='+gift)['items'][0];assert done['status']=='collected' and done['collected_at'] and done['pickup_note']=='Found, thank you!'
 call(b,{'id':gift,'action':'collect'},'PATCH',409);call(a,{'id':gift,'action':'cancel'},'PATCH',409)
 order=call(a,{**body,'kind':'request'})['id'];assert call(a,query='?id='+order)['items'][0]['is_recipient'];assert call(b,query='?id='+order)['items'][0]['is_sender']
 call(a,{'id':order,'action':'collect'},'PATCH',409);call(a,{'id':order,'action':'ready','latitude':0,'longitude':0},'PATCH',403)
 call(b,{'id':order,'action':'ready','latitude':0,'longitude':0,'hint':'Confirmed at the origin'},'PATCH')
 ready=call(a,query='?id='+order)['items'][0];assert ready['status']=='ready' and ready['latitude']==0 and ready['longitude']==0 and ready['ready_at']
 call(a,{'id':order,'action':'collect'},'PATCH')
 cancelled=call(a,{**body,'kind':'request'})['id'];call(b,{'id':cancelled,'action':'cancel'},'PATCH');assert call(a,query='?id='+cancelled)['items'][0]['status']=='cancelled';call(b,{'id':cancelled,'action':'ready','latitude':1,'longitude':2},'PATCH',409)
 race=call(a,body)['id']
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  rs=list(pool.map(lambda args:call(*args),[(b,{'id':race,'action':'collect'},'PATCH',(200,409)),(a,{'id':race,'action':'cancel'},'PATCH',(200,409))]))
 assert sorted(r[0] for r in rs)==[200,409],'Only one terminal transition may succeed'
 http(sup+'/rest/v1/cache_drops?select=*',headers={'apikey':anon,'Authorization':'Bearer '+b['access_token']},expected=403)
 print(f'PASS: {checks} API checks; exact GPS, private invitations, sender/recipient roles, requested→ready→collected, cancellation, replay/race protection and RLS.',flush=True)
 if os.environ.get('TEST_BROWSER_SCRIPT'):subprocess.run(['node',os.environ['TEST_BROWSER_SCRIPT']],env={**os.environ,'TEST_SESSION':json.dumps(a),'TEST_RECIPIENT_SESSION':json.dumps(b)},check=True)
finally:
 for uid in users:admin('users/'+uid,method='DELETE')
 print('Temporary geocaching test accounts and their drops removed.')
