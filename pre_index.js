const WebSocket = require("ws");
const { OBSWebSocket } = require("obs-websocket-js");
const fs = require("fs");
const xml2js = require("xml2js"); // XML parser
const obs = new OBSWebSocket();

const defaultConfig = {
  obs: {
    address: "ws://127.0.0.1:4455",
    password: "your-password-here",
  },
};

function Msg(msg, mod) {
  const LPrC = "#00FF00";
  mod.command.message(`<font color="${LPrC}">${msg}</font>`);
}

function sendErrorToChat(message, err = null) {
  const fullMessage = err ? `${message} Error: ${err.message || err}` : message;
  mod.command.message(fullMessage);
  mod.error(fullMessage);
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
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const { address, password } = config.obs;

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
      mod.log("Monsters and dungeon data loaded successfully.");
    });
  });

  obs
    .connect(address, password, { rpcVersion: 1 })
    .then(() => {
      mod.log("Connected to OBS WebSocket successfully.");
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
      const username = mod.game.me.name;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const folderPath = `Tera/${currentDungeon}`;
      const fileName = `${bossName}_${username}_${timestamp}`;

      obs
        .call("SetProfileParameter", {
          parameterCategory: "Output",
          parameterName: "FilenameFormatting",
          parameterValue: `${folderPath}/${fileName}`,
        })
        .then(() => obs.call("StartRecord"))
        .then(() => {
          isRecording = true;
          mod.log(`Recording started for ${bossName}`);

          Msg(`Recording started for ${bossName}!`, mod);
        })
        .catch((err) => mod.error("Failed to start recording:", err));
    }
  }

  function stopRecording() {
    if (isRecording) {
      obs
        .call("StopRecord")
        .then(() => {
          isRecording = false;
          mod.log("Recording stopped");

          Msg("Recording stopped.", mod);
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
      mod.log("Instance change detected. Resetting...");
    }
    bossDead = false;
    inCombat = false;
    stopRecording();
  });

  mod.hook("S_INSTANCE_ARROW", 4, () => {
    if (isRecording) {
      mod.log("Boss reset detected. Resetting...");
    }
    bossDead = false;
    inCombat = false;
    stopRecording();
  });
};
