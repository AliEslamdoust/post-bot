// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const{exec:exec}=require("child_process"),sharp=require("sharp"),log=require("./log"),path=require("path");async function watermarkImage(e,t,i){try{const o=path.join(__dirname,`./media/${e}.jpg`),r=path.join(__dirname,`./media/output-${e}.jpg`),a=path.join(__dirname,"./media/watermark.png"),n=await sharp(a).resize(t.width,t.newHeight).toBuffer();return await sharp(o).composite([{input:n,gravity:i,top:position.top||void 0,left:position.left||void 0}]).toFile(r),setTimer(a),!0}catch(e){return log.log_handler("Error adding watermark to image:"+e,"ERROR"),!1}}async function watermarkVideo(e,t){return new Promise(((i,o)=>{const r=path.join(__dirname,`./media/${e}.mp4`),a=path.join(__dirname,`./media/output-${e}.mp4`),n=`ffmpeg -i "${r}" -i "${path.join(__dirname,"./media/watermark.png")}" -filter_complex "[1]scale=iw*${t.scale||.1}:-1[logo];[0][logo]overlay=${t.left||"main_w-overlay_w-10"}:${t.top||"main_h-overlay_h-10"}" -c:a copy -c:v libx264 "${a}"`;exec(n,((e,t,r)=>{if(e)return log.log_handler(`FFmpeg error: ${r}`,"ERROR"),void o(!1);setTimer(a),i(!0)}))}))}async function getImageDimensions(e){try{const t=await sharp(e).metadata();return{ok:!0,width:t.width,height:t.height}}catch(e){return log.log_handler("Error getting image dimensions: "+e,"ERROR"),{ok:!1}}}async function getVideoDimensions(e){return new Promise(((t,i)=>{exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${e}"`,((e,o,r)=>{if(e)return log.log_handler(`FFprobe error: ${r}`),void i({ok:!1});try{const e=JSON.parse(o),i={width:e.streams[0].width,height:e.streams[0].height};t({ok:!0,width:i.width,height:i.height})}catch(e){log.log_handler("Error parsing FFprobe output:",e),i({ok:!1})}}))}))}async function calculateWatermarkPosition(e,t){position={top:10,left:10};try{const i=path.join(__dirname,"./media/watermark.png"),o=await sharp(i).metadata();let r=o.width,a=o.height;const n=r/a,h={width:t.width,height:t.height};a>100&&(a=100,r=a*n),r=Math.round(r),a=Math.round(a);const s={width:h.width/3,height:h.height/3};position={top:Math.floor(3*s.height/2)-a/2,left:Math.floor(3*s.width/2)-r/2,width:r,height:a,scale:r/o.width},e.includes("south")?position.top=Math.floor(2*s.height+2*s.height/3)-a/2:e.includes("north")&&(position.top=Math.floor(s.height/3)),e.includes("east")?position.left=Math.floor(2*s.width+2*s.width/3)-r/2:e.includes("west")&&(position.left=Math.floor(s.width/3))}catch(e){log.log_handler("Error while processing watermark position: "+e,"ERROR")}finally{return position}}function setTimer(e){try{setTimeout((()=>{fs.unlink(e,(e=>{if(e)throw new Error}))}),6e5)}catch(t){setTimer(e),log.log_handler("Error while deleting files: "+t,"ERROR")}}module.exports={watermarkImage:watermarkImage,watermarkVideo:watermarkVideo,getImageDimensions:getImageDimensions,getVideoDimensions:getVideoDimensions,calculateWatermarkPosition:calculateWatermarkPosition};