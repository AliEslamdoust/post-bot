// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const{logger:logger}=require("./log");async function checkAdminStatus(t,r){try{const e=await t.telegram.getChatMember(r,t.botInfo.id);return"administrator"===e.status||"creator"===e.status}catch(t){return logger.error("Error in receving channel members: "+t),!1}}module.exports={checkAdminStatus:checkAdminStatus};