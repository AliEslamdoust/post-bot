const moment = require("jalali-moment");
const fs = require("fs");
const path = require("path");

function log_handler(errTxt, type) {
  try {
    fs.appendFile(
      path.join(__dirname, "./log.txt"),
      `${getJalaliDate()} - ${type}: ${errTxt}\n`,
      (err) => {
        if (err) {
          console.error("Error writing to log file:", err);
        }
      }
    );
  } catch (err) {
    console.error("Error in log_handler:", err);
  }
}

function getJalaliDate() {
  return moment().locale("fa").format("YYYY/MM/DD HH:mm:ss");
}

module.exports = { log_handler };
