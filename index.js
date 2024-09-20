const WebSocket = require("ws");
const { OBSWebSocket } = require("obs-websocket-js");
const fs = require("fs");
const xml2js = require("xml2js"); // XML parser
const obs = new OBSWebSocket();
const path = require("path");

const defaultConfig = {
  obs: {
    address: "ws://127.0.0.1:4455",
    password: "your-password-here",
  },
  recording: {
    temporary: true,
    saveAll: false,
  },
};

function Msg(msg, mod) {
  const LPrC = "#00FF00";
  mod.command.message(`<font color="${LPrC}">${msg}</font>`);
}

module.exports = function StartRecording(mod) {
  let inCombat = false;
  let bossDead = false;
  let isRecording = false;
  let bossName = "UnknownBoss";
  let monsterMap = {};
  let dungeonMap = {};
  let currentDungeon = "UnknownDungeon";
  const configPath = __dirname + "/config.json";

  if (!fs.existsSync(configPath)) {
    mod.log("Config file not found. Generating default config...");
    fs.writeFileSync(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      "utf-8"
    );
    mod.log(
      "Default config file created. Please update the config with your OBS settings."
    );
  }
  function getOBSRecordingPath() {
    return obs
      .call("GetRecordDirectory")
      .then((response) => {
        const recordingPath = response?.recordDirectory || "Tera/Temp"; // Default to temp if not found
        return recordingPath;
      })
      .catch((err) => {
        mod.error("Failed to retrieve recording directory:", err);
        return "Tera/Temp"; // Fallback to temp directory in case of error
      });
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const { address, password } = config.obs;

  function showHelp() {
    Msg(
      `
      <font color="#00FFFF">Video Recording Commands:</font><br>
      <font color="#FFD700">/8 video save</font> - Save the last temporary recording.<br>
      <font color="#FFD700">/8 video saveall</font> - Toggle automatic saving of all recordings.<br>
      <font color="#FFD700">/8 video help</font> - Display this help message.<br><br>
      
      <font color="#00FFFF">How it works:</font><br>
      <font color="#FFD700">Temporary Recordings:</font> By default, recordings are stored temporarily in the "Tera/Temp" folder.<br>
      After a run, type <font color="#FFD700">/8 video save</font> to save the recording, or it will be deleted.<br><br>
  
      <font color="#FFD700">Save All Mode:</font> You can toggle this mode with <font color="#FFD700">/8 video saveall</font>.<br>
      If enabled, all recordings will automatically be saved to the appropriate dungeon folder and won't be treated as temporary.<br><br>
      
      <font color="#00FFFF">Current Settings:</font><br>
      <font color="#FFD700">Temporary Recording:</font> ${
        config.recording.temporary ? "Enabled" : "Disabled"
      }<br>
      <font color="#FFD700">Save All:</font> ${
        config.recording.saveAll ? "Enabled" : "Disabled"
      }<br>
    `,
      mod
    );
  }

  function sendErrorToChat(message, err = null) {
    const fullMessage = err
      ? `${message} Error: ${err.message || err}`
      : message;
    mod.command.message(fullMessage);
    mod.error(fullMessage);
  }

  fs.readFile(__dirname + "/monsters.xml", (err, data) => {
    if (err) {
      mod.error("Failed to load monsters.xml:", err);
      return;
    }
    xml2js.parseString(data, (err, result) => {
      if (err) {
        mod.error("Failed to parse monsters.xml:", err);
        return;
      }
      result.Zones.Zone.forEach((zone) => {
        const zoneId = parseInt(zone.$.id, 10);
        const zoneName = zone.$.name;

        dungeonMap[zoneId] = zoneName;

        zone.Monster.forEach((monster) => {
          const monsterId = parseInt(monster.$.id, 10);
          const monsterName = monster.$.name;
          monsterMap[monsterId] = {
            name: monsterName,
            zoneId: zoneId,
          };
        });
      });
    });
  });

  obs
    .connect(address, password, { rpcVersion: 1 })
    .then(() => {
      Msg("Connected to OBS WebSocket successfully.", mod);
    })
    .catch((err) => {
      const errorMessage = `
      Failed to connect to OBS WebSocket. Please check your OBS configuration, WebSocket plugin installation, and the following settings:
      Address: ${address}, Password: ${password || "Not provided"}
      Make sure OBS WebSocket is enabled and the address/password are correct.
    `;
      sendErrorToChat(errorMessage, err);
    });

  function startRecording() {
    if (!isRecording) {
      const folderPath = config.recording.temporary
        ? "Tera/Temp"
        : `Tera/${currentDungeon}`;
      const fileName = config.recording.temporary
        ? "temp_recording"
        : `${bossName}_${mod.game.me.name}_${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}`;

      obs
        .call("SetProfileParameter", {
          parameterCategory: "Output",
          parameterName: "FilenameFormatting",
          parameterValue: `${folderPath}/${fileName}`,
        })
        .then(() => obs.call("StartRecord"))
        .then(() => {
          isRecording = true;
          Msg(`Recording started for ${bossName}!`, mod);
        })
        .catch((err) => mod.error("Failed to start recording:", err));
    }
  }

  mod.command.add("video", (arg) => {
    if (arg === "save") {
      saveLastRun();
    } else if (arg === "saveall") {
      config.recording.saveAll = !config.recording.saveAll;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      Msg(
        `Save all recordings is now ${
          config.recording.saveAll ? "enabled" : "disabled"
        }`,
        mod
      );
    } else if (arg === "help") {
      showHelp();
    } else {
      Msg("Unknown command. Type 'video help' for a list of commands.", mod);
    }
  });

  function saveLastRun() {
    getOBSRecordingPath().then((obsRecordingPath) => {
      const baseFileName = "temp_recording";

      const finalDir = path.join(__dirname, "Tera", currentDungeon);
      const tempRecordingPath = path.join(obsRecordingPath, "Tera", "Temp");
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      console.log(finalDir);

      fs.readdir(tempRecordingPath, (err, files) => {
        if (err) {
          sendErrorToChat("Failed to read OBS recording directory", err);
          return;
        }
        console.log(files);
        const tempFile = files.find((file) => file.startsWith(baseFileName));
        console.log(tempFile);

        if (!tempFile) {
          sendErrorToChat("No temporary recording found to save.");
          return;
        }

        const tempFilePath = path.join(tempRecordingPath, tempFile);
        const extension = path.extname(tempFile);
        const finalFilePath = path.join(
          finalDir,
          `${bossName}_${mod.game.me.name}_${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}${extension}`
        );

        fs.rename(tempFilePath, finalFilePath, (err) => {
          if (err) {
            sendErrorToChat("Failed to save the recording", err);
          } else {
            Msg(
              `Recording saved for ${bossName} with extension ${extension}!`,
              mod
            );
          }
        });
      });
    });
  }

  function stopRecording() {
    if (isRecording) {
      obs
        .call("StopRecord")
        .then(() => {
          isRecording = false;

          if (config.recording.temporary && !config.recording.saveAll) {
            Msg(
              "Last run recorded. Type 'video save' to save the last run.",
              mod
            );
          } else {
            mod.setTimeout(() => {
              saveLastRun();
            }, 3000);

            Msg("Recording stopped and saving.", mod);
          }
        })
        .catch((err) => mod.error("Failed to stop recording:", err));
    }
  }

  mod.hook("S_USER_STATUS", 3, (event) => {
    if (event.status === 1 && !inCombat) {
      inCombat = true;
      startRecording();
    } else if (event.status !== 1 && inCombat) {
      if (bossDead) {
        inCombat = false;
        stopRecording();
      }
    }
  });

  mod.hook("S_BOSS_GAGE_INFO", 3, (event) => {
    if (event.curHp <= 0 && !bossDead) {
      bossDead = true;
      stopRecording();
    } else if (event.curHp > 0) {
      bossName = monsterMap[event.templateId].name || "UnknownBoss";
      currentDungeon = dungeonMap[event.huntingZoneId] || "UnknownDungeon";
    }
  });

  mod.hook("S_LOAD_TOPO", 3, () => {
    if (isRecording) {
      bossDead = false;
      inCombat = false;
      stopRecording();
    }
  });

  mod.hook("S_INSTANCE_ARROW", 4, () => {
    if (isRecording) {
      mod.log("Boss reset detected. Resetting...");
      bossDead = false;
      inCombat = false;
      stopRecording();
    }
  });
};
