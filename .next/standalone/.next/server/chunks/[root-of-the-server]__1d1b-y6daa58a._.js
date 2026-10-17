module.exports=[[62294,e=>{var t=e.i(85148),r=e.i(14747),n=e.i(22734),a=e.i(32507);let E=Symbol.for("__cloudflare-context__");function i(){return globalThis[E]}async function o(){let e=i();if(e)return e;{var t;let e=await l();return t=e,globalThis[E]=t,e}}async function l(e){let{getPlatformProxy:t}=await (0,a.trackDynamicImport)(import(`${"__wrangler".replaceAll("_","")}`)),r=e?.environment??process.env.NEXT_DEV_WRANGLER_ENV,{env:n,cf:E,ctx:i}=await t({...e,envFiles:[],environment:r});return{env:n,cf:E,ctx:i}}let T=`

ERROR: \`getCloudflareContext\` has been called without having called \`initOpenNextCloudflareForDev\` from the Next.js config file.
You should update your Next.js config file as shown below:

   \`\`\`
   // next.config.mjs

   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

   initOpenNextCloudflareForDev();

   const nextConfig = { ... };
   export default nextConfig;
   \`\`\`

`,s=null,c=!1;try{c=!0}catch{c=!1}if(!c){let e=r.default.join(process.cwd(),"data","yochat.db"),a=r.default.dirname(e);n.default.existsSync(a)||n.default.mkdirSync(a,{recursive:!0}),(s=new t.default(e)).pragma("journal_mode = WAL"),s.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'general' CHECK(type IN ('general', 'private')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id INTEGER,
      user_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, user_id),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('text', 'image', 'file')),
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      is_edited INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)}async function d(){let e=null;if(c)try{let{env:t}=await function(e={async:!1}){return e.async?o():function(){let e,t=i();if(t)return t;if(e=globalThis,e.__NEXT_DATA__?.nextExport===!0)throw Error("\n\nERROR: `getCloudflareContext` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:\n  - make sure that the call is not at the top level and that the route is not static\n  - call `getCloudflareContext({async: true})` to use the `async` mode\n  - avoid calling `getCloudflareContext` in the route\n");throw Error(T)}()}({async:!0});e=t.DB}catch(e){console.error("Failed to get Cloudflare context:",e)}if(e)return{prepare:t=>{let r=e.prepare(t);return{get:async(...e)=>await r.bind(...e).first()||null,run:async(...e)=>({lastInsertRowid:(await r.bind(...e).run()).meta.last_row_id}),all:async(...e)=>(await r.bind(...e).all()).results||[]}}};if(s)return{prepare:e=>{let t=s.prepare(e);return{get:(...e)=>t.get(...e)||null,run:(...e)=>({lastInsertRowid:t.run(...e).lastInsertRowid}),all:(...e)=>t.all(...e)||[]}}};throw Error("No database available - not on Cloudflare and no local SQLite")}e.s(["f",0,d],62294)},32507,(e,t,r)=>{Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"trackDynamicImport",{enumerable:!0,get:function(){return n.trackDynamicImport}});let n=e.r(83972)},83972,(e,t,r)=>{Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"trackDynamicImport",{enumerable:!0,get:function(){return i}});let n=e.r(76414),a=e.r(31846),E=e.r(34270);function i(e){if(!(0,a.isThenable)(e))throw new n.InvariantError("`trackDynamicImport` should always receive a promise. Something went wrong in the dynamic imports transform.");return(0,E.trackPendingImport)(e),e}},31846,(e,t,r)=>{function n(e){return null!==e&&"object"==typeof e&&"then"in e&&"function"==typeof e.then}Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isThenable",{enumerable:!0,get:function(){return n}})}],85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},22734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1d1b-y6daa58a._.js.map