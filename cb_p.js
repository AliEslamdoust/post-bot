require("dotenv").config();
const db = require("./db");
const moment = require("jalali-moment");
const log = require("./log");
const fs = require("fs");
const path = require("path");
const wm = require("./m_wm");
const authorization = require("./authorization");

async function process_queries(user, query, ctx, customInfo) {
  const userId = user.id;
  let receiversId = userId;
  const userRole = user.role;
  let inlineKeyboard = new Array();
  let messageText;
  let receiver = "";
  let media = new Object();

  let queryData;
  if (query.includes("/")) {
    queryData = query.split("/")[1];
    query = query.split("/")[0];
  }

  try {
    switch (query) {
      case "start":
        if (userRole === "writer") {
          inlineKeyboard = [
            [{ text: "✏️ پست جدید", callback_data: "addNewPost" }],
            [
              { text: "✉️ پست های من", callback_data: "myPosts" },
              { text: "👤 حساب کاربری", callback_data: "profile" },
            ],
          ];
        } else if (userRole === "owner" || userRole === "admin") {
          inlineKeyboard = [
            [
              { text: "👥 مدیریت کاربران", callback_data: "manageUsers" },
              { text: "⚙️ تنظیمات ربات", callback_data: "settings" },
            ],
            [{ text: "👤 حساب کاربری", callback_data: "profile" }],
            [
              { text: "✏️ پست جدید", callback_data: "addNewPost" },
              { text: "✉️ پست های من", callback_data: "myPosts" },
            ],
          ];
        }
        messageText = `💠 صفحه اصلی\n\n🔶 جهت ادامه یکی از گزینه های زیر را انتخاب کنید:`;
        break;
      case "manageUsers":
        if (userRole != "owner" && userRole != "admin") break;
        inlineKeyboard = [
          [{ text: "➕ افزودن کاربر جدید", callback_data: "addUser" }],
          [{ text: "👥 مشاهده کاربران", callback_data: "seeUsers" }],
          [{ text: "🔙 بازگشت", callback_data: "start" }],
        ];
        messageText = `👥 مدیریت کاربران:\n\n❔ لطفا از منوی زیر یک گزینه را انتخاب کنید`;
        break;

      case "addUser":
        if (userRole != "owner" && userRole != "admin") break;
        messageText = `🔰 لطفا آیدی عددی کاربر مورد نظر را وارد کنید:\n\n❕هر کاربر میتواند آیدی عددی خودش را از ربات زیر دریافت کند:\n@userinfobot\nاز آنها بخواهید تا آیدی خود را از ربات بالا دریافت کرده و برای شما بفرستند`;
        inlineKeyboard = [
          [{ text: "🔙 بازگشت", callback_data: "manageUsers" }],
        ];
        receiver = "getNewUserId";
        break;
      case "seeUsers":
        if (userRole != "owner" && userRole != "admin") break;
        let pageNumber = queryData ? queryData : 1;

        messageText = `👥 لیست تمامی کاربران ربات

صفحه ${pageNumber}

⁉️ برای راحتی بیشتر میتونید شناسه کاربری کاربر رو بفرستید تا حساب کاربریشون رو مشاهده کنین`;

        const allUsers = await db.getAllUsers();

        if (!allUsers.ok) break;

        const sortedUsers = sortUsers(allUsers.data);

        for (
          let i = (pageNumber - 1) * 20;
          i <= 20 * pageNumber && i < sortedUsers.length;
          i++
        ) {
          let usersId = sortedUsers[i].id;
          let usersRole = sortedUsers[i].role;
          switch (usersRole) {
            case "owner":
              usersRole = "مالک";
              break;
            case "admin":
              usersRole = "مدیر";
              break;
            case "writer":
              usersRole = "نویسنده";
              break;
          }

          const newButton = [
            {
              text: `👤 ${usersRole} - ${usersId}`,
              callback_data: `seeUser/${usersId}`,
            },
          ];

          if (i % 2 == 0) {
            inlineKeyboard.push(newButton);
          } else {
            inlineKeyboard[inlineKeyboard.length - 1].push(newButton[0]);
          }
        }

        const lastPage = Math.ceil(sortedUsers.length / 20);
        const lastPageButton = [
          { text: "🔚 صفحه آخر", callback_data: `seeUsers/${lastPage}` },
        ];
        const firstPageButton = [
          { text: "🔝 صفحه اول", callback_data: `seeUsers/1` },
        ];
        const nextPageButton = {
          text: "➡️ صفحه بعد",
          callback_data: `seeUsers/${pageNumber + 1}`,
        };
        const prevPageButton = {
          text: "⬅️ صفحه قبل",
          callback_data: `seeUsers/${pageNumber - 1}`,
        };
        const backButton = { text: "🔙 بازگشت", callback_data: "manageUsers" };

        if (pageNumber === 1 && pageNumber != lastPage) {
          inlineKeyboard.push(lastPageButton);
          inlineKeyboard.push([nextPageButton, backButton]);
        } else if (pageNumber === lastPage && pageNumber != 1) {
          inlineKeyboard.push(firstPageButton);
          inlineKeyboard.push([backButton, prevPageButton]);
        } else if (pageNumber != 1 && pageNumber != lastPage) {
          inlineKeyboard.push([lastPageButton[0], firstPageButton[0]]);
          inlineKeyboard.push([nextPageButton, backButton, prevPageButton]);
        } else {
          inlineKeyboard.push([backButton]);
        }

        receiver = "findUserWithId";
        break;

      case "seeUser":
        if (userRole != "owner" && userRole != "admin") break;
        let selectedUserData = await db.getUser(queryData);
        if (!selectedUserData.ok) break;

        let allPostsByUser = await db.getAllUsersPosts(queryData);
        if (!allPostsByUser.ok) break;

        selectedUserData = selectedUserData.data;
        allPostsByUser = sortPosts(allPostsByUser.data);
        let index = 0;
        let lastMonthTimestamp = Date.now() - 60 * 60 * 24 * 30;

        allPostsByUser.forEach((e) => {
          if (e.date > lastMonthTimestamp) index++;
        });
        let lastPostDate = allPostsByUser.data
          ? timestampToJalaliDate(allPostsByUser[0].date)
          : "نامشخص";

        messageText = `👤 مشخصات کاربر: \n\n🆔 آیدی عددی:
    \`${queryData}\`\nℹ️ نام کاربر:\n${selectedUserData.name}\n\n📆 تاریخ آخرین پست:\n${lastPostDate}\n\n#️⃣ تعداد پست های کاربر در ماه اخیر: ${index}\n\n♾️ مجموع تعداد پست های کاربر: ${allPostsByUser.length}`;

        inlineKeyboard = [
          [
            {
              text: "💠 تغییر دسترسی کاربر",
              callback_data: `changeUserRole/${queryData}`,
            },
          ],
          [
            {
              text: "📆 فعالیت های کاربر",
              callback_data: `seeUserActivities/${queryData}`,
            },
          ],
          [{ text: "🔙 بازگشت", callback_data: "seeUsers" }],
        ];

        if (
          selectedUserData.role === userRole ||
          selectedUserData.role === "owner"
        )
          inlineKeyboard.shift();
        break;
      case "changeUserRole":
        if (userRole != "owner" && userRole != "admin") break;
        let usersCurrentRole = await db.getUser(queryData);
        if (!usersCurrentRole.ok) break;
        usersCurrentRole = usersCurrentRole.data.role;

        let userRoleFa = usersCurrentRole === "admin" ? "مدیر" : "نویسنده";
        messageText = `🔱 جهت تغییر سطح دسترسی کاربر از منوی زیر اقدام کنید\n\n❕ سطح فعلی: ${userRoleFa}`;

        if (userRole === "owner") {
          if (usersCurrentRole === "writer") {
            inlineKeyboard = [
              [
                {
                  text: "🔺 ارتقا به مدیر",
                  callback_data: `promote/${queryData}`,
                },
              ],
              [
                {
                  text: "🚫 اخراج نویسنده",
                  callback_data: `fire/${queryData}`,
                },
              ],
            ];
          } else if (usersCurrentRole === "admin") {
            inlineKeyboard = [
              [
                {
                  text: "🔻 تنزل مقام کاربر",
                  callback_data: `demote/${queryData}`,
                },
              ],
            ];
          }
        } else if (userRole === "admin") {
          if (usersCurrentRole === "writer") {
            inlineKeyboard = [
              [
                {
                  text: "🔺 درخواست ارتقا به مدیر",
                  callback_data: `promoteRequest/${queryData}`,
                },
              ],
              [
                {
                  text: "🚫 اخراج نویسنده",
                  callback_data: `fire/${queryData}`,
                },
              ],
            ];
          }
        }
        inlineKeyboard.push([
          { text: "🔙 بازگشت", callback_data: `seeUser/${queryData}` },
        ]);
        break;
      case "promote":
        if (userRole != "owner") break;
        let promotedUsersData = await db.getUser(queryData);
        if (!promotedUsersData.ok) break;

        messageText = `⁉️ آیا از ارتقا "${promotedUsersData.data.name}" به مدیر مطمئن هستید؟`;

        inlineKeyboard = [
          [
            {
              text: "✅ تایید و ارتقای کاربر",
              callback_data: `roleConfirm/promotion_${queryData}`,
            },
          ],
          [{ text: "🔙 بازگشت", callback_data: `changeUserRole/${queryData}` }],
        ];
        break;
      case "promoteRequest":
        if (userRole != "admin") break;
        let promotingUsersData = await db.getUser(queryData);
        if (!promotingUsersData.ok) break;

        messageText = `⁉️ آیا مایل هستید به مالک ربات یک درخواست برای ارتقای "${promotingUsersData.data.name}" به مدیر ارسال شود؟\nدر صورت تایید مالک ربات، شخص مورد نظر به مدیر ارتقا می یابد`;

        inlineKeyboard = [
          [
            {
              text: "✅ درخواست ارتقای کاربر",
              callback_data: `roleConfirm/promotionR_${queryData}`,
            },
          ],
          [{ text: "🔙 بازگشت", callback_data: `changeUserRole/${queryData}` }],
        ];
        break;
      case "demote":
        if (userRole != "owner" && userRole != "admin") break;
        let demotedUsersData = await db.getUser(queryData);
        if (!demotedUsersData.ok) break;

        messageText = `⁉️ آیا از تنزل مقام "${demotedUsersData.data.name}" به نویسنده مطمئن هستید؟`;

        inlineKeyboard = [
          [
            {
              text: "✅ تأیید تنزل مقام کاربر",
              callback_data: `roleConfirm/demotion_${queryData}`,
            },
          ],
          [{ text: "🔙 بازگشت", callback_data: `changeUserRole/${queryData}` }],
        ];
        break;
      case "fire":
        if (userRole != "owner" && userRole != "admin") break;
        let firedUsersData = await db.getUser(queryData);
        if (!firedUsersData.ok) break;

        messageText = `⁉️ آیا از اخراج "${firedUsersData.data.name}" مطمئن هستید؟`;

        inlineKeyboard = [
          [
            {
              text: "✅ تایید و اخراج کاربر",
              callback_data: `roleConfirm/firing_${queryData}`,
            },
          ],
          [{ text: "🔙 بازگشت", callback_data: `changeUserRole/${queryData}` }],
        ];
        break;
      case "roleConfirm":
        if (userRole != "owner" && userRole != "admin") break;
        let selectedUsersId = queryData.split("_")[1];
        let ongoingAction = queryData.split("_")[0];
        inlineKeyboard = [
          [{ text: "🔙 بازگشت", callback_data: `seeUser/${selectedUsersId}` }],
        ];

        if (ongoingAction === "promotion") {
          let promoteUser = await db.updateUserRole(selectedUsersId, "admin");
          if (!promoteUser) break;

          messageText = "✅ کاربر مورد نظر با موفقیت به مدیر ارتقا یافت";
        } else if (ongoingAction === "demotion") {
          let demoteUser = await db.updateUserRole(selectedUsersId, "writer");
          if (!demoteUser) break;

          messageText = "✅ تنزل مقام کاربر با موفقیت انجام شد";
        } else if (ongoingAction === "firing") {
          let fireUser = await db.deleteUser(selectedUsersId);
          if (!fireUser) break;

          inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: `seeUsers` }]];

          ctx.reply(
            `✅ کاربر مورد نظر با موفقیت از ربات اخراج شد\nدر صورت نیاز میتوانید مجددا از قسمت "👥 مدیریت کاربران > ➕ افزودن کاربر جدید" این کاربر را به ربات اضافه کنید`,
            { reply_markup: { inline_keyboard: inlineKeyboard } }
          );

          receiversId = selectedUsersId;
          messageText = "❗️ کاربر گرامی، شما توسط یک مدیر مسدود شدید";
          inlineKeyboard = [];
        } else if (ongoingAction === "promotionR_") {
          let fireUser = await db.deleteUser(selectedUsersId);
          if (!fireUser) break;

          const owner = process.env.OWNER;

          ctx.reply(
            "❔ درخواست ارتقای کاربر به مدیر با موفقیت به مالک ربات ارسال شد",
            { reply_markup: { inline_keyboard: inlineKeyboard } }
          );

          receiversId = owner;
          messageText = `❔ مدیر "" درخواست ارتقای "" به مدیر را دارد\nدر صورت تایید شما این نویسنده به مدیر ارتقا می یابد\nآیا موافق هستید؟`;
          inlineKeyboard = [
            [
              {
                text: "✅ تایید و ارتقا به مدیر",
                callback_data: `promote/${selectedUsersId}`,
              },
            ],
            [
              {
                text: "❌  رد کردن و بازگشت به منوی اصلی",
                callback_data: "start",
              },
            ],
          ];
        }
        break;
      case "seeUserActivities":
        if (userRole != "owner" && userRole != "admin") break;
        let usersId = queryData.split("_")[0];
        let uaPageNumber = queryData.includes("_")
          ? queryData.split("_")[1]
          : 1;

        let selectedUsersPosts = await db.getAllUsersPosts(usersId);
        if (!selectedUsersPosts.ok) break;
        if (selectedUsersPosts.data.length == 0) {
          messageText = "❗️ این کاربر هیچ پستی ثبت نکرده است";
          inlineKeyboard = [
            [{ text: "🔙 بازگشت", callback_data: `seeUser/${usersId}` }],
          ];

          break;
        }

        let sortedPosts = sortPosts(selectedUsersPosts.data);

        for (
          let i = (uaPageNumber - 1) * 20;
          i <= 20 * uaPageNumber && i < sortedPosts.length;
          i++
        ) {
          let postDate = sortedPosts[i].date;
          let postDateJalali = timestampToJalaliDate(postDate);
          let postId = sortedPosts[i].id;

          const newButton = [
            {
              text: `📅 ${postDateJalali}`,
              callback_data: `seePost/${postId}_${usersId}`,
            },
          ];

          if (i % 2 == 0) {
            inlineKeyboard.push(newButton);
          } else {
            inlineKeyboard[inlineKeyboard.length - 1].push(newButton[0]);
          }
        }

        const uaLastPage = Math.ceil(sortPosts.length / 20);
        const uaLastPageButton = [
          {
            text: "🔚 صفحه آخر",
            callback_data: `seeUserActivities/${usersId}_${uaLastPage}`,
          },
        ];
        const uaFirstPageButton = [
          {
            text: "🔝 صفحه اول",
            callback_data: `seeUserActivities/${usersId}`,
          },
        ];
        const uaNextPageButton = {
          text: "➡️ صفحه بعد",
          callback_data: `seeUserActivities/${usersId}_${uaPageNumber + 1}`,
        };
        const uaPrevPageButton = {
          text: "⬅️ صفحه قبل",
          callback_data: `seeUserActivities/${usersId}_${uaPageNumber - 1}`,
        };
        const uaBackButton = {
          text: "🔙 بازگشت",
          callback_data: `seeUser/${usersId}`,
        };

        if (uaPageNumber === 1 && uaPageNumber != uaLastPage) {
          inlineKeyboard.push(uaLastPageButton);
          inlineKeyboard.push([uaNextPageButton, uaBackButton]);
        } else if (uaPageNumber === uaLastPage && uaPageNumber != 1) {
          inlineKeyboard.push(uaFirstPageButton);
          inlineKeyboard.push([uaBackButton, uaPrevPageButton]);
        } else if (uaPageNumber != 1 && uaPageNumber != uaLastPage) {
          inlineKeyboard.push([uaLastPageButton[0], uaFirstPageButton[0]]);
          inlineKeyboard.push([
            uaNextPageButton,
            uaBackButton,
            uaPrevPageButton,
          ]);
        } else {
          inlineKeyboard.push([uaBackButton]);
        }

        messageText = `🔆 پست های \`${usersId}\` به ترتیب از جدیدترین در لیست زیر قابل مشاهده است. با دکمه ها میتوانید لیست را کنترل کنید

❕در هر صفحه 20 پست نمایش داده میشوند

صفحه ${uaPageNumber}`;
        break;
      case "seePost":
        let writersId = queryData.split("_")[1];
        let postId = queryData.split("_")[0];

        const postData = await db.getPost(postId);
        if (!postData.ok) break;

        messageText = postData.data.link;
        inlineKeyboard = [
          [
            {
              text: "🔙 بازگشت",
              callback_data: `seeUserActivities/${writersId}`,
            },
          ],
        ];
        break;
      case "settings":
        if (userRole != "owner" && userRole != "admin") break;
        inlineKeyboard = [
          [
            { text: "🔹 تغییر واترمارک", callback_data: "changeWtermark" },
            { text: "🔸 تغییر امضای متنی", callback_data: "changeSignature" },
          ],
          [{ text: "🔰 امضای نویسنده", callback_data: "writersSign" }],
        ];

        inlineKeyboard.push([{ text: "🔙 بازگشت", callback_data: "start" }]);
        messageText = `⚙️ تنظیمات ربات:\n\n❔ لطفا از منوی زیر یک گزینه را انتخاب کنید`;
        break;
      case "changeWtermark":
        if (userRole != "owner" && userRole != "admin") break;
        const wmStatus = await db.getConfig("isWatermark");
        if (!wmStatus.ok) break;

        let wmStatusBool =
          wmStatus.data.value === 1 || wmStatus.data.value === "1";

        messageText = "⁉️ واترمارک جدید را در فرمت png بفرستید:";
        inlineKeyboard = [
          wmStatusBool
            ? [
                {
                  text: "⭕️ خاموش کردن واترمارک",
                  callback_data: "turnoff/isWatermark",
                },
              ]
            : [
                {
                  text: "✅ روشن کردن واترمارک",
                  callback_data: "turnon/isWatermark",
                },
              ],
          [{ text: "🔙 بازگشت", callback_data: "settings" }],
        ];
        receiver = "watermark";
        break;
      case "changeSignature":
        if (userRole != "owner" && userRole != "admin") break;
        const prevSign = await db.getConfig("signature");
        if (!prevSign.ok) break;

        const signStatus = await db.getConfig("isSign");
        if (!signStatus.ok) break;

        messageText = `✍️ امضای جدید را وارد کنید

❕ امضای فعلی:
${prevSign.data.value}`;

        let signStatusBool =
          signStatus.data.value === 1 || signStatus.data.value === "1";

        inlineKeyboard = [
          signStatusBool
            ? [
                {
                  text: "⭕️ خاموش کردن امضا",
                  callback_data: "turnoff/isSign",
                },
              ]
            : [
                {
                  text: "✅ روشن کردن امضا",
                  callback_data: "turnon/isSign",
                },
              ],
          [{ text: "🔙 بازگشت", callback_data: "settings" }],
        ];

        receiver = "newSign";
        break;
      case "turnoff":
        if (userRole != "owner" && userRole != "admin") break;
        const turnoffConfig = await db.updateConfig(queryData, false);
        if (!turnoffConfig) break;

        messageText = `✅ ${
          queryData == "isWatermark" ? "واترمارک" : "امضا"
        } با موفقیت غیرفعال شد`;
        inlineKeyboard.push([{ text: "🔙 بازگشت", callback_data: "settings" }]);
        break;
      case "turnon":
        if (userRole != "owner" && userRole != "admin") break;
        const turnonConfig = await db.updateConfig(queryData, true);
        if (!turnonConfig) break;

        messageText = `✅ ${
          queryData == "isWatermark" ? "واترمارک" : "امضا"
        } با موفقیت فعال شد`;
        inlineKeyboard.push([{ text: "🔙 بازگشت", callback_data: "settings" }]);
        break;
      case "writersSign":
        if (userRole != "owner" && userRole != "admin") break;
        const wSignStatus = await db.getConfig("writerSign");
        if (!wSignStatus.ok) break;

        messageText = `❓ امضای نویسنده ها فعال شود؟
این امضا به صورت زیر قبل از امضای متنی قرار میگیرد:

🖋 نام نویسنده`;

        let wSignStatusBool =
          wSignStatus.data.value === 1 || wSignStatus.data.value === "1";

        inlineKeyboard = [
          wSignStatusBool
            ? [
                {
                  text: "⭕️ خاموش کردن امضا",
                  callback_data: "turnoff/writerSign",
                },
              ]
            : [
                {
                  text: "✅ روشن کردن امضا",
                  callback_data: "turnon/writerSign",
                },
              ],
          [{ text: "🔙 بازگشت", callback_data: "settings" }],
        ];
        break;
      case "profile":
        if (userRole != "owner" && userRole != "admin" && userRole != "writer")
          break;
        const userData = await db.getUser(userId);
        if (!userData.ok) break;

        let role = userData.data.role;
        if (role === "owner") role = "مالک ربات";
        else if (role === "admin") role = "مدیر ربات";
        else if (role === " writer") role = "نویسنده";

        messageText = `📱 حساب کاربری شما

🆔 آیدی عددی شما: \`${userData.data.id}\`
ℹ️ نام مستعار شما: ${userData.data.name}

🔱 رتبه شما: ${role}`;

        inlineKeyboard = [
          [{ text: "♻️ تغییر نام مستعار", callback_data: "changeName" }],
          [{ text: "🔙 بازگشت", callback_data: "start" }],
        ];
        break;
      case "changeName":
        if (userRole != "owner" && userRole != "admin" && userRole != "writer")
          break;
        messageText = `❔ لطفا نام مستعار جدید خود را وارد کنید:\n\n🔸 ورودی باید بین 3 تا 32 حرف باشد\n🔹 این نام در هر زمان قابل تغییر است`;

        receiver = "changeName";
        break;
      case "myPosts":
        if (userRole != "owner" && userRole != "admin") break;
        let pPageNumber = queryData ? queryData : 1;

        let myPosts = await db.getAllUsersPosts(userId);
        if (!myPosts.ok) break;
        if (myPosts.data.length == 0) {
          messageText = "❗️ شما هیچ پستی ثبت نکرده اید";
          inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: `start` }]];

          break;
        }

        let mySortedPosts = sortPosts(myPosts.data);

        for (
          let i = (pPageNumber - 1) * 20;
          i <= 20 * pPageNumber && i < mySortedPosts.length;
          i++
        ) {
          let postDate = mySortedPosts[i].date;
          let postDateJalali = timestampToJalaliDate(postDate);
          let postId = mySortedPosts[i].id;

          const newButton = [
            {
              text: `📅 ${postDateJalali}`,
              callback_data: `seeMyPost/${postId}`,
            },
          ];

          if (i % 2 == 0) {
            inlineKeyboard.push(newButton);
          } else {
            inlineKeyboard[inlineKeyboard.length - 1].push(newButton[0]);
          }
        }

        const pLastPage = Math.ceil(mySortedPosts.length / 20);
        const pLastPageButton = [
          {
            text: "🔚 صفحه آخر",
            callback_data: `myPosts/${pLastPage}`,
          },
        ];
        const pFirstPageButton = [
          {
            text: "🔝 صفحه اول",
            callback_data: `myPosts`,
          },
        ];
        const pNextPageButton = {
          text: "➡️ صفحه بعد",
          callback_data: `myPosts/${pPageNumber + 1}`,
        };
        const pPrevPageButton = {
          text: "⬅️ صفحه قبل",
          callback_data: `myPosts/${pPageNumber - 1}`,
        };
        const pBackButton = {
          text: "🔙 بازگشت",
          callback_data: `start`,
        };

        if (pPageNumber === 1 && pPageNumber != pLastPage) {
          inlineKeyboard.push(pLastPageButton);
          inlineKeyboard.push([pNextPageButton, pBackButton]);
        } else if (pPageNumber === pLastPage && pPageNumber != 1) {
          inlineKeyboard.push(pFirstPageButton);
          inlineKeyboard.push([pBackButton, pPrevPageButton]);
        } else if (pPageNumber != 1 && pPageNumber != pLastPage) {
          inlineKeyboard.push([pLastPageButton[0], pFirstPageButton[0]]);
          inlineKeyboard.push([pNextPageButton, pBackButton, pPrevPageButton]);
        } else {
          inlineKeyboard.push([pBackButton]);
        }

        let i = 0;
        let lastMonthsTimestamp = Date.now() - 60 * 60 * 24 * 30;

        mySortedPosts.forEach((e) => {
          if (e.date > lastMonthsTimestamp) i++;
        });
        let postDate = mySortedPosts[0].date;
        let postDateJalali = timestampToJalaliDate(postDate);

        messageText = `🔆 پست های شما به ترتیب از جدیدترین به قدیمی ترین در لیست زیر قابل مشاهده است. با دکمه ها میتوانید لیست را کنترل کنید

❕در هر صفحه 20 پست نمایش داده میشوند

صفحه ${pPageNumber}

✔️  آخرین پست :
🕐 ${postDateJalali}
📆 پست های شما در ماه اخیر: ${i}
♾️ تمام پست های شما: ${mySortedPosts.length}`;
        break;
      case "seeMyPost":
        let myPostId = queryData;

        const myPostData = await db.getPost(myPostId);
        if (!myPostData.ok) break;

        messageText = myPostData.data.link;
        inlineKeyboard = [
          [
            {
              text: "🔙 بازگشت",
              callback_data: `myPosts`,
            },
          ],
        ];
        break;
      case "addNewPost":
        if (userRole != "owner" && userRole != "admin" && userRole != "writer")
          break;

        messageText = `🖋 شما در حال ایجاد یک پست جدید می باشید
  
  ❔ یک پست شامل چه ویژگی هایی میباشد؟
  📎 می تواند دارای یک عکس یا ویدیو باشد
  ✏️ معمولا با کپشن همراه است
  ❕ در صورتی که میخواهید نام مستعار نویسنده در پایین مطلب درج شود باید گزینه "🔰 امضای نویسنده" را در تنظیمات روشن کنید
  📌 واترمارک و امضای پیام ها در تنظیمات قابل تغییر است
  
  ❗️ توجه: نیازی به امضای پیام ها یا چسباندن واترمارک روی عکس و ویدیو ها نیست، این کار به صورت خودکار انجام میشود`;

        inlineKeyboard.push([
          { text: "🔙 لغو و بازگشت", callback_data: "start" },
        ]);

        receiver = "newPost";
        break;
      case "watermarkPosition":
        let watermarkPosition = queryData;
        let mediaPath = path.join(
          __dirname,
          `./media/${customInfo.media}.${customInfo.filetype}`
        );
        let outputMediaPath;

        let mediaSize =
          customInfo.filetype === "jpg"
            ? await wm.getImageDimensions(mediaPath)
            : await wm.getVideoDimensions(mediaPath);
        if (!mediaSize.ok) break;

        let watermarkCoordinate = await wm.calculateWatermarkPosition(
          watermarkPosition,
          mediaSize
        );

        if (!fs.existsSync(mediaPath)) {
          media = { mediaType: undefined };
          break;
        }

        let mediatype;
        if (customInfo.filetype === "jpg") {
          await wm.watermarkImage(
            customInfo.media,
            watermarkCoordinate,
            watermarkPosition
          );
          mediatype = "image";
        } else if (customInfo.filetype === "mp4") {
          await wm.watermarkVideo(customInfo.media, watermarkCoordinate);
          mediatype = "video";
        }

        if (watermarkPosition === "none") {
          outputMediaPath = path.join(
            __dirname,
            `./media/${customInfo.media}.${customInfo.filetype}`
          );
        } else {
          outputMediaPath = path.join(
            __dirname,
            `./media/output-${customInfo.media}.${customInfo.filetype}`
          );
          customInfo.output = "output-" + customInfo.media;
        }

        if (!fs.existsSync(outputMediaPath)) {
          media = { mediaYype: undefined };
          break;
        }

        media = {
          filePath: outputMediaPath,
          mediaType: mediatype,
          confirm: false,
        };
        ctx.reply(`⁉️آیا از ارسال پیام زیر در کانال مطمئن هستید؟`);
        messageText = customInfo.caption;

        inlineKeyboard = [
          [
            {
              text: "✅ تایید و ارسال",
              callback_data: "confirmPost_" + customInfo.media,
            },
          ],
          [{ text: "❌ لغو و بازگشت", callback_data: "start_again" }],
        ];

        await fs.promises.writeFile(
          path.join(__dirname, `./media/${customInfo.media}.json`),
          JSON.stringify(customInfo)
        );
        break;
      case "confirmPost":
        const botIsAdmin = await authorization.checkAdminStatus(
          ctx,
          process.env.CHANNEL_ID
        );

        if (!botIsAdmin) {
          inlineKeyboard = [[{ text: "🔙 بازگشت", callback_data: "start" }]];
          messageText =
            "❌ لطفا ابتدا ربات را مدیر کانال مورد نظر کنید و مجددا امتحان کنید";
          media = { mediaType: "placeholder", confirm: false };
          break;
        }

        const filePath = path.join(
          __dirname,
          `./media/${customInfo.output}.${customInfo.filetype}`
        );

        if (!fs.existsSync(filePath)) {
          media = { mediaType: undefined };
          break;
        }

        let mediaType = customInfo.filetype === "jpg" ? "image" : "video";

        messageText = customInfo.caption;
        receiversId = process.env.CHANNEL_ID;

        let confirmMessage = "✅ پیام با موفقیت ارسال شد";
        media = {
          message: {
            text: confirmMessage,
            keyborad: [[{ text: "🔙 بازگشت", callback_data: "start" }]],
            chatId: userId,
          },
          filePath,
          mediaType,
          confirm: true,
          postId: customInfo.media,
        };
        break;
      default:
        break;
    }
  } catch (err) {
    log.log_handler(
      `Error while processing ${query} query from ${userId}: ` + err,
      "ERROR"
    );
  } finally {
    return {
      receiversId,
      messageText,
      inlineKeyboard,
      receiver,
      media,
    };
  }
}

function sortUsers(users) {
  const roleOrder = {
    owner: 3,
    admin: 2,
    writer: 1,
  };

  return users.sort((a, b) => {
    // Compare roles first
    const roleA = roleOrder[a.role] || 0; // Default to 0 if role is unknown
    const roleB = roleOrder[b.role] || 0;

    if (roleA !== roleB) {
      return roleB - roleA; // Higher role order comes first
    }

    // If roles are the same, compare IDs
    return a.id - b.id; // Smaller ID comes first
  });
}

function sortPosts(userPosts) {
  return userPosts.sort((a, b) => {
    return b.date - a.date;
  });
}

function timestampToJalaliDate(timestamp) {
  try {
    // Create a moment object from the timestamp (milliseconds)
    const jalaliMoment = moment(timestamp);

    // Format the date in Jalali calendar
    const jalaliDate = jalaliMoment.locale("fa").format("YYYY/MM/DD HH:mm:ss"); // Or any other desired format.

    return jalaliDate;
  } catch (err) {
    log.log_handler(
      "Error in converting timestamp to a Jalali date: " + err,
      "ERROR"
    );
    return "نامشخص";
  }
}

module.exports = {
  process_queries,
};
