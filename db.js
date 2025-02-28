const log = require("./log");
const sqlite = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dirPath = "./db";

try {
  fs.mkdirSync(dirPath, { recursive: true });
  log.log_handler(
    `Directory '${dirPath}' created successfully (or already existed).`,
    "INFO"
  );
} catch (err) {
  if (err.code === "EEXIST") {
    log.log_handler(`Directory '${dirPath}' already exists.`, "INFO");
  } else {
    log.log_handler(`Error creating directory '${dirPath}': ` + err, "ERROR");
  }
}

function connectToDatabase() {
  const dbPath = path.join(__dirname, "./db/file.db");

  const dbExists = fs.existsSync(dbPath);

  const db = new sqlite.Database(dbPath, (err) => {
    if (err) {
      log.log_handler(err, "ERROR");
    } else {
      log.log_handler(
        dbExists ? "Connected to database" : "Created new database",
        "INFO"
      );
      if (!dbExists) {
        createTables(db);
      }
    }
  });

  return db;
}

async function createTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let errorOccurred = false;

      const configTable = () => {
        db.run(
          `CREATE TABLE "config" (
            "key" TEXT,
            "value" TEXT
          )`,
          (err) => {
            if (err) {
              log.log_handler(err, "ERROR");
              errorOccurred = true;
            } else {
              log.log_handler("Config table created", "INFO");
            }
            postsTable();
          }
        );
      };

      const postsTable = () => {
        db.run(
          `CREATE TABLE "posts" (
            "link" TEXT,
            "writer" INTEGER,
            "date" INTEGER,
            "id" TEXT,
            "finished" INTEGER
          )`,
          (err) => {
            if (err) {
              log.log_handler(err, "ERROR");
              errorOccurred = true;
            } else {
              log.log_handler("Posts table created", "INFO");
            }
            usersTable();
          }
        );
      };

      const usersTable = () => {
        db.run(
          `CREATE TABLE "users" (
            "id" INTEGER,
            "role" TEXT,
            "name" TEXT
          )`,
          (err) => {
            if (err) {
              log.log_handler(err, "ERROR");
              errorOccurred = true;
            } else {
              log.log_handler("Users table created", "INFO");
            }
            if (errorOccurred) {
              reject(new Error("One or more tables failed to create."));
            } else {
              createConfigs();
              resolve();
            }
          }
        );
      };

      configTable();
    });
  });
}

function createConfigs() {
  try {
    const config = [
      { key: "signature", value: "" },
      { key: "isSign", value: "0" },
      { key: "isWatermark", value: "0" },
      { key: "writerSign", value: "0" },
    ];

    config.forEach((e) => {
      db.run(
        "INSERT into config (key, value) VALUES (?, ?)",
        [e.key, e.value],
        (err) => {
          if (err) {
            throw new Error(err);
          } else {
            log.log_handler(`Added new config to database: ${e.key}`, "INFO");
          }
        }
      );
    });
  } catch (err) {
    log.log_handler(
      "Error while adding new config to database: " + err,
      "ERROR"
    );
  }
}

const db = connectToDatabase();

async function userExists(userId) {
  try {
    const userStatus = await new Promise((result, reject) => {
      db.get("SELECT 1 FROM users WHERE id = ?", [userId], (err, res) => {
        if (err) {
          reject(err);
        } else {
          result(!!res);
        }
      });
    });

    if (userStatus) {
      return true;
    }
  } catch (err) {
    log.log_handler(
      "Error while getting user data from database: " + err,
      "ERROR"
    );
    return false;
  }
}

async function getUser(userId) {
  try {
    const user = await new Promise((result, reject) => {
      db.get("SELECT * FROM users WHERE id = ?", [userId], (err, res) => {
        if (err) {
          reject(err);
        } else {
          result(res);
        }
      });
    });

    return { ok: true, data: user };
  } catch (err) {
    log.log_handler(
      "Error while getting user data from database: " + err,
      "ERROR"
    );
    return { ok: false, data: null };
  }
}

async function getPost(postid) {
  try {
    const post = await new Promise((result, reject) => {
      db.get("SELECT * FROM posts WHERE id = ?", [postid], (err, res) => {
        if (err) {
          reject(err);
        } else {
          result(res);
        }
      });
    });

    return { ok: true, data: post };
  } catch (err) {
    log.log_handler(
      "Error while getting post data from database: " + err,
      "ERROR"
    );
    return { ok: false, data: null };
  }
}

async function getAllUsers() {
  try {
    const users = await new Promise((result, reject) => {
      db.all("SELECT * FROM users", [], (err, res) => {
        if (err) {
          reject(err);
        } else {
          result(res);
        }
      });
    });

    return { ok: true, data: users };
  } catch (err) {
    log.log_handler(
      "Error while getting users data from database: " + err,
      "ERROR"
    );
    return { ok: false, data: null };
  }
}

async function getAllUsersPosts(userId) {
  try {
    const users = await new Promise((result, reject) => {
      db.all(
        "SELECT * FROM posts where writer = ? AND finished = 1",
        [userId],
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            result(res);
          }
        }
      );
    });

    return { ok: true, data: users };
  } catch (err) {
    log.log_handler(
      "Error while getting users data from database: " + err,
      "ERROR"
    );
    return { ok: false, data: null };
  }
}

async function addUser(userId, role) {
  try {
    role = !role ? "writer" : role;

    await new Promise((result, reject) => {
      db.run(
        "INSERT into users (id, role) VALUES (?, ?)",
        [userId, role],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler("Error while adding new user to database: " + err, "ERROR");
    return false;
  }
}

async function createPost(userId, postId) {
  try {
    await new Promise((result, reject) => {
      db.run(
        "INSERT into posts (writer, id, date, finished) VALUES (?, ?, ?, 0)",
        [userId, postId, Date.now()],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler("Error creating a new post in database: " + err, "ERROR");
    return false;
  }
}

async function updatePostStats(postId, link) {
  try {
    await new Promise((result, reject) => {
      db.run(
        "UPDATE posts SET link = ?, finished = 1  WHERE id = ?",
        [link, postId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler(
      "Error while changing post status in database: " + err,
      "ERROR"
    );
    return false;
  }
}

async function updateUserRole(userId, newRole) {
  try {
    await new Promise((result, reject) => {
      db.run(
        "UPDATE users SET role = ? WHERE id = ?",
        [newRole, userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler("Error while changing users role: " + err, "ERROR");
    return false;
  }
}

async function deleteUser(userId) {
  try {
    await new Promise((result, reject) => {
      db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          result();
        }
      });
    });

    return true;
  } catch (err) {
    log.log_handler(
      "Error while deleting a user from database: " + err,
      "ERROR"
    );
    return false;
  }
}

async function getConfig(key) {
  try {
    const sign = await new Promise((result, reject) => {
      db.get("SELECT * FROM config WHERE key = ?", [key], (err, res) => {
        if (err) {
          reject(err);
        } else {
          result(res);
        }
      });
    });

    return { ok: true, data: sign };
  } catch (err) {
    log.log_handler(
      "Error while getting config value from database: " + err,
      "ERROR"
    );
    return { ok: false, data: null };
  }
}

async function updateConfig(key, value) {
  try {
    await new Promise((result, reject) => {
      db.run(
        "UPDATE config SET value = ? WHERE key = ?",
        [value, key],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler("Error while changing config: " + err, "ERROR");
    return false;
  }
}

async function updateUsersName(newName, userId) {
  try {
    await new Promise((result, reject) => {
      db.run(
        "UPDATE users SET name = ? WHERE id = ?",
        [newName, userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            result();
          }
        }
      );
    });

    return true;
  } catch (err) {
    log.log_handler("Error while changing users name: " + err, "ERROR");
    return false;
  }
}

module.exports = {
  userExists,
  getUser,
  getPost,
  addUser,
  getAllUsers,
  getAllUsersPosts,
  updateUserRole,
  deleteUser,
  getConfig,
  updateConfig,
  updateUsersName,
  createPost,
  updatePostStats,
};
