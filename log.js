// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const winston=require("winston"),mainFormat=winston.format.printf((({level:n,message:o,timestamp:t,...e})=>`${t} ${n}: ${o} ${JSON.stringify(e)}`)),logger=winston.createLogger({level:"info",format:winston.format.combine(winston.format.timestamp(),mainFormat),transports:[new winston.transports.Console,new winston.transports.File({filename:"./combined.log"})]});module.exports={logger:logger};