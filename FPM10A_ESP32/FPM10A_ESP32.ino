#include <WiFi.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "Adafruit_Fingerprint.h"
#include <LiquidCrystal_I2C.h>
#include <WebServer.h>
#include <Preferences.h>

// line 1 for title
// line 2 for wifi info
// line 3 for updates
// line 4 for ip address

/*
 * Storage & matching model
 * ------------------------
 * - All fingerprint templates live ONLY in the server's PostgreSQL database.
 * - The sensor's flash library is kept empty (emptyDatabase() at boot).
 * - The ESP32 downloads the templates from /api/templates into its RAM.
 * - On every scan, each template is pushed into the sensor's RAM buffer 2 and
 *   the sensor's own matching algorithm (PS_Match, 0x03) compares it with the
 *   live scan in buffer 1. This is the same accurate algorithm the sensor used
 *   before, but nothing is ever written to the sensor's flash.
 */

Preferences prefs;
WebServer server(80);
LiquidCrystal_I2C lcd(0x27, 20, 4);
bool sensorFound = false;
String wifi_ssid = "";
String wifi_password = "";
const char *ap_ssid = "AHSAN";
const char *ap_pass = "12345678";

const bool isServer = false;
const char *host = isServer ? "https://" : "http://";
const char *serverIp = "192.168.0.106";
const int serverPort = 3000;
const int deviceID = 1;

HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// ---------- Template cache (RAM only) ----------
#define TEMPLATE_SIZE 512
#define MAX_TEMPLATES 150            // ~77 KB of RAM
#define MIN_MATCH_SCORE 50           // extra safety floor on top of the sensor's own decision
#define TEMPLATE_SYNC_INTERVAL 30000 // ms

struct CachedTemplate {
  int userId;
  uint8_t data[TEMPLATE_SIZE];
};
CachedTemplate *tplCache = nullptr;
int tplCount = 0;
String tplVersion = "";
unsigned long lastTplSync = 0;
uint16_t fpPacketLen = 128; // read from the sensor in setup()

String prevLine[4] = { "", "", "", "" };

void disp(int line, String t) {
  String text = t.substring(0, min((size_t)20, t.length()));

  if (line < 0 || line > 3)
    return;
  if (prevLine[line] == text)
    return;

  prevLine[line] = text;

  lcd.backlight();
  lcd.setCursor(0, line);
  int len = text.length();
  for (int i = 0; i < len; i++) {
    lcd.print(text[i]);
    if (text[i] != '\0') {
      delay(5);
    }
  }
  for (int i = len; i < 20; i++) {
    lcd.print(" ");
  }
}

String apiUrl(const char *path) {
  return String(host) + serverIp + ":" + serverPort + path;
}

void beginHttp(HTTPClient &http, WiFiClientSecure &client, const String &url) {
  if (isServer) {
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
}

void handleRoot() {
  String page = R"(<!DOCTYPE html><html><head><meta charset='UTF-8'><title>WiFi Config</title></head><body><h2>Update WiFi</h2><form method='POST' action='/save'>SSID: <input type='text' name='ssid' value=')";
  page += wifi_ssid;
  page += R"('><br>Password: <input type='text' name='pass' value=')";
  page += wifi_password;
  page += R"('><br><input type='submit' value='Save'></form><br><a href="/reboot">Reboot</a></body></html>)";

  server.send(200, "text/html", page);

  disp(2, "Settings Opened!");
  delay(1000);
  disp(2, "");
}

void handleSave() {
  if (server.hasArg("ssid") && server.hasArg("pass")) {
    wifi_ssid = server.arg("ssid");
    wifi_password = server.arg("pass");
    prefs.putString("ssid", wifi_ssid);
    prefs.putString("pass", wifi_password);
    server.send(200, "text/html", "<h3>Saved! ESP will reboot to apply new WiFi.</h3>");
    disp(0, "        FAS        ");
    disp(1, "New WiFi Saved");
    disp(2, "Rebooting for Reload");
    disp(3, " Programmed by AHSAN");
    delay(2000);
    ESP.restart();
  }
}

void handleReboot() {
  server.sendHeader("Refresh", "2; URL=/");
  server.send(200, "text/html", "<h3>ESP will reboot.</h3>");
  disp(0, "        FAS        ");
  disp(1, "Restarting");
  disp(2, "Rebooting for Reload");
  disp(3, " Programmed by AHSAN");
  delay(2000);
  ESP.restart();
}

// =====================================================================
//  Low-level FPM10A / Synochip UART protocol helpers
//  Packet: EF 01 | addr(4) | PID | LEN(2) | payload | checksum(2)
// =====================================================================
#define FP_PID_CMD 0x01
#define FP_PID_DATA 0x02
#define FP_PID_ACK 0x07
#define FP_PID_END 0x08

void fpFlush() {
  while (fingerSerial.available()) fingerSerial.read();
}

void fpWritePacket(uint8_t pid, const uint8_t *payload, uint16_t len) {
  uint16_t pktLen = len + 2;
  uint8_t hdr[9] = { 0xEF, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, pid, (uint8_t)(pktLen >> 8), (uint8_t)(pktLen & 0xFF) };
  uint16_t sum = pid + (pktLen >> 8) + (pktLen & 0xFF);
  for (uint16_t i = 0; i < len; i++) sum += payload[i];
  fingerSerial.write(hdr, 9);
  fingerSerial.write(payload, len);
  fingerSerial.write((uint8_t)(sum >> 8));
  fingerSerial.write((uint8_t)(sum & 0xFF));
}

// Reads one packet. Returns payload length, -1 on timeout/format error, -2 on checksum error.
int fpReadPacket(uint8_t &pid, uint8_t *payload, uint16_t maxLen, uint32_t timeoutMs) {
  uint32_t start = millis();
  uint8_t hdr[9];
  int idx = 0;

  // Sync on EF 01 and read the 9-byte header
  while (idx < 9 && millis() - start < timeoutMs) {
    if (!fingerSerial.available()) continue;
    uint8_t b = fingerSerial.read();
    if (idx == 0) {
      if (b == 0xEF) hdr[idx++] = b;
    } else if (idx == 1) {
      if (b == 0x01) hdr[idx++] = b;
      else idx = (b == 0xEF) ? 1 : 0;
    } else {
      hdr[idx++] = b;
    }
  }
  if (idx < 9) return -1;

  pid = hdr[6];
  uint16_t pktLen = ((uint16_t)hdr[7] << 8) | hdr[8];
  if (pktLen < 2) return -1;
  uint16_t dataLen = pktLen - 2;
  if (dataLen > maxLen) return -1;

  uint16_t sum = pid + hdr[7] + hdr[8];
  uint16_t recvSum = 0;
  uint16_t got = 0;
  while (got < pktLen && millis() - start < timeoutMs) {
    if (!fingerSerial.available()) continue;
    uint8_t b = fingerSerial.read();
    if (got < dataLen) {
      payload[got] = b;
      sum += b;
    } else if (got == dataLen) {
      recvSum = (uint16_t)b << 8;
    } else {
      recvSum |= b;
    }
    got++;
  }
  if (got < pktLen) return -1;
  if (recvSum != sum) return -2;
  return dataLen;
}

// Sends a command packet and returns the confirmation code (0xFF on comm error).
uint8_t fpCommand(const uint8_t *cmd, uint16_t len, uint8_t *resp = nullptr, int *respLen = nullptr) {
  fpFlush();
  fpWritePacket(FP_PID_CMD, cmd, len);
  uint8_t pid;
  uint8_t buf[32];
  int n = fpReadPacket(pid, buf, sizeof(buf), 1500);
  if (n < 1 || pid != FP_PID_ACK) return 0xFF;
  if (resp && respLen) {
    memcpy(resp, buf, n);
    *respLen = n;
  }
  return buf[0];
}

// Reads a 512-byte template out of the sensor's RAM CharBuffer (UpChar, 0x08).
bool uploadCharBuffer(uint8_t bufferId, uint8_t *out) {
  uint8_t cmd[2] = { 0x08, bufferId };
  if (fpCommand(cmd, 2) != FINGERPRINT_OK) return false;

  uint16_t total = 0;
  uint8_t chunk[260];
  while (true) {
    uint8_t pid;
    int n = fpReadPacket(pid, chunk, sizeof(chunk), 1500);
    if (n < 0) return false;
    if (pid != FP_PID_DATA && pid != FP_PID_END) return false;
    uint16_t copy = min((uint16_t)n, (uint16_t)(TEMPLATE_SIZE - total));
    memcpy(out + total, chunk, copy);
    total += copy;
    if (pid == FP_PID_END) break;
  }
  return total == TEMPLATE_SIZE;
}

// Writes a 512-byte template into the sensor's RAM CharBuffer (DownChar, 0x09).
bool downloadCharBuffer(uint8_t bufferId, const uint8_t *in) {
  uint8_t cmd[2] = { 0x09, bufferId };
  if (fpCommand(cmd, 2) != FINGERPRINT_OK) return false;

  for (uint16_t off = 0; off < TEMPLATE_SIZE; off += fpPacketLen) {
    uint16_t len = min((uint16_t)fpPacketLen, (uint16_t)(TEMPLATE_SIZE - off));
    bool last = (off + len) >= TEMPLATE_SIZE;
    fpWritePacket(last ? FP_PID_END : FP_PID_DATA, in + off, len);
  }
  fingerSerial.flush();
  return true;
}

// Compares CharBuffer1 with CharBuffer2 using the sensor's algorithm (Match, 0x03).
uint8_t matchBuffers(uint16_t &score) {
  uint8_t cmd[1] = { 0x03 };
  uint8_t resp[32];
  int n = 0;
  uint8_t code = fpCommand(cmd, 1, resp, &n);
  score = (n >= 3) ? (((uint16_t)resp[1] << 8) | resp[2]) : 0;
  return code;
}

// =====================================================================
//  Hex helpers
// =====================================================================
int hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

bool hexToBytes(const String &hex, uint8_t *out, uint16_t len) {
  if (hex.length() != (unsigned)(len * 2)) return false;
  for (uint16_t i = 0; i < len; i++) {
    int hi = hexNibble(hex[2 * i]);
    int lo = hexNibble(hex[2 * i + 1]);
    if (hi < 0 || lo < 0) return false;
    out[i] = (hi << 4) | lo;
  }
  return true;
}

String bytesToHex(const uint8_t *data, uint16_t len) {
  static const char digits[] = "0123456789ABCDEF";
  String s;
  s.reserve(len * 2 + 1);
  for (uint16_t i = 0; i < len; i++) {
    s += digits[data[i] >> 4];
    s += digits[data[i] & 0x0F];
  }
  return s;
}

// =====================================================================
//  Template sync from the server (database is the single source of truth)
// =====================================================================
bool syncTemplates(bool force) {
  if (WiFi.status() != WL_CONNECTED || tplCache == nullptr) return false;
  if (!force && lastTplSync != 0 && millis() - lastTplSync < TEMPLATE_SYNC_INTERVAL) return true;
  lastTplSync = millis();

  HTTPClient http;
  WiFiClientSecure client;
  String url = apiUrl("/api/templates");
  if (!force && tplVersion.length() > 0) url += "?v=" + tplVersion;
  http.useHTTP10(true); // plain stream, no chunked encoding
  beginHttp(http, client, url);
  http.setTimeout(5000);

  int code = http.GET();
  if (code != 200) {
    http.end();
    Serial.println("Template sync failed, HTTP " + String(code));
    return false;
  }

  WiFiClient *stream = http.getStreamPtr();
  stream->setTimeout(3000);

  String first = stream->readStringUntil('\n');
  first.trim();
  if (!first.startsWith("V:")) {
    http.end();
    return false;
  }
  String newVersion = first.substring(2);

  int newCount = 0;
  bool finished = false;
  bool unchanged = false;

  while (true) {
    String line = stream->readStringUntil('\n');
    line.trim();
    if (line.length() == 0) break; // timeout / connection closed
    if (line == "END") {
      finished = true;
      break;
    }
    if (line == "UNCHANGED") {
      unchanged = true;
      continue;
    }
    int sep = line.indexOf(':');
    if (sep <= 0 || newCount >= MAX_TEMPLATES) continue;
    int uid = line.substring(0, sep).toInt();
    if (uid <= 0) continue;
    if (hexToBytes(line.substring(sep + 1), tplCache[newCount].data, TEMPLATE_SIZE)) {
      tplCache[newCount].userId = uid;
      newCount++;
    }
  }
  http.end();

  if (unchanged && finished) return true;

  tplCount = newCount;
  tplVersion = finished ? newVersion : ""; // force a full re-sync next time if incomplete
  Serial.println("Templates synced from server: " + String(tplCount));
  return finished;
}

// =====================================================================
//  Server communication
// =====================================================================
int requestNewIdFromServer() {
  if (WiFi.status() != WL_CONNECTED)
    return 0;
  HTTPClient http;
  WiFiClientSecure client;
  beginHttp(http, client, apiUrl("/api/new-id"));
  http.setTimeout(1200);
  int httpCode = http.GET();
  int newId = 0;
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload);
    int requestedDeviceId = doc["deviceId"] | 0;
    if (requestedDeviceId == deviceID) {
      newId = doc["id"] | 0;
      if (newId > 0) {
        disp(2, "id added: " + String(newId));
      }
    }
  }
  http.end();
  return newId;
}

void uploadMatchedIdToServer(int id) {
  disp(2, "Updating att:" + String(id));
  if (WiFi.status() != WL_CONNECTED) {
    disp(1, "No wifi");
    return;
  }

  HTTPClient http;
  WiFiClientSecure client;
  beginHttp(http, client, apiUrl("/api/log-id"));
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  DynamicJsonDocument doc(128);
  doc["id"] = id;
  doc["deviceID"] = deviceID;
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode > 0) {
    String response = http.getString();
    DynamicJsonDocument r(256);
    deserializeJson(r, response);
    int res = r["res"] | 0;
    String resName = r["name"] | "";

    if (res == 1001) {
      Serial.println("Attendance done for: " + String(id) + ". " + resName);
      disp(2, "Thanks " + resName);
    } else if (res == 1002) {
      disp(2, "Inactive:" + resName);
    } else if (res == 1003) {
      disp(2, "Unknown user #" + String(id));
      syncTemplates(true);
    } else {
      disp(2, "Opps, something wrong");
    }
  } else {
    disp(2, "Error:" + String(httpCode));
  }

  http.end();
  delay(1000);
}

void updateOnNewFinger(int id, String msg, bool isDone) {
  if (WiFi.status() != WL_CONNECTED) {
    disp(1, "No wifi");
    return;
  }

  disp(2, msg);

  HTTPClient http;
  WiFiClientSecure client;
  beginHttp(http, client, apiUrl("/api/updateOnNewFinger"));
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1500);

  DynamicJsonDocument doc(256);
  doc["id"] = id;
  doc["msg"] = msg;
  doc["isDone"] = isDone;
  String body;
  serializeJson(doc, body);

  http.POST(body);
  http.end();
  delay(300);
}

unsigned long lastHeartbeatTime = 0;
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastHeartbeatTime < 10000 && lastHeartbeatTime != 0) return;  // every 10s
  lastHeartbeatTime = millis();

  HTTPClient http;
  WiFiClientSecure client;
  beginHttp(http, client, apiUrl("/api/heartbeat"));
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1200);

  DynamicJsonDocument doc(128);
  doc["deviceID"] = deviceID;
  doc["mac"] = WiFi.macAddress();
  doc["ip"] = WiFi.localIP().toString();
  String body;
  serializeJson(doc, body);

  http.POST(body);
  http.end();
}

// =====================================================================
//  Enrollment: 2 scans -> sensor builds the model -> template saved to DB
// =====================================================================
bool storeNewFinger(int id) {
  for (int attempt = 0; attempt < 5; attempt++) {
    updateOnNewFinger(id, "Finger for 1st scan...", false);
    while (finger.getImage() != FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }
    if (finger.image2Tz(1) != FINGERPRINT_OK) {
      updateOnNewFinger(id, "Failed 1st scan, retry", false);
      delay(800);
      continue;
    }

    updateOnNewFinger(id, "Remove finger...", false);
    while (finger.getImage() != FINGERPRINT_NOFINGER) {
      server.handleClient();
      delay(100);
    }
    updateOnNewFinger(id, "Finger removed", false);

    updateOnNewFinger(id, "same finger for 2nd scan.", false);
    while (finger.getImage() != FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }
    if (finger.image2Tz(2) != FINGERPRINT_OK) {
      updateOnNewFinger(id, "Failed 2nd scan, retry", false);
      delay(800);
      continue;
    }

    // Sensor merges both scans; fails if they are not the same finger
    if (finger.createModel() != FINGERPRINT_OK) {
      updateOnNewFinger(id, "Fingers did not match, retry", false);
      delay(800);
      continue;
    }

    // Read the merged 512-byte template out of sensor RAM (packet-aware)
    uint8_t tpl[TEMPLATE_SIZE];
    if (!uploadCharBuffer(1, tpl)) {
      updateOnNewFinger(id, "Read error, retry", false);
      delay(800);
      continue;
    }

    disp(2, "Saving to database...");
    HTTPClient http;
    WiFiClientSecure client;
    beginHttp(http, client, apiUrl("/api/enroll-template"));
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);

    DynamicJsonDocument doc(1600);
    doc["user_id"] = id;
    doc["template"] = bytesToHex(tpl, TEMPLATE_SIZE);
    doc["deviceID"] = deviceID;
    String body;
    serializeJson(doc, body);

    int httpCode = http.POST(body);
    bool ok = false;
    if (httpCode > 0) {
      DynamicJsonDocument r(256);
      deserializeJson(r, http.getString());
      ok = r["success"] | false;
    }
    http.end();

    if (ok) {
      updateOnNewFinger(id, "New finger ID:" + String(id), true);
      disp(2, "Enrolled: #" + String(id));
      syncTemplates(true);  // make the new template available immediately
      delay(1200);
      return true;
    }
    updateOnNewFinger(id, "Server save failed, retry", false);
    delay(1000);
  }
  return false;
}

// =====================================================================
//  Identification: live scan vs. every DB template, using the sensor's matcher
// =====================================================================
void identifyFinger() {
  disp(2, "Finger found, wait...");

  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    disp(2, "Try again...");
    delay(800);
    return;
  }

  if (tplCount == 0) {
    syncTemplates(true);
    if (tplCount == 0) {
      disp(2, "No users enrolled");
      delay(1200);
      return;
    }
  }

  int bestId = 0;
  uint16_t bestScore = 0;

  for (int i = 0; i < tplCount; i++) {
    if (!downloadCharBuffer(2, tplCache[i].data)) continue;
    uint16_t score = 0;
    uint8_t code = matchBuffers(score);
    if (code == FINGERPRINT_OK) {
      Serial.println("Candidate user " + String(tplCache[i].userId) + " score " + String(score));
      if (score > bestScore) {
        bestScore = score;
        bestId = tplCache[i].userId;
      }
    }
  }

  if (bestId > 0 && bestScore >= MIN_MATCH_SCORE) {
    Serial.println("MATCH: user " + String(bestId) + " (score " + String(bestScore) + ")");
    uploadMatchedIdToServer(bestId);
  } else {
    Serial.println("No match (best score " + String(bestScore) + ")");
    disp(2, "Finger not matched");
    delay(1200);
  }
}

void setup() {
  Serial.begin(115200);
  prefs.begin("wifiCreds", false);

  fingerSerial.begin(57600, SERIAL_8N1, 16, 17);

  Wire.begin(15, 2);
  lcd.init();
  disp(0, "  Hello Zahid Sir  ");

  tplCache = (CachedTemplate *)malloc(sizeof(CachedTemplate) * MAX_TEMPLATES);
  if (!tplCache) Serial.println("ERROR: could not allocate template cache");

  wifi_ssid = prefs.getString("ssid", "Sweet Home");
  wifi_password = prefs.getString("pass", "12345678");

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ap_ssid, ap_pass);

  server.on("/", handleRoot);
  server.on("/save", handleSave);
  server.on("/reboot", handleReboot);
  server.begin();

  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  disp(1, "Connecting to WiFi");

  finger.begin(57600);
  if (finger.verifyPassword()) {
    sensorFound = true;
    if (finger.getParameters() == FINGERPRINT_OK) fpPacketLen = finger.packet_len;
    finger.emptyDatabase();  // sensor flash stays empty; DB is the only store
    Serial.println("Sensor OK, packet length: " + String(fpPacketLen));
    disp(2, "Finger Sensor Detected.");
  }
  disp(0, "FacultyAttendanceSys");
}

bool noWifiShowed = false, noSensorShowed = false;
unsigned long lastNewIdCheck = 0;

void loop() {
  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    if (!noWifiShowed) {
      noWifiShowed = true;
      disp(1, "Wifi Not Connected");
      disp(3, "APIP: " + WiFi.softAPIP().toString());
      if (!sensorFound) disp(2, "No sensor, Reset pls");
      delay(500);
    }
    return;
  }

  noWifiShowed = false;
  disp(1, "Wifi: " + String(wifi_ssid));
  disp(3, "IP: " + WiFi.localIP().toString());

  sendHeartbeat();

  if (!sensorFound) {
    if (!noSensorShowed) {
      noSensorShowed = true;
      disp(2, "No sensor, reset pls");
      delay(1000);
    }
    return;
  }
  noSensorShowed = false;

  // Keep the RAM template cache in sync with the database
  syncTemplates(false);

  // Pending enrollment from the web dashboard?
  if (millis() - lastNewIdCheck > 2500) {
    lastNewIdCheck = millis();
    int newId = requestNewIdFromServer();
    if (newId > 0) {
      if (!storeNewFinger(newId)) {
        updateOnNewFinger(newId, "Enrollment failed", false);
        disp(2, "Enrollment failed");
        delay(1000);
      }
      return;
    }
  }

  if (finger.getImage() == FINGERPRINT_OK) {
    identifyFinger();

    disp(2, "Please remove finger");
    while (finger.getImage() != FINGERPRINT_NOFINGER) {
      server.handleClient();
      delay(100);
    }
    disp(2, "");
  } else {
    delay(60);
  }
}
