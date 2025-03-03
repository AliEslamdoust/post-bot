// Copyright (c) 2025 Ali Eslamdoust
// MIT License

require("dotenv").config();const db=require("./db"),moment=require("jalali-moment"),fs=require("fs"),path=require("path"),wm=require("./m_wm"),authorization=require("./authorization"),{logger:logger}=require("./log");async function process_queries(a,e,t,r){const i=a.id;let s=i;const n=a.role;let l,c,o=new Array,d="",k=new Object;e.includes("/")&&(c=e.split("/")[1],e=e.split("/")[0]);try{switch(e){case"start":"writer"===n?o=[[{text:"✏️ پست جدید",callback_data:"addNewPost"}],[{text:"✉️ پست های من",callback_data:"myPosts"},{text:"👤 حساب کاربری",callback_data:"profile"}]]:"owner"!==n&&"admin"!==n||(o=[[{text:"👥 مدیریت کاربران",callback_data:"manageUsers"},{text:"⚙️ تنظیمات ربات",callback_data:"settings"}],[{text:"👤 حساب کاربری",callback_data:"profile"}],[{text:"✏️ پست جدید",callback_data:"addNewPost"},{text:"✉️ پست های من",callback_data:"myPosts"}]]),l="💠 صفحه اصلی\n\n🔶 جهت ادامه یکی از گزینه های زیر را انتخاب کنید:";break;case"manageUsers":if("owner"!=n&&"admin"!=n)break;o=[[{text:"➕ افزودن کاربر جدید",callback_data:"addUser"}],[{text:"👥 مشاهده کاربران",callback_data:"seeUsers"}],[{text:"🔙 بازگشت",callback_data:"start"}]],l="👥 مدیریت کاربران:\n\n❔ لطفا از منوی زیر یک گزینه را انتخاب کنید";break;case"addUser":if("owner"!=n&&"admin"!=n)break;l="🔰 لطفا آیدی عددی کاربر مورد نظر را وارد کنید:\n\n❕هر کاربر میتواند آیدی عددی خودش را از ربات زیر دریافت کند:\n@userinfobot\nاز آنها بخواهید تا آیدی خود را از ربات بالا دریافت کرده و برای شما بفرستند",o=[[{text:"🔙 بازگشت",callback_data:"manageUsers"}]],d="getNewUserId";break;case"seeUsers":if("owner"!=n&&"admin"!=n)break;let a=c||1;l=`👥 لیست تمامی کاربران ربات\n\nصفحه ${a}\n\n⁉️ برای راحتی بیشتر میتونید شناسه کاربری کاربر رو بفرستید تا حساب کاربریشون رو مشاهده کنین`;const e=await db.getAllUsers();if(!e.ok)break;const b=sortUsers(e.data);for(let e=20*(a-1);e<=20*a&&e<b.length;e++){let a=b[e].id,t=b[e].role;switch(t){case"owner":t="مالک";break;case"admin":t="مدیر";break;case"writer":t="نویسنده"}const r=[{text:`👤 ${t} - ${a}`,callback_data:`seeUser/${a}`}];e%2==0?o.push(r):o[o.length-1].push(r[0])}const m=Math.ceil(b.length/20),f=[{text:"🔚 صفحه آخر",callback_data:`seeUsers/${m}`}],p=[{text:"🔝 صفحه اول",callback_data:"seeUsers/1"}],_={text:"➡️ صفحه بعد",callback_data:`seeUsers/${a+1}`},g={text:"⬅️ صفحه قبل",callback_data:"seeUsers/"+(a-1)},u={text:"🔙 بازگشت",callback_data:"manageUsers"};1===a&&a!=m?(o.push(f),o.push([_,u])):a===m&&1!=a?(o.push(p),o.push([u,g])):1!=a&&a!=m?(o.push([f[0],p[0]]),o.push([_,u,g])):o.push([u]),d="findUserWithId";break;case"seeUser":if("owner"!=n&&"admin"!=n)break;let w=await db.getUser(c);if(!w.ok)break;let h=await db.getAllUsersPosts(c);if(!h.ok)break;w=w.data,h=sortPosts(h.data);let x=0,$=Date.now()-2592e3;h.forEach((a=>{a.date>$&&x++}));let U=h.data?timestampToJalaliDate(h[0].date):"نامشخص";l=`👤 مشخصات کاربر: \n\n🆔 آیدی عددی:\n    \`${c}\`\nℹ️ نام کاربر:\n${w.name}\n\n📆 تاریخ آخرین پست:\n${U}\n\n#️⃣ تعداد پست های کاربر در ماه اخیر: ${x}\n\n♾️ مجموع تعداد پست های کاربر: ${h.length}`,o=[[{text:"💠 تغییر دسترسی کاربر",callback_data:`changeUserRole/${c}`}],[{text:"📆 فعالیت های کاربر",callback_data:`seeUserActivities/${c}`}],[{text:"🔙 بازگشت",callback_data:"seeUsers"}]],w.role!==n&&"owner"!==w.role||o.shift();break;case"changeUserRole":if("owner"!=n&&"admin"!=n)break;let y=await db.getUser(c);if(!y.ok)break;y=y.data.role,l=`🔱 جهت تغییر سطح دسترسی کاربر از منوی زیر اقدام کنید\n\n❕ سطح فعلی: ${"admin"===y?"مدیر":"نویسنده"}`,"owner"===n?"writer"===y?o=[[{text:"🔺 ارتقا به مدیر",callback_data:`promote/${c}`}],[{text:"🚫 اخراج نویسنده",callback_data:`fire/${c}`}]]:"admin"===y&&(o=[[{text:"🔻 تنزل مقام کاربر",callback_data:`demote/${c}`}]]):"admin"===n&&"writer"===y&&(o=[[{text:"🔺 درخواست ارتقا به مدیر",callback_data:`promoteRequest/${c}`}],[{text:"🚫 اخراج نویسنده",callback_data:`fire/${c}`}]]),o.push([{text:"🔙 بازگشت",callback_data:`seeUser/${c}`}]);break;case"promote":if("owner"!=n)break;let P=await db.getUser(c);if(!P.ok)break;l=`⁉️ آیا از ارتقا "${P.data.name}" به مدیر مطمئن هستید؟`,o=[[{text:"✅ تایید و ارتقای کاربر",callback_data:`roleConfirm/promotion_${c}`}],[{text:"🔙 بازگشت",callback_data:`changeUserRole/${c}`}]];break;case"promoteRequest":if("admin"!=n)break;let v=await db.getUser(c);if(!v.ok)break;l=`⁉️ آیا مایل هستید به مالک ربات یک درخواست برای ارتقای "${v.data.name}" به مدیر ارسال شود؟\nدر صورت تایید مالک ربات، شخص مورد نظر به مدیر ارتقا می یابد`,o=[[{text:"✅ درخواست ارتقای کاربر",callback_data:`roleConfirm/promotionR_${c}`}],[{text:"🔙 بازگشت",callback_data:`changeUserRole/${c}`}]];break;case"demote":if("owner"!=n&&"admin"!=n)break;let S=await db.getUser(c);if(!S.ok)break;l=`⁉️ آیا از تنزل مقام "${S.data.name}" به نویسنده مطمئن هستید؟`,o=[[{text:"✅ تأیید تنزل مقام کاربر",callback_data:`roleConfirm/demotion_${c}`}],[{text:"🔙 بازگشت",callback_data:`changeUserRole/${c}`}]];break;case"fire":if("owner"!=n&&"admin"!=n)break;let q=await db.getUser(c);if(!q.ok)break;l=`⁉️ آیا از اخراج "${q.data.name}" مطمئن هستید؟`,o=[[{text:"✅ تایید و اخراج کاربر",callback_data:`roleConfirm/firing_${c}`}],[{text:"🔙 بازگشت",callback_data:`changeUserRole/${c}`}]];break;case"roleConfirm":if("owner"!=n&&"admin"!=n)break;let A=c.split("_")[1],C=c.split("_")[0];if(o=[[{text:"🔙 بازگشت",callback_data:`seeUser/${A}`}]],"promotion"===C){if(!await db.updateUserRole(A,"admin"))break;l="✅ کاربر مورد نظر با موفقیت به مدیر ارتقا یافت"}else if("demotion"===C){if(!await db.updateUserRole(A,"writer"))break;l="✅ تنزل مقام کاربر با موفقیت انجام شد"}else if("firing"===C){if(!await db.deleteUser(A))break;o=[[{text:"🔙 بازگشت",callback_data:"seeUsers"}]],t.reply('✅ کاربر مورد نظر با موفقیت از ربات اخراج شد\nدر صورت نیاز میتوانید مجددا از قسمت "👥 مدیریت کاربران > ➕ افزودن کاربر جدید" این کاربر را به ربات اضافه کنید',{reply_markup:{inline_keyboard:o}}),s=A,l="❗️ کاربر گرامی، شما توسط یک مدیر مسدود شدید",o=[]}else if("promotionR_"===C){if(!await db.deleteUser(A))break;const a=process.env.OWNER;t.reply("❔ درخواست ارتقای کاربر به مدیر با موفقیت به مالک ربات ارسال شد",{reply_markup:{inline_keyboard:o}}),s=a,l='❔ مدیر "" درخواست ارتقای "" به مدیر را دارد\nدر صورت تایید شما این نویسنده به مدیر ارتقا می یابد\nآیا موافق هستید؟',o=[[{text:"✅ تایید و ارتقا به مدیر",callback_data:`promote/${A}`}],[{text:"❌  رد کردن و بازگشت به منوی اصلی",callback_data:"start"}]]}break;case"seeUserActivities":if("owner"!=n&&"admin"!=n)break;let D=c.split("_")[0],N=c.includes("_")?c.split("_")[1]:1,R=await db.getAllUsersPosts(D);if(!R.ok)break;if(0==R.data.length){l="❗️ این کاربر هیچ پستی ثبت نکرده است",o=[[{text:"🔙 بازگشت",callback_data:`seeUser/${D}`}]];break}let j=sortPosts(R.data);for(let a=20*(N-1);a<=20*N&&a<j.length;a++){const e=[{text:`📅 ${timestampToJalaliDate(j[a].date)}`,callback_data:`seePost/${j[a].id}_${D}`}];a%2==0?o.push(e):o[o.length-1].push(e[0])}const T=Math.ceil(sortPosts.length/20),I=[{text:"🔚 صفحه آخر",callback_data:`seeUserActivities/${D}_${T}`}],W=[{text:"🔝 صفحه اول",callback_data:`seeUserActivities/${D}`}],E={text:"➡️ صفحه بعد",callback_data:`seeUserActivities/${D}_${N+1}`},J={text:"⬅️ صفحه قبل",callback_data:`seeUserActivities/${D}_${N-1}`},M={text:"🔙 بازگشت",callback_data:`seeUser/${D}`};1===N&&N!=T?(o.push(I),o.push([E,M])):N===T&&1!=N?(o.push(W),o.push([M,J])):1!=N&&N!=T?(o.push([I[0],W[0]]),o.push([E,M,J])):o.push([M]),l=`🔆 پست های \`${D}\` به ترتیب از جدیدترین در لیست زیر قابل مشاهده است. با دکمه ها میتوانید لیست را کنترل کنید\n\n❕در هر صفحه 20 پست نمایش داده میشوند\n\nصفحه ${N}`;break;case"seePost":let Y=c.split("_")[1],H=c.split("_")[0];const z=await db.getPost(H);if(!z.ok)break;l=z.data.link,o=[[{text:"🔙 بازگشت",callback_data:`seeUserActivities/${Y}`}]];break;case"settings":if("owner"!=n&&"admin"!=n)break;o=[[{text:"🔹 تغییر واترمارک",callback_data:"changeWtermark"},{text:"🔸 تغییر امضای متنی",callback_data:"changeSignature"}],[{text:"🔰 امضای نویسنده",callback_data:"writersSign"}]],o.push([{text:"🔙 بازگشت",callback_data:"start"}]),l="⚙️ تنظیمات ربات:\n\n❔ لطفا از منوی زیر یک گزینه را انتخاب کنید";break;case"changeWtermark":if("owner"!=n&&"admin"!=n)break;const O=await db.getConfig("isWatermark");if(!O.ok)break;let L=1===O.data.value||"1"===O.data.value;l="⁉️ واترمارک جدید را در فرمت png بفرستید:",o=[L?[{text:"⭕️ خاموش کردن واترمارک",callback_data:"turnoff/isWatermark"}]:[{text:"✅ روشن کردن واترمارک",callback_data:"turnon/isWatermark"}],[{text:"🔙 بازگشت",callback_data:"settings"}]],d="watermark";break;case"changeSignature":if("owner"!=n&&"admin"!=n)break;const V=await db.getConfig("signature");if(!V.ok)break;const F=await db.getConfig("isSign");if(!F.ok)break;l=`✍️ امضای جدید را وارد کنید\n\n❕ امضای فعلی:\n${V.data.value}`,o=[1===F.data.value||"1"===F.data.value?[{text:"⭕️ خاموش کردن امضا",callback_data:"turnoff/isSign"}]:[{text:"✅ روشن کردن امضا",callback_data:"turnon/isSign"}],[{text:"🔙 بازگشت",callback_data:"settings"}]],d="newSign";break;case"turnoff":if("owner"!=n&&"admin"!=n)break;if(!await db.updateConfig(c,!1))break;l=`✅ ${"isWatermark"==c?"واترمارک":"امضا"} با موفقیت غیرفعال شد`,o.push([{text:"🔙 بازگشت",callback_data:"settings"}]);break;case"turnon":if("owner"!=n&&"admin"!=n)break;if(!await db.updateConfig(c,!0))break;l=`✅ ${"isWatermark"==c?"واترمارک":"امضا"} با موفقیت فعال شد`,o.push([{text:"🔙 بازگشت",callback_data:"settings"}]);break;case"writersSign":if("owner"!=n&&"admin"!=n)break;const K=await db.getConfig("writerSign");if(!K.ok)break;l="❓ امضای نویسنده ها فعال شود؟\nاین امضا به صورت زیر قبل از امضای متنی قرار میگیرد:\n\n🖋 نام نویسنده",o=[1===K.data.value||"1"===K.data.value?[{text:"⭕️ خاموش کردن امضا",callback_data:"turnoff/writerSign"}]:[{text:"✅ روشن کردن امضا",callback_data:"turnon/writerSign"}],[{text:"🔙 بازگشت",callback_data:"settings"}]];break;case"profile":if("owner"!=n&&"admin"!=n&&"writer"!=n)break;const B=await db.getUser(i);if(!B.ok)break;let G=B.data.role;"owner"===G?G="مالک ربات":"admin"===G?G="مدیر ربات":" writer"===G&&(G="نویسنده"),l=`📱 حساب کاربری شما\n\n🆔 آیدی عددی شما: \`${B.data.id}\`\nℹ️ نام مستعار شما: ${B.data.name}\n\n🔱 رتبه شما: ${G}`,o=[[{text:"♻️ تغییر نام مستعار",callback_data:"changeName"}],[{text:"🔙 بازگشت",callback_data:"start"}]];break;case"changeName":if("owner"!=n&&"admin"!=n&&"writer"!=n)break;l="❔ لطفا نام مستعار جدید خود را وارد کنید:\n\n🔸 ورودی باید بین 3 تا 32 حرف باشد\n🔹 این نام در هر زمان قابل تغییر است",d="changeName";break;case"myPosts":if("owner"!=n&&"admin"!=n)break;let Q=c||1,X=await db.getAllUsersPosts(i);if(!X.ok)break;if(0==X.data.length){l="❗️ شما هیچ پستی ثبت نکرده اید",o=[[{text:"🔙 بازگشت",callback_data:"start"}]];break}let Z=sortPosts(X.data);for(let a=20*(Q-1);a<=20*Q&&a<Z.length;a++){const e=[{text:`📅 ${timestampToJalaliDate(Z[a].date)}`,callback_data:`seeMyPost/${Z[a].id}`}];a%2==0?o.push(e):o[o.length-1].push(e[0])}const aa=Math.ceil(Z.length/20),ea=[{text:"🔚 صفحه آخر",callback_data:`myPosts/${aa}`}],ta=[{text:"🔝 صفحه اول",callback_data:"myPosts"}],ra={text:"➡️ صفحه بعد",callback_data:`myPosts/${Q+1}`},ia={text:"⬅️ صفحه قبل",callback_data:"myPosts/"+(Q-1)},sa={text:"🔙 بازگشت",callback_data:"start"};1===Q&&Q!=aa?(o.push(ea),o.push([ra,sa])):Q===aa&&1!=Q?(o.push(ta),o.push([sa,ia])):1!=Q&&Q!=aa?(o.push([ea[0],ta[0]]),o.push([ra,sa,ia])):o.push([sa]);let na=0,la=Date.now()-2592e3;Z.forEach((a=>{a.date>la&&na++})),l=`🔆 پست های شما به ترتیب از جدیدترین به قدیمی ترین در لیست زیر قابل مشاهده است. با دکمه ها میتوانید لیست را کنترل کنید\n\n❕در هر صفحه 20 پست نمایش داده میشوند\n\nصفحه ${Q}\n\n✔️  آخرین پست :\n🕐 ${timestampToJalaliDate(Z[0].date)}\n📆 پست های شما در ماه اخیر: ${na}\n♾️ تمام پست های شما: ${Z.length}`;break;case"seeMyPost":let ca=c;const oa=await db.getPost(ca);if(!oa.ok)break;l=oa.data.link,o=[[{text:"🔙 بازگشت",callback_data:"myPosts"}]];break;case"addNewPost":if("owner"!=n&&"admin"!=n&&"writer"!=n)break;l='🖋 شما در حال ایجاد یک پست جدید می باشید\n  \n  ❔ یک پست شامل چه ویژگی هایی میباشد؟\n  📎 می تواند دارای یک عکس یا ویدیو باشد\n  ✏️ معمولا با کپشن همراه است\n  ❕ در صورتی که میخواهید نام مستعار نویسنده در پایین مطلب درج شود باید گزینه "🔰 امضای نویسنده" را در تنظیمات روشن کنید\n  📌 واترمارک و امضای پیام ها در تنظیمات قابل تغییر است\n  \n  ❗️ توجه: نیازی به امضای پیام ها یا چسباندن واترمارک روی عکس و ویدیو ها نیست، این کار به صورت خودکار انجام میشود',o.push([{text:"🔙 لغو و بازگشت",callback_data:"start"}]),d="newPost";break;case"watermarkPosition":let da,ka=c,ba=path.join(__dirname,`./media/${r.media}.${r.filetype}`),ma="jpg"===r.filetype?await wm.getImageDimensions(ba):await wm.getVideoDimensions(ba);if(!ma.ok)break;let fa,pa=await wm.calculateWatermarkPosition(ka,ma);if(!fs.existsSync(ba)){k={mediaType:void 0};break}if("none"===ka?(da=path.join(__dirname,`./media/${r.media}.${r.filetype}`),"jpg"===r.filetype?fa="image":"mp4"===r.filetype&&(fa="video")):("jpg"===r.filetype?(await wm.watermarkImage(r.media,pa,ka),fa="image"):"mp4"===r.filetype&&(await wm.watermarkVideo(r.media,pa),fa="video"),da=path.join(__dirname,`./media/output-${r.media}.${r.filetype}`),r.output="output-"+r.media),!fs.existsSync(da)){k={mediaYype:void 0};break}k={filePath:da,mediaType:fa,confirm:!1},t.reply("⁉️آیا از ارسال پیام زیر در کانال مطمئن هستید؟"),l=r.caption,o=[[{text:"✅ تایید و ارسال",callback_data:"confirmPost_"+r.media}],[{text:"❌ لغو و بازگشت",callback_data:"start_again"}]],await fs.promises.writeFile(path.join(__dirname,`./media/${r.media}.json`),JSON.stringify(r));break;case"confirmPost":if(!await authorization.checkAdminStatus(t,process.env.CHANNEL_ID)){o=[[{text:"🔙 بازگشت",callback_data:"start"}]],l="❌ لطفا ابتدا ربات را مدیر کانال مورد نظر کنید و مجددا امتحان کنید",k={mediaType:"placeholder",confirm:!1};break}const _a=path.join(__dirname,`./media/${r.output}.${r.filetype}`);if(!fs.existsSync(_a)){k={mediaType:void 0};break}let ga="jpg"===r.filetype?"image":"video";l=r.caption,s=process.env.CHANNEL_ID,k={message:{text:"✅ پیام با موفقیت ارسال شد",keyborad:[[{text:"🔙 بازگشت",callback_data:"start"}]],chatId:i},filePath:_a,mediaType:ga,confirm:!0,postId:r.media}}}catch(s){logger.error(`Error while processing ${e} query from ${i}: `+s,{user:a,query:e,ctx:t,customInfo:r})}finally{return{receiversId:s,messageText:l,inlineKeyboard:o,receiver:d,media:k}}}function sortUsers(a){const e={owner:3,admin:2,writer:1};return a.sort(((a,t)=>{const r=e[a.role]||0,i=e[t.role]||0;return r!==i?i-r:a.id-t.id}))}function sortPosts(a){return a.sort(((a,e)=>e.date-a.date))}function timestampToJalaliDate(a){try{const e=moment(a);return e.locale("fa").format("YYYY/MM/DD HH:mm:ss")}catch(a){return logger.error("Error in converting timestamp to a Jalali date: "+a),"نامشخص"}}module.exports={process_queries:process_queries};