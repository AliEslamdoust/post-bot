// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const log=require("./log"),sqlite=require("sqlite3").verbose(),path=require("path"),fs=require("fs"),dirPath="./db";try{fs.mkdirSync("./db",{recursive:!0}),log.log_handler("Directory './db' created successfully (or already existed).","INFO")}catch(e){"EEXIST"===e.code?log.log_handler("Directory './db' already exists.","INFO"):log.log_handler("Error creating directory './db': "+e,"ERROR")}function connectToDatabase(){const e=path.join(__dirname,"./db/file.db"),r=fs.existsSync(e),t=new sqlite.Database(e,(e=>{e?log.log_handler(e,"ERROR"):(log.log_handler(r?"Connected to database":"Created new database","INFO"),r||createTables(t))}));return t}async function createTables(e){return new Promise(((r,t)=>{e.serialize((()=>{let a=!1;const n=()=>{e.run('CREATE TABLE "posts" (\n            "link" TEXT,\n            "writer" INTEGER,\n            "date" INTEGER,\n            "id" TEXT,\n            "finished" INTEGER\n          )',(e=>{e?(log.log_handler(e,"ERROR"),a=!0):log.log_handler("Posts table created","INFO"),o()}))},o=()=>{e.run('CREATE TABLE "users" (\n            "id" INTEGER,\n            "role" TEXT,\n            "name" TEXT\n          )',(e=>{e?(log.log_handler(e,"ERROR"),a=!0):log.log_handler("Users table created","INFO"),a?t(new Error("One or more tables failed to create.")):(createConfigs(),r())}))};e.run('CREATE TABLE "config" (\n            "key" TEXT,\n            "value" TEXT\n          )',(e=>{e?(log.log_handler(e,"ERROR"),a=!0):log.log_handler("Config table created","INFO"),n()}))}))}))}function createConfigs(){try{[{key:"signature",value:""},{key:"isSign",value:"0"},{key:"isWatermark",value:"0"},{key:"writerSign",value:"0"}].forEach((e=>{db.run("INSERT into config (key, value) VALUES (?, ?)",[e.key,e.value],(r=>{if(r)throw new Error(r);log.log_handler(`Added new config to database: ${e.key}`,"INFO")}))}))}catch(e){log.log_handler("Error while adding new config to database: "+e,"ERROR")}}const db=connectToDatabase();async function userExists(e){try{if(await new Promise(((r,t)=>{db.get("SELECT 1 FROM users WHERE id = ?",[e],((e,a)=>{e?t(e):r(!!a)}))})))return!0}catch(e){return log.log_handler("Error while getting user data from database: "+e,"ERROR"),!1}}async function getUser(e){try{return{ok:!0,data:await new Promise(((r,t)=>{db.get("SELECT * FROM users WHERE id = ?",[e],((e,a)=>{e?t(e):r(a)}))}))}}catch(e){return log.log_handler("Error while getting user data from database: "+e,"ERROR"),{ok:!1,data:null}}}async function getPost(e){try{return{ok:!0,data:await new Promise(((r,t)=>{db.get("SELECT * FROM posts WHERE id = ?",[e],((e,a)=>{e?t(e):r(a)}))}))}}catch(e){return log.log_handler("Error while getting post data from database: "+e,"ERROR"),{ok:!1,data:null}}}async function getAllUsers(){try{return{ok:!0,data:await new Promise(((e,r)=>{db.all("SELECT * FROM users",[],((t,a)=>{t?r(t):e(a)}))}))}}catch(e){return log.log_handler("Error while getting users data from database: "+e,"ERROR"),{ok:!1,data:null}}}async function getAllUsersPosts(e){try{return{ok:!0,data:await new Promise(((r,t)=>{db.all("SELECT * FROM posts where writer = ? AND finished = 1",[e],((e,a)=>{e?t(e):r(a)}))}))}}catch(e){return log.log_handler("Error while getting users data from database: "+e,"ERROR"),{ok:!1,data:null}}}async function addUser(e,r){try{return r=r||"writer",await new Promise(((t,a)=>{db.run("INSERT into users (id, role) VALUES (?, ?)",[e,r],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error while adding new user to database: "+e,"ERROR"),!1}}async function createPost(e,r){try{return await new Promise(((t,a)=>{db.run("INSERT into posts (writer, id, date, finished) VALUES (?, ?, ?, 0)",[e,r,Date.now()],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error creating a new post in database: "+e,"ERROR"),!1}}async function updatePostStats(e,r){try{return await new Promise(((t,a)=>{db.run("UPDATE posts SET link = ?, finished = 1  WHERE id = ?",[r,e],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error while changing post status in database: "+e,"ERROR"),!1}}async function updateUserRole(e,r){try{return await new Promise(((t,a)=>{db.run("UPDATE users SET role = ? WHERE id = ?",[r,e],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error while changing users role: "+e,"ERROR"),!1}}async function deleteUser(e){try{return await new Promise(((r,t)=>{db.run("DELETE FROM users WHERE id = ?",[e],(e=>{e?t(e):r()}))})),!0}catch(e){return log.log_handler("Error while deleting a user from database: "+e,"ERROR"),!1}}async function getConfig(e){try{return{ok:!0,data:await new Promise(((r,t)=>{db.get("SELECT * FROM config WHERE key = ?",[e],((e,a)=>{e?t(e):r(a)}))}))}}catch(e){return log.log_handler("Error while getting config value from database: "+e,"ERROR"),{ok:!1,data:null}}}async function updateConfig(e,r){try{return await new Promise(((t,a)=>{db.run("UPDATE config SET value = ? WHERE key = ?",[r,e],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error while changing config: "+e,"ERROR"),!1}}async function updateUsersName(e,r){try{return await new Promise(((t,a)=>{db.run("UPDATE users SET name = ? WHERE id = ?",[e,r],(e=>{e?a(e):t()}))})),!0}catch(e){return log.log_handler("Error while changing users name: "+e,"ERROR"),!1}}module.exports={userExists:userExists,getUser:getUser,getPost:getPost,addUser:addUser,getAllUsers:getAllUsers,getAllUsersPosts:getAllUsersPosts,updateUserRole:updateUserRole,deleteUser:deleteUser,getConfig:getConfig,updateConfig:updateConfig,updateUsersName:updateUsersName,createPost:createPost,updatePostStats:updatePostStats};