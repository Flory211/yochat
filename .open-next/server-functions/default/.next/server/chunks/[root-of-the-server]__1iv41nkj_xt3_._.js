module.exports=[85148,(e,r,t)=>{r.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},54799,(e,r,t)=>{r.exports=e.x("crypto",()=>require("crypto"))},22734,(e,r,t)=>{r.exports=e.x("fs",()=>require("fs"))},70406,(e,r,t)=>{r.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,r,t)=>{r.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},20635,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},24725,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},56704,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},59043,(e,r,t)=>{r.exports=e.x("next/dist/server/runtime-reacts.external.js",()=>require("next/dist/server/runtime-reacts.external.js"))},93695,(e,r,t)=>{r.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},81111,(e,r,t)=>{r.exports=e.x("node:stream",()=>require("node:stream"))},14747,(e,r,t)=>{r.exports=e.x("path",()=>require("path"))},62294,e=>{"use strict";var r=e.i(85148),t=e.i(14747),E=e.i(22734);let s=null;if(!("u">typeof globalThis&&void 0!==globalThis.__WORKER_ENV__)){let e=t.default.join(process.cwd(),"data","yochat.db"),a=t.default.dirname(e);E.default.existsSync(a)||E.default.mkdirSync(a,{recursive:!0}),(s=new r.default(e)).pragma("journal_mode = WAL"),s.exec(`
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
  `)}e.s(["f",0,function(e){let r=e?.DB||globalThis.__WORKER_ENV__?.DB;if(r)return{prepare:e=>{let t=r.prepare(e);return{get:async(...e)=>await t.bind(...e).first()||null,run:async(...e)=>({lastInsertRowid:(await t.bind(...e).run()).meta.last_row_id}),all:async(...e)=>(await t.bind(...e).all()).results||[]}}};if(s)return{prepare:e=>{let r=s.prepare(e);return{get:(...e)=>r.get(...e)||null,run:(...e)=>({lastInsertRowid:r.run(...e).lastInsertRowid}),all:(...e)=>r.all(...e)||[]}}};throw Error("No database available - not on Cloudflare and no local SQLite")}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1iv41nkj_xt3_._.js.map