'use client';
import Link from 'next/link';import {useAuth,sb} from '@/lib/supabase';
export default function Nav(){const a=useAuth();return <header className="sticky top-0 z-[1100] bg-fog/90 backdrop-blur border-b border-ink/10"><div className="max-w-5xl mx-auto flex items-center gap-4 px-4 h-20">
<Link href="/" className="font-display font-extrabold text-2xl tracking-tight">spotroll<span className="text-trail">↗</span></Link>
<nav className="ml-auto flex items-center gap-4 text-sm font-semibold"><Link href="/submit">Navrhnúť spot</Link>{a.role==='admin'&&<Link href="/admin" className="text-trail">Admin</Link>}
{a.user?<button onClick={()=>sb.auth.signOut()} title={a.user.email}>Odhlásiť</button>:<Link href="/login" className="btn !py-1.5 !px-3">Prihlásiť</Link>}</nav></div></header>;}
