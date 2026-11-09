#include <WiFi.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "Adafruit_Fingerprint.h"
#include <LiquidCrystal_I2C.h>
#include <WebServer.h>
#include <Preferences.h>

// Line 0: Header / University Info
// Line 1: WiFi Status
// Line 2: Biometric / User Notification
// Line 3: Terminal IP / Credits

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
const char *serverIp = "192.168.0.103";
const int serverPort = 3000;
const int deviceID = 1;

HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

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

/**
 * Extracts 512-byte biometric template from sensor RAM
 * and formats as a 1024-character hexadecimal string for Server DB Backup.
 */
uint8_t extractTemplateHex(String &hexOut) {
  while (fingerSerial.available()) {
    fingerSerial.read();
  }

  uint8_t p = finger.getModel();
  if (p != FINGERPRINT_OK) {
    return p;
  }

  uint8_t bytesReceived[534];
  memset(bytesReceived, 0xff, 534);

  uint32_t starttime = millis();
  int i = 0;
  while (i < 534 && (millis() - starttime) < 2000) {
    if (fingerSerial.available()) {
      bytesReceived[i++] = fingerSerial.read();
    }
  }

  if (i < 534) {
    return FINGERPRINT_PACKETRECIEVEERR;
  }

  uint8_t cleanTemplate[512];
  memcpy(cleanTemplate, bytesReceived + 9, 256);
  memcpy(cleanTemplate + 256, bytesReceived + 9 + 256 + 2 + 9, 256);

  hexOut = "";
  hexOut.reserve(1025);
  char hexBuf[3];
  for (int j = 0; j < 512; j++) {
    sprintf(hexBuf, "%02X", cleanTemplate[j]);
    hexOut += hexBuf;
  }

  return FINGERPRINT_OK;
}

int requestNewIdFromServer() {
  if (WiFi.status() != WL_CONNECTED)
    return 0;
  HTTPClient http;
  WiFiClientSecure client;
  String url = String(host) + serverIp + ":" + serverPort + "/api/new-id";
  if (isServer) {
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
  http.setTimeout(1200);
  int httpCode = http.GET();
  int newId = 0;
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload);
    int requestedDeviceId = doc["deviceId"] | 0;
    if (requestedDeviceId == deviceID || requestedDeviceId == 0) {
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
  Serial.println("Uploading matched ID to server...");
  if (WiFi.status() != WL_CONNECTED) {
    disp(1, "No wifi");
    return;
  }

  HTTPClient http;
  String url = String(host) + serverIp + ":" + serverPort + "/api/log-id";
  WiFiClientSecure client;
  if (isServer) {
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
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
    DynamicJsonDocument r(128);
    deserializeJson(r, response);
    int res = r["res"];
    String resId = r["id"];
    String resName = r["name"];

    if (res == 1001) {
      Serial.print("Attendance Confirmed for: ");
      Serial.print(resId);
      Serial.print(". ");
      Serial.println(resName);
      disp(2, "Thanks " + resName);
    } else if (res == 1002) {
      Serial.print("User inactive: ");
      Serial.println(resName);
      disp(2, "Inactive:" + resName);
    } else if (res == 1003) {
      finger.deleteModel(id);
      Serial.println("User not found in DB, removed from sensor");
      disp(2, "Unknown user:" + String(id));
    } else {
      disp(2, "Opps, error");
    }
  } else {
    disp(2, "Server error:" + String(httpCode));
  }

  http.end();
  delay(1200);
}

void updateOnNewFinger(int id, String msg, bool isDone) {
  if (WiFi.status() != WL_CONNECTED) {
    disp(1, "No wifi");
    return;
  }

  disp(2, msg);

  HTTPClient http;
  String url = String(host) + serverIp + ":" + serverPort + "/api/updateOnNewFinger";
  WiFiClientSecure client;
  if (isServer) {
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1500);

  DynamicJsonDocument doc(256);
  doc["id"] = id;
  doc["msg"] = msg;
  doc["isDone"] = isDone;
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Server response: " + response);
  }

  http.end();
  delay(400);
}

unsigned long lastHeartbeatTime = 0;
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastHeartbeatTime < 10000 && lastHeartbeatTime != 0) return; // Every 10s
  lastHeartbeatTime = millis();

  HTTPClient http;
  WiFiClientSecure client;
  String url = String(host) + serverIp + ":" + serverPort + "/api/heartbeat";
  if (isServer) {
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
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

/**
 * 100% Reliable Hardware Biometric Enrollment
 * Stores in hardware memory for instant DSP search AND backs up template to PostgreSQL DB
 */
bool storeNewFinger(int id) {
  while (true) {
    Serial.println("Place finger for first scan...");
    updateOnNewFinger(id, "Finger for 1st scan...", false);
    while (finger.getImage() != FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }

    int p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      Serial.println("Failed to convert first scan, try again...");
      updateOnNewFinger(id, "Scan 1 failed, retry", false);
      delay(500);
      continue;
    }

    Serial.println("Remove finger...");
    updateOnNewFinger(id, "Remove finger...", false);
    while (finger.getImage() == FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }
    updateOnNewFinger(id, "Finger removed", false);
    delay(400);

    Serial.println("Place same finger for second scan...");
    updateOnNewFinger(id, "same finger for 2nd scan.", false);
    while (finger.getImage() != FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }

    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
      Serial.println("Failed to convert second scan, try again...");
      updateOnNewFinger(id, "Scan 2 failed, retry", false);
      delay(500);
      continue;
    }

    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
      Serial.println("Failed to create model, try again...");
      updateOnNewFinger(id, "Model error, try again", false);
      delay(500);
      continue;
    }

    // 1. Store in optical sensor hardware flash memory
    p = finger.storeModel(id);
    if (p == FINGERPRINT_OK) {
      Serial.println("Finger stored in sensor memory with ID: " + String(id));

      // 2. Also back up 512-byte template to PostgreSQL database
      String templateHex = "";
      extractTemplateHex(templateHex);
      if (templateHex.length() > 100) {
        HTTPClient http;
        WiFiClientSecure client;
        String url = String(host) + serverIp + ":" + serverPort + "/api/enroll-template";
        if (isServer) {
          client.setInsecure();
          http.begin(client, url);
        } else {
          http.begin(url);
        }
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(3000);

        DynamicJsonDocument doc(1600);
        doc["user_id"] = id;
        doc["template"] = templateHex;
        doc["deviceID"] = deviceID;
        String body;
        serializeJson(doc, body);
        http.POST(body);
        http.end();
      }

      updateOnNewFinger(id, "New finger ID:" + String(id), true);
      disp(2, "Enrolled: #" + String(id));
      delay(1500);
      return true;
    } else {
      Serial.println("Failed to store model, error: " + String(p));
      updateOnNewFinger(id, "Sensor store failed", false);
      delay(1000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  prefs.begin("wifiCreds", false);

  fingerSerial.begin(57600, SERIAL_8N1, 16, 17);

  Wire.begin(15, 2);
  lcd.init();
  disp(0, "  Hello Zahid Sir  ");

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
  Serial.println("Connecting to WiFi");

  finger.begin(57600);
  if (finger.verifyPassword()) {
    sensorFound = true;
    disp(2, "Finger Sensor Detected.");
    Serial.println("Fingerprint sensor detected! 100% Reliable Hardware Biometric Mode.");
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
      IPAddress apIP = WiFi.softAPIP();
      disp(3, "APIP: " + apIP.toString());
      if (!sensorFound) {
        disp(2, "No sensor, Reset pls");
      }
      delay(500);
    }
    return;
  }

  // Connected to Wi-Fi
  noWifiShowed = false;
  disp(1, "Wifi: " + String(wifi_ssid));
  IPAddress ip = WiFi.localIP();
  disp(3, "IP: " + ip.toString());

  // Heartbeat to server every 10s
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

  // 1. Check for pending web enrollment requests every 2.5 seconds
  if (millis() - lastNewIdCheck > 2500) {
    lastNewIdCheck = millis();
    int newId = requestNewIdFromServer();
    if (newId > 0) {
      disp(2, "Enrolling ID: #" + String(newId));
      if (storeNewFinger(newId)) {
        Serial.println("New finger enrolled successfully");
      } else {
        disp(2, "Enrollment failed");
        delay(1000);
      }
      return;
    }
  }

  // 2. Poll sensor for finger touch
  uint8_t result = finger.getImage();
  if (result == FINGERPRINT_OK) {
    disp(2, "Finger found, wait...");
    Serial.println("Finger detected, verifying...");

    result = finger.image2Tz(1);
    if (result != FINGERPRINT_OK) {
      disp(2, "Try again...");
      return;
    }

    // 100% RELIABLE HARDWARE DSP SEARCH
    // Matches against enrolled finger with FAR < 0.001%
    result = finger.fingerFastSearch();
    int id = finger.fingerID;

    if (result == FINGERPRINT_OK && id > 0) {
      Serial.println("Finger matched with ID: " + String(id));
      uploadMatchedIdToServer(id);
    } else {
      Serial.println("Finger NOT recognized!");
      disp(2, "Finger not matched");
      delay(1200);
    }

    // Wait until finger is removed
    disp(2, "Please remove finger");
    while (finger.getImage() == FINGERPRINT_OK) {
      server.handleClient();
      delay(100);
    }
    disp(2, "");
  } else {
    // Non-blocking sleep
    delay(60);
  }
}
