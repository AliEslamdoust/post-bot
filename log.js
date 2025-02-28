// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const moment=require("jalali-moment"),fs=require("fs"),path=require("path");function log_handler(e,r){try{fs.appendFile(path.join(__dirname,"./log.txt"),`${getJalaliDate()} - ${r}: ${e}\n`,(e=>{e&&console.error("Error writing to log file:",e)}))}catch(e){console.error("Error in log_handler:",e)}}function getJalaliDate(){return moment().locale("fa").format("YYYY/MM/DD HH:mm:ss")}module.exports={log_handler:log_handler};