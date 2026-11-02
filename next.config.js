const dev=process.env.NODE_ENV!=='production';
module.exports={reactStrictMode:true,poweredByHeader:false,async headers(){return[{source:'/(.*)',headers:[
{key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
{key:'Permissions-Policy',value:'geolocation=(self), camera=(), microphone=()'},{key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'},
{key:'Content-Security-Policy',value:`default-src 'self'; script-src 'self' 'unsafe-inline'${dev?" 'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://router.project-osrm.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`}]}]}};
