// Generate a self-contained Worker entrypoint with same-origin assets.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {gzipSync} from "node:zlib";
const root=new URL("../",import.meta.url);
const read=name=>readFileSync(new URL(name,root));
const types={"index.html":"text/html; charset=utf-8","style.css":"text/css","app.js":"text/javascript","engine.js":"text/javascript","sync.js":"text/javascript","solver/worker.mjs":"text/javascript","solver/cpsat.wasm":"application/wasm"};
const assets=Object.fromEntries(Object.entries(types).map(([name,mime])=>[name,[mime,name.endsWith(".wasm")?gzipSync(read(name)).toString("base64"):read(name).toString("utf8")]]));
const code=read("backend/workspace.mjs").toString()+"\nconst assets="+JSON.stringify(assets)+";\n"+`
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==="/api/workspace"){
   try{return await workspace(request,env.DB)}catch{return Response.json({error:"storage"},{status:503,headers:{"Cache-Control":"no-store"}})}
 }
 const path=url.pathname.slice(1)||"index.html";
 if(!["GET","HEAD"].includes(request.method)||!Object.hasOwn(assets,path))return new Response(null,{status:404});
 const [mime,content]=assets[path];
 const headers={"Content-Type":mime,"X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","Cache-Control":"no-cache"};
 if(request.method==="HEAD")return new Response(null,{headers});
 if(path.endsWith(".wasm")){
  const bytes=Uint8Array.from(atob(content),v=>v.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),{headers});
 }
 return new Response(content,{headers});
}};
`;
mkdirSync(new URL("dist/server/",root),{recursive:true});
writeFileSync(new URL("dist/server/index.js",root),code);
