// Copyright (c) 2025 Ali Eslamdoust
// MIT License

const{exec:exec}=require("child_process"),sharp=require("sharp"),{logger:logger}=require("./log"),path=require("path");async function watermarkImage(e,t,r){try{const i=path.join(__dirname,`./media/${e}.jpg`),o=path.join(__dirname,`./media/output-${e}.jpg`),a=path.join(__dirname,"./media/watermark.png"),n=await sharp(a).resize(t.width,t.newHeight).toBuffer();return await sharp(i).composite([{input:n,gravity:r,top:position.top||void 0,left:position.left||void 0}]).toFile(o),setTimer(a),!0}catch(e){return logger.error("Error adding watermark to image:"+e),!1}}async function watermarkVideo(e,t){return new Promise(((r,i)=>{const o=path.join(__dirname,`./media/${e}.mp4`),a=path.join(__dirname,`./media/output-${e}.mp4`),n=`ffmpeg -i "${o}" -i "${path.join(__dirname,"./media/watermark.png")}" -filter_complex "[1]scale=iw*${t.scale||.1}:-1[logo];[0][logo]overlay=${t.left||"main_w-overlay_w-10"}:${t.top||"main_h-overlay_h-10"}" -c:a copy -c:v libx264 "${a}"`;exec(n,((e,t,o)=>{if(e)return logger.error(`FFmpeg error: ${o}`),void i(!1);setTimer(a),r(!0)}))}))}async function getImageDimensions(e){try{const t=await sharp(e).metadata();return{ok:!0,width:t.width,height:t.height}}catch(e){return logger.error("Error getting image dimensions: "+e),{ok:!1}}}async function getVideoDimensions(e){return new Promise(((t,r)=>{exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${e}"`,((e,i,o)=>{if(e)return logger.error(`FFprobe error: ${o}`),void r({ok:!1});try{const e=JSON.parse(i),r={width:e.streams[0].width,height:e.streams[0].height};t({ok:!0,width:r.width,height:r.height})}catch(e){logger.error("Error parsing FFprobe output:",e),r({ok:!1})}}))}))}async function calculateWatermarkPosition(e,t){position={top:10,left:10};try{const r=path.join(__dirname,"./media/watermark.png"),i=await sharp(r).metadata();let o=i.width,a=i.height;const n=o/a,h={width:t.width,height:t.height};a>100&&(a=100,o=a*n),o=Math.round(o),a=Math.round(a);const s={width:h.width/3,height:h.height/3};position={top:Math.floor(3*s.height/2)-a/2,left:Math.floor(3*s.width/2)-o/2,width:o,height:a,scale:o/i.width},e.includes("south")?position.top=Math.floor(2*s.height+2*s.height/3)-a/2:e.includes("north")&&(position.top=Math.floor(s.height/3)),e.includes("east")?position.left=Math.floor(2*s.width+2*s.width/3)-o/2:e.includes("west")&&(position.left=Math.floor(s.width/3))}catch(e){logger.error("Error while processing watermark position: "+e)}finally{return position}}function setTimer(e){try{setTimeout((()=>{fs.unlink(e,(e=>{if(e)throw new Error}))}),6e5)}catch(t){setTimer(e),logger.error("Error while deleting files: "+t)}}module.exports={watermarkImage:watermarkImage,watermarkVideo:watermarkVideo,getImageDimensions:getImageDimensions,getVideoDimensions:getVideoDimensions,calculateWatermarkPosition:calculateWatermarkPosition};