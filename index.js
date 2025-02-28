require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const log = require("./log");
const db = require("./db");
const authorization = require("./authorization");
const pq = require("./cb_p");
const axios = require("axios");
const mime = require("mime-types");

let localVariable = new Object();
const bot_token = process.env.BOT_TOKEN;
const bot = new Telegraf(bot_token);

bot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  localVariable[userId] = localVariable[userId]
    ? localVariable[userId]
    : new Object();

  const userExists = await db.userExists(userId);
  if (userExists) {
    next();
  } else if (!userExists && userId == process.env.OWNER) {
    await db.addUser(userId, "owner");
    next();
  }
});

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  const userData = await db.getUser(userId);
  if (!userData.ok) return;
  const processedQuery = await pq.process_queries(userData.data, "start", ctx);

  sendMessage(
    processedQuery.receiversId,
    processedQuery.messageText,
    processedQuery.inlineKeyboard
  );

  localVariable[userId].receiver = "";
});

bot.on("callback_query", async (ctx) => {
  const userId = ctx.from.id;
  const userData = await db.getUser(userId);
  if (!userData.ok) return;
  const query = ctx.update.callback_query.data;
  const messageId = ctx.msgId;
  let processedQuery;

  if (query === "start_again") {
    bot.telegram.deleteMessage(userId, messageId);

    processedQuery = await pq.process_queries(userData.data, "start", ctx);

    sendMessage(
      userId,
      processedQuery.messageText,
      processedQuery.inlineKeyboard
    );
  } else if (
    query.includes("watermarkPosition") ||
    query.includes("confirmPost")
  ) {
    const datafilePath = path.join(
      __dirname,
      `./media/${query.split("_")[1]}.json`
    );

    let options = JSON.parse(await fs.promises.readFile(datafilePath));

    let newQuery = query.split("_")[0];
    processedQuery = await pq.process_queries(
      userData.data,
      newQuery,
      ctx,
      options
    );

    if (!processedQuery.media.mediaType) {
      bot.telegram.deleteMessage(userId, messageId);

      sendMessage(
        userId,
        "❌ این پست به دلیل گذشتن از زمان مجاز از سرور حذف شده است. لطفا مجددا اقدام کنید",
        [[{ text: "🔙 بازگشت", callback_data: "start" }]]
      );
      return;
    } else if (
      processedQuery.media.mediaType &&
      !processedQuery.media.confirm
    ) {
      sendMessage(
        userId,
        processedQuery.messageText,
        processedQuery.inlineKeyboard
      );
    }

    sendMessage(
      processedQuery.receiversId,
      processedQuery.messageText,
      processedQuery.inlineKeyboard,
      undefined,
      false,
      true,
      processedQuery.media
    );
  } else {
    processedQuery = await pq.process_queries(userData.data, query, ctx);

    sendMessage(
      processedQuery.receiversId,
      processedQuery.messageText,
      processedQuery.inlineKeyboard,
      messageId,
      true
    );
  }

  localVariable[userId].receiver = processedQuery.receiver;
});

bot.on("message", async (ctx) => {
  const userId = ctx.from.id;
  let clearreceiver = true;
  let userMessage = ctx.message.text;
  let messageText, inlineKeyboard;

  try {
    switch (localVariable[userId].receiver) {
      case "getNewUserId":
        inlineKeyboard = [
          [{ text: "🔙 بازگشت", callback_data: "manageUsers" }],
        ];

        if (isNaN(userMessage)) {
          clearreceiver = false;
          messageText = `❌ آیدی عددی باید تنها متشکل از اعداد باشد. لطفا آیدی صحیح را مجددا وارد کنید\n\n❗️ دقت کنید که عدد باید به انگلیسی وارد شود`;

          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        const addedNewUser = await db.addUser(userMessage);
        if (!addedNewUser) {
          messageText =
            "❌ مشکلی پیش آمده است. لطفا آیدی عددی را دوباره وارد کنید";
          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        messageText = `✅ کاربر جدید با موفقیت اضافه شد\n\n❔ جهت تغییر سطح دسترسی کاربر میتوانید با مراجعه به پروفایل ایشان، دسترسی را تغییر دهید`;
        sendMessage(userId, messageText, inlineKeyboard);
        break;
      case "findUserWithId":
        if (isNaN(userMessage)) {
          messageText = `❌ آیدی عددی وارد شده اشتباه میباشد`;
          inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: "seeUsers" }]];
          break;
        }

        const selectedUserExists = await db.userExists(userMessage);
        if (!selectedUserExists) {
          messageText = `❌ کاربر مورد نظر در ربات عضو نمی باشد\nلطفا جهت اضافه کردن کاربر به ربات از بخش "👥 مدیریت کاربران > ➕ افزودن کاربر جدید" اقدام کنید`;
          inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: "seeUsers" }]];
          break;
        }

        const getUserRole = await db.getUser(userId);
        if (!getUserRole.ok) break;

        const processUser = await pq.process_queries(
          { id: userId, role: getUserRole.data.role },
          `seeUser/${userMessage}`,
          ctx
        );

        sendMessage(
          processUser.receiversId,
          processUser.messageText,
          processUser.inlineKeyboard
        );
        break;
      case "newSign":
        inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: "settings" }]];
        if (typeof userMessage != "string") {
          messageText =
            "❌ ورودی اشتباه است. یک متن کوتاه برای امضای پیام ها وارد کنید:";

          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        const changeSignature = await db.updateConfig("signature", userMessage);
        if (!changeSignature) {
          messageText = "❌ مشکلی پیش آمد. لطفا دوباره تلاش کنید";

          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        messageText = "✅ امضای جدید با موفقیت تنظیم شد";

        sendMessage(userId, messageText, inlineKeyboard);
        break;
      case "changeName":
        inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: "profile" }]];
        if (
          typeof userMessage != "string" ||
          userMessage.length < 3 ||
          userMessage.length > 32
        ) {
          messageText = "❌ ورودی باید کلمه ای به طول 3 تا 32 حرف باشد";

          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        const changeName = await db.updateUsersName(userMessage, userId);
        if (!changeName) {
          messageText = "❌ مشکلی پیش آمد. لطفا دوباره تلاش کنید";

          sendMessage(userId, messageText, inlineKeyboard);
          return;
        }

        messageText = "✅ نام جدید با موفقیت تنظیم شد";

        sendMessage(userId, messageText, inlineKeyboard);
        break;
      case "watermark":
        try {
          const fileLink = await ctx.telegram.getFileLink(
            ctx.message.document.file_id
          );
          const response = await axios.get(fileLink, {
            responseType: "arraybuffer",
          });
          const buffer = Buffer.from(response.data);

          const mimeType = mime.lookup(ctx.message.document.file_name); // استخراج MIME type از نام فایل
          if (mimeType === "image/png") {
            const fileName = `./media/watermark.png`;
            const filePath = path.join(__dirname, fileName);

            await fs.promises.writeFile(filePath, buffer);
            log.log_handler(
              `new watermark PNG file saved: ${fileName}`,
              "INFO"
            );

            messageText = "✅ واترمارک جدید با موفقیت تنظیم شد";
          } else {
            messageText =
              "❗️ مشکلی در تجزیه تصویر پیش آمد. لطفا مجددا امتحان کنید";
          }
        } catch (error) {
          log.log_handler("Error processing media: " + error, "ERROR");
          messageText =
            "❗️ مشکلی در تجزیه تصویر پیش آمد. لطفا مجددا امتحان کنید";
        } finally {
          inlineKeyboard = [[{ text: " بازگشت", callback_data: "settings" }]];
          sendMessage(userId, messageText, inlineKeyboard);
        }
        break;
      case "newPost":
        const message = ctx.message;

        inlineKeyboard = [
          [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "start" }],
        ];
        try {
          const newName = uuidv4();
          await db.createPost(userId, newName);

          messageText = `🌅 لطفا محل قرارگیری واترمارک را مشخص کنید:\nجهت رد کردن این قسمت گزینه "⭕️ واترمارک نزن" را انتخاب کنید`;

          inlineKeyboard = [
            [
              {
                text: "↖️",
                callback_data: "watermarkPosition/northwest_" + newName,
              },
              {
                text: "⬆️",
                callback_data: "watermarkPosition/north_" + newName,
              },
              {
                text: "↗️",
                callback_data: "watermarkPosition/northeast_" + newName,
              },
            ],
            [
              {
                text: "⬅️",
                callback_data: "watermarkPosition/west_" + newName,
              },
              {
                text: "⏺️",
                callback_data: "watermarkPosition/center_" + newName,
              },
              {
                text: "➡️",
                callback_data: "watermarkPosition/east_" + newName,
              },
            ],
            [
              {
                text: "↙️",
                callback_data: "watermarkPosition/southwest_" + newName,
              },
              {
                text: "⬇️",
                callback_data: "watermarkPosition/south_" + newName,
              },
              {
                text: "↘️",
                callback_data: "watermarkPosition/southeast_" + newName,
              },
            ],
            [
              {
                text: "⭕️ واترمارک نزن",
                callback_data: "watermarkPosition/none_" + newName,
              },
            ],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "start" }],
          ];

          if (message.video) {
            const fileId = message.video.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await axios.get(fileLink, {
              responseType: "arraybuffer",
            });
            const buffer = Buffer.from(response.data);
            const fileName = `./media/${newName}.mp4`;
            const filePath = path.join(__dirname, fileName);

            await fs.promises.writeFile(filePath, buffer);
            let options = {
              caption: "",
              media: newName,
              filetype: "mp4",
              created: Date.now(),
              output: newName,
            };

            setTimer(filePath);

            let signCaption = await signMessages(message.caption, userId);
            if (!signCaption.ok) break;

            options.caption = signCaption.data;

            const datafilePath = path.join(
              __dirname,
              `./media/${newName}.json`
            );
            const data = JSON.stringify(options);
            await fs.promises.writeFile(datafilePath, data);

            setTimer(datafilePath);

            const watermarkVideo = await db.getConfig("isWatermark");
            if (!watermarkVideo.ok) break;

            let watermarkVideoBool =
              watermarkVideo.data.value === 1 ||
              watermarkVideo.data.value === "1";

            if (!watermarkVideoBool) {
              let procesVideo = await pq.process_queries(
                userId,
                "watermarkPosition/none_" + newName,
                ctx,
                options
              );

              sendMessage(
                userId,
                procesVideo.messageText,
                procesVideo.inlineKeyboard
              );
              break;
            }

            sendMessage(userId, messageText, inlineKeyboard, options);
          } else if (message.photo) {
            const photoArray = message.photo;
            const largestPhoto = photoArray[photoArray.length - 1]; // Get largest resolution
            const fileId = largestPhoto.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await axios.get(fileLink, {
              responseType: "arraybuffer",
            });
            const buffer = Buffer.from(response.data);

            const fileName = `./media/${newName}.jpg`;
            const filePath = path.join(__dirname, fileName);

            await fs.promises.writeFile(filePath, buffer);
            let options = {
              caption: "",
              media: newName,
              filetype: "jpg",
              created: Date.now(),
              output: newName,
            };

            setTimer(filePath);

            let signCaption = await signMessages(message.caption, userId);
            if (!signCaption.ok) break;

            options.caption = signCaption.data;

            const datafilePath = path.join(
              __dirname,
              `./media/${newName}.json`
            );
            const data = JSON.stringify(options);
            await fs.promises.writeFile(datafilePath, data);

            setTimer(datafilePath);

            const watermarkPhoto = await db.getConfig("isWatermark");
            if (!watermarkPhoto.ok) break;

            let watermarkPhotoBool =
              watermarkPhoto.data.value === 1 ||
              watermarkPhoto.data.value === "1";

            if (!watermarkPhotoBool) {
              let procesPhoto = await pq.process_queries(
                userId,
                "watermarkPosition/none",
                ctx,
                options
              );

              sendMessage(
                userId,
                procesPhoto.messageText,
                procesPhoto.inlineKeyboard
              );
              break;
            }

            sendMessage(userId, messageText, inlineKeyboard);
          } else if (message.text) {
            let signMessage = await signMessages(userMessage, userId);
            if (!signMessage.ok) break;

            messageText = signMessage.data;
            ctx.reply(`⁉️آیا از ارسال پیام زیر در کانال مطمئن هستید؟`);

            inlineKeyboard = [
              [{ text: "✅ تایید و ارسال", callback_data: "confirmPost/text" }],
              [
                {
                  text: "🔙 بازگشت به منوی اصلی",
                  callback_data: "start_again",
                },
              ],
            ];
            sendMessage(userId, messageText, inlineKeyboard);
          }
        } catch (error) {
          inlineKeyboard = [
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "start" }],
          ];
          log.log_handler(
            "Error in handling new posts data: " + error,
            "ERROR"
          );
          messageText = "❗️ مشکلی پیش آمد. لطفا مجددا امتحان کنید";
          sendMessage(userId, messageText, inlineKeyboard);
        }
        break;
      default:
        break;
    }
  } catch (err) {
    log.log_handler("Error in reading user input:" + error, "ERROR");
  }

  if (clearreceiver) localVariable[userId].receiver = "";
});

// a function to send messages to user or edit already sent messages
async function sendMessage(
  userId,
  messageText,
  inlineKeyboard,
  messageId,
  editing,
  isMedia,
  media
) {
  try {
    messageText = messageText.replace(/[-()\.=-_\[\]\{\}\<\>\#\+\|]/g, "\\$&");

    if (editing && !isMedia) {
      await bot.telegram.editMessageText(
        userId,
        messageId,
        undefined,
        messageText,
        {
          reply_markup: { inline_keyboard: inlineKeyboard },
          parse_mode: "MarkdownV2",
        }
      );
    } else if (!editing && !isMedia) {
      await bot.telegram.sendMessage(userId, messageText, {
        reply_markup: { inline_keyboard: inlineKeyboard },
        parse_mode: "MarkdownV2",
      });
    } else if (!editing && isMedia) {
      if (media.mediaType === "image") {
        const sentMessage = await bot.telegram.sendPhoto(
          userId,
          { source: media.filePath },
          {
            caption: messageText,
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: "MarkdownV2",
          }
        );

        if (media.confirm) {
          const cleanChannelId = String(userId).replace("-100", "");
          const messageId = sentMessage.message_id;
          const messageLink = `https://t.me/c/${cleanChannelId}/${messageId}`;
          await db.updatePostStats(media.postId, messageLink);

          await bot.telegram.sendMessage(
            media.message.chatId,
            media.message.text + `:\n${messageLink}`,
            {
              reply_markup: { inline_keyboard: media.message.keyboard },
              parse_mode: "MarkdownV2",
            }
          );
        }
      } else if (media.mediaType === "video") {
        const sentMessage = await bot.telegram.sendVideo(
          userId,
          { source: media.filePath },
          {
            caption: messageText,
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: "MarkdownV2",
          }
        );

        if (media.confirm) {
          const cleanChannelId = String(userId).replace("-100", "");
          const messageId = sentMessage.message_id;
          const messageLink = `https://t.me/c/${cleanChannelId}/${messageId}`;
          await db.updatePostStats(media.postId, messageLink);

          await bot.telegram.sendMessage(
            media.message.chatId,
            media.message.text + `:\n${messageLink}`,
            {
              reply_markup: { inline_keyboard: media.message.keyborad },
              parse_mode: "MarkdownV2",
            }
          );
        }
      }
    }
  } catch (err) {
    log.log_handler("Error while sending a message: " + err, "ERROR");
  }
}

async function signMessages(inputMessage, userId) {
  let isSuccess = true;
  let messageText;

  try {
    inputMessage = inputMessage ? inputMessage : "";
    const useMainSignature = await db.getConfig("isSign");
    if (!useMainSignature.ok) throw new Error();

    let useMainSignatureBool =
      useMainSignature.data.value === 1 || useMainSignature.data.value === "1";

    if (!useMainSignatureBool) {
      return { ok: isSuccess, data: inputMessage };
    }

    const useWriterSignature = await db.getConfig("writerSign");
    if (!useWriterSignature.ok) throw new Error();

    let useWriterSignatureBool =
      useWriterSignature.data.value === 1 ||
      useWriterSignature.data.value === "1";

    let signature = "";

    if (useWriterSignatureBool) {
      const writerData = await db.getUser(userId);
      if (!writerData.ok) throw new Error();

      signature = `\n\n🖋 ${writerData.data.name}\n`;
    } else {
      signature = "\n\n";
    }

    const mainSignature = await db.getConfig("signature");
    if (!mainSignature.ok) throw new Error();

    signature += mainSignature.data.value;

    messageText = inputMessage + signature;
  } catch (err) {
    log.log_handler("Error while signing messages: " + err, "ERROR");
    isSuccess = false;
  } finally {
    return { ok: isSuccess, data: messageText };
  }
}

function setTimer(filePath) {
  try {
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) {
          throw new Error();
        }
      });
    }, 600000);
  } catch (err) {
    setTimer(filePath);
    log.log_handler("Error while deleting files: " + err, "ERROR");
  }
}

bot.command("checkadmin", async (ctx) => {
  const channelId = ctx.text.replace("/checkadmin ", "@");
  const isAdmin = await authorization.checkAdminStatus(ctx, channelId);

  if (isAdmin) {
    ctx.reply("The bot is an admin in the channel.");
  } else {
    ctx.reply("The bot is NOT an admin in the channel.");
  }
});

bot
  .launch()
  .then(console.log("Bot started successfully!"))
  .catch((error) => {
    console.error("Error starting the bot:", error);
  });
