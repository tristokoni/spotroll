const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const sup=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
async function api(path,body,key=service,method='POST'){const r=await fetch(sup+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();assert(r.ok,'Supabase request failed: '+r.status);return d}
(async()=>{let uid,browser;try{
 const email='reset_'+Date.now()+'@example.com',old='Old!'+crypto.randomUUID(),password='New!'+crypto.randomUUID();
 const u=await api('/auth/v1/admin/users',{email,password:old,email_confirm:true,user_metadata:{username:'reset_'+Date.now()}});uid=u.id;
 const link=await api('/auth/v1/admin/generate_link',{type:'recovery',email,options:{redirectTo:'https://spotroll-gamma.vercel.app/reset-password'}});
 const session=await api('/auth/v1/verify',{type:'recovery',token_hash:link.hashed_token},anon);
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();let recoverRequests=0;
 await context.route(sup+'/**',async route=>{const req=route.request();if(req.url().includes('/recover')){recoverRequests++;assert.equal(JSON.parse(req.postData()).email,email);assert.equal(new URL(req.url()).searchParams.get('redirect_to'),'http://127.0.0.1:3002/reset-password');return route.fulfill({status:recoverRequests===1?200:429,contentType:'application/json',body:recoverRequests===1?'{}':'{"message":"rate limit"}'})}const r=await fetch(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()||undefined});await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())})});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3002/login');await page.getByRole('button',{name:'Zabudnuté heslo?'}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByRole('button',{name:'Poslať odkaz na obnovu'}).click();await page.getByText(/Ak je k tomuto e-mailu/).waitFor();await page.getByRole('button',{name:'Poslať odkaz na obnovu'}).click();await page.getByText(/Príliš veľa pokusov/).waitFor();
 await page.goto('http://127.0.0.1:3002/reset-password');await page.getByText(/Odkaz na obnovu je neplatný/).waitFor();
 await page.goto('http://127.0.0.1:3002/login');
 const hash=new URLSearchParams({access_token:session.access_token,refresh_token:session.refresh_token,type:'recovery',token_type:'bearer',expires_in:'3600'});
 await page.goto('http://127.0.0.1:3002/reset-password#'+hash);await page.getByLabel('Nové heslo',{exact:true}).fill(password);await page.getByLabel('Zopakuj nové heslo').fill(password+'x');await page.getByRole('button',{name:'Uložiť nové heslo'}).click();await page.getByText('Heslá sa nezhodujú.').waitFor();await page.getByLabel('Zopakuj nové heslo').fill(password);await page.getByRole('button',{name:'Uložiť nové heslo'}).click();await page.getByText(/Heslo je zmenené/).waitFor();
 await page.getByRole('link',{name:'Prihlásiť sa',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Heslo',{exact:true}).fill(password);await page.getByRole('button',{name:'Prihlásiť',exact:true}).click();await page.waitForURL('http://127.0.0.1:3002/');
 const bad=await fetch(sup+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email,password:old})});assert.equal(bad.status,400);assert.equal(errors.length,0);
 console.log('PASS: reset request and rate limit UI, invalid link, real Supabase recovery session, mismatch validation, password update, login with new password and old password rejected. Email delivery not tested.');
 }finally{if(browser)await browser.close();if(uid)await api('/auth/v1/admin/users/'+uid,undefined,service,'DELETE');console.log('Temporary account removed.')}})().catch(e=>{console.error(e.message);process.exitCode=1});
