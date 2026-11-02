import './globals.css';
import Nav from '@/components/Nav';
export const metadata={title:'Spotroll — von z každodennosti',description:'Objav miesta vo svojom okolí. Vyber si, čo máš rád, a nechaj sa prekvapiť.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="sk"><body><Nav/><main className="max-w-5xl mx-auto px-5 py-10 pb-20">{children}</main><footer className="site-footer">SPOTROLL <span>Dobré miesta sú bližšie, než si myslíš.</span></footer></body></html>}
