import {NextResponse} from 'next/server';import {auth,err} from '@/lib/server';
export async function POST(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);
 if(Number(req.headers.get('content-length')||0)>6*1024*1024)return err('Fotografia môže mať najviac 3 MB.',413);
 const form=await req.formData().catch(()=>null),file=form?.get('photo'),id=form?.get('id');
 if(!(file instanceof File)||typeof id!=='string'||file.size>3*1024*1024||!file.size)return err('Vyber fotografiu JPG, PNG alebo WebP do 3 MB.');
 const{data:visit}=await a.s.from('visits').select('id,photo_path').eq('id',id).eq('user_id',a.id).maybeSingle();if(!visit)return err('Zápis nie je tvoj.',403);
 const bytes=new Uint8Array(await file.arrayBuffer());let ext='';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))ext='png';else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')ext='webp';if(!ext)return err('Nepodporovaný formát fotografie.');
 const path=`${a.id}/${visit.id}/${crypto.randomUUID()}.${ext}`,storage=a.s.storage.from('visit-photos');
 const{error}=await storage.upload(path,bytes,{contentType:ext==='jpg'?'image/jpeg':'image/'+ext,upsert:false});if(error)return err('Nahratie fotografie zlyhalo.',500);
 const{data:updated,error:updateError}=await a.s.from('visits').update({photo_path:path}).eq('id',id).eq('user_id',a.id).select('id').maybeSingle();
 if(updateError||!updated){await storage.remove([path]);return err('Pripojenie fotografie zlyhalo.',500);}if(visit.photo_path)await storage.remove([visit.photo_path]);return NextResponse.json({ok:true});
}
