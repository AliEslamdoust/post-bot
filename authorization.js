const log = require("./log");

async function checkAdminStatus(ctx, channelId) {
  try {
    const chatMember = await ctx.telegram.getChatMember(
      channelId,
      ctx.botInfo.id
    );

    if (
      chatMember.status === "administrator" ||
      chatMember.status === "creator"
    ) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    log.log_handler(err, "ERROR");
    return false;
  }
}

module.exports = {
  checkAdminStatus,
};
