// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const log=require("./log");async function checkAdminStatus(t,e){try{const a=await t.telegram.getChatMember(e,t.botInfo.id);return"administrator"===a.status||"creator"===a.status}catch(t){return log.log_handler(t,"ERROR"),!1}}module.exports={checkAdminStatus:checkAdminStatus};