#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <cJSON.h>
#include <time.h>

#include "tank_processing.h"
#include "wifi_config.h"
#include "firebase_config.h"
#include "firebase_ca.h"
#include "firebase_device_secret.h"

const int TRIG_PIN = 18;
const int ECHO_PIN = 19;
const unsigned long ECHO_TIMEOUT_US = 30000;
const float SOUND_CM_PER_US = 0.0343f;
const int SAMPLE_INTERVAL_MS = 500;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long FIREBASE_SEND_INTERVAL_MS = 5000;
// New references were collected on a level surface with the sensor fixed.
const bool CALIBRATION_MEASUREMENTS_CURRENT = true;

tank::MedianFilter distanceFilter;
bool calibrationReady = false;
bool wifiWasConnected = false;
unsigned long lastWiFiAttemptMs = 0;
unsigned long lastFirebaseSendMs = 0;
unsigned long tokenExpiresAtMs = 0;
String firebaseIdToken;
String firebaseRefreshToken;
Preferences firebasePrefs;

String jsonField(cJSON* root, const char* key) {
  cJSON* item = cJSON_GetObjectItemCaseSensitive(root, key);
  return cJSON_IsString(item) && item->valuestring ? String(item->valuestring) : String();
}

bool firebaseAuth() {
  if (WiFi.status() != WL_CONNECTED) return false;
  // TLS certificate checks need a real clock after each boot.
  if (time(nullptr) < 1600000000) return false;
  if (firebaseIdToken.length() && (long)(tokenExpiresAtMs - millis()) > 60000) return true;

  NetworkClientSecure client;
  client.setCACert(FIREBASE_ROOT_CA);
  HTTPClient http;
  const bool refreshing = firebaseRefreshToken.length() > 0;
  const String url = String(refreshing ? "https://securetoken.googleapis.com/v1/token?key="
                                         : "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=") + FIREBASE_API_KEY;
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", refreshing ? "application/x-www-form-urlencoded" : "application/json");
  const String body = refreshing ? String("grant_type=refresh_token&refresh_token=") + firebaseRefreshToken
                                 : String("{\"returnSecureToken\":true}");
  const int code = http.POST(body);
  const String response = http.getString();
  http.end();
  if (code != 200) {
    Serial.print("Firebase auth failed | HTTP "); Serial.println(code);
    return false;
  }
  cJSON* root = cJSON_Parse(response.c_str());
  if (!root) return false;
  const String idToken = jsonField(root, refreshing ? "id_token" : "idToken");
  const String refreshToken = jsonField(root, refreshing ? "refresh_token" : "refreshToken");
  const String uid = jsonField(root, refreshing ? "user_id" : "localId");
  cJSON* expires = cJSON_GetObjectItemCaseSensitive(root, refreshing ? "expires_in" : "expiresIn");
  const unsigned long seconds = cJSON_IsString(expires) ? String(expires->valuestring).toInt() :
                                cJSON_IsNumber(expires) ? expires->valueint : 3600;
  cJSON_Delete(root);
  if (!idToken.length() || !refreshToken.length() || !uid.length()) return false;
  firebaseIdToken = idToken;
  firebaseRefreshToken = refreshToken;
  firebasePrefs.putString("refresh", firebaseRefreshToken);
  tokenExpiresAtMs = millis() + min(seconds, 3600UL) * 1000UL;
  Serial.print("Firebase device UID: "); Serial.println(uid);
  return true;
}

void sendToFirebase(const tank::TankReading& reading, float distanceCm) {
  if (!firebaseAuth()) return;
  NetworkClientSecure client;
  client.setCACert(FIREBASE_ROOT_CA);
  HTTPClient http;
  const String url = String(FIREBASE_DATABASE_URL) + "/tanque/actual.json?auth=" + firebaseIdToken;
  if (!http.begin(client, url)) return;
  http.addHeader("Content-Type", "application/json");
  String body = "{\"llenadoPorcentaje\":" + String(reading.fillPercent, 1) +
                ",\"nivelAlturaPorcentaje\":" + String(reading.levelPercent, 1) +
                ",\"litros\":" + String(reading.liters, 3) +
                ",\"distanciaCm\":" + String(distanceCm, 2) +
                ",\"actualizadoEn\":{\".sv\":\"timestamp\"}}";
  const int code = http.sendRequest("PATCH", body);
  http.end();
  Serial.print("Firebase upload | HTTP "); Serial.println(code);
  if (code == 401) firebaseIdToken = "";
}

void updateWiFi() {
  if (WIFI_SSID[0] == '\0') return;

  const bool connected = WiFi.status() == WL_CONNECTED;
  if (connected) {
    if (!wifiWasConnected) {
      Serial.print("Wi-Fi connected | IP: ");
      Serial.println(WiFi.localIP());
      wifiWasConnected = true;
    }
    return;
  }

  if (wifiWasConnected) {
    Serial.println("Wi-Fi disconnected; reconnecting...");
    wifiWasConnected = false;
  }

  const unsigned long now = millis();
  if (now - lastWiFiAttemptMs >= WIFI_RETRY_INTERVAL_MS) {
    Serial.println("Connecting to Wi-Fi...");
    WiFi.reconnect();
    lastWiFiAttemptMs = now;
  }
}

void setup() {
  Serial.begin(115200);
  firebasePrefs.begin("tank-firebase", false);
  firebaseRefreshToken = firebasePrefs.getString("refresh", "");
  if (!firebaseRefreshToken.length()) firebaseRefreshToken = FIREBASE_INITIAL_REFRESH_TOKEN;
  pinMode(TRIG_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);
  delay(1000);
  if (WIFI_SSID[0] == '\0') {
    Serial.println("Wi-Fi not configured: set WIFI_SSID and WIFI_PASSWORD in wifi_config.h");
  } else {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    configTime(0, 0, "time.google.com", "pool.ntp.org");
    lastWiFiAttemptMs = millis();
    Serial.println("Connecting to Wi-Fi...");
  }
  calibrationReady = CALIBRATION_MEASUREMENTS_CURRENT && tank::calibrationIsValid();
  if (!CALIBRATION_MEASUREMENTS_CURRENT) {
    Serial.println("RECALIBRATION REQUIRED: use calibration_reader for new references");
  } else if (calibrationReady) {
    Serial.print("Water tank monitor started | Usable capacity (L): ");
    Serial.println(tank::CALIBRATION_POINTS[tank::CALIBRATION_POINT_COUNT - 1].liters, 3);
    Serial.print("Calibration points: ");
    Serial.println(tank::CALIBRATION_POINT_COUNT);
  } else {
    Serial.println("ERROR: invalid calibration table; measurements disabled");
  }
}

void loop() {
  updateWiFi();
  if (!calibrationReady) {
    delay(SAMPLE_INTERVAL_MS);
    return;
  }

  // Request a measurement with a 10-microsecond trigger pulse.
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  const unsigned long echoTimeUs = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);

  if (echoTimeUs == 0) {
    tank::resetFilter(distanceFilter);
    Serial.println("ERROR: no complete echo within 30 ms");
  } else {
    // Sound travels to the target and back, so divide by two.
    const float distanceCm = echoTimeUs * SOUND_CM_PER_US / 2.0f;

    if (!tank::distanceIsUsable(distanceCm)) {
      tank::resetFilter(distanceFilter);
      Serial.print("ERROR: distance outside usable calibration range | Raw (cm): ");
      Serial.println(distanceCm, 2);
    } else {
      float filteredCm;
      if (!tank::addMedianSample(distanceFilter, distanceCm, filteredCm)) {
        Serial.print("WARMUP: ");
        Serial.print(distanceFilter.count);
        Serial.print("/5 | Raw (cm): ");
        Serial.println(distanceCm, 2);
      } else {
        const tank::TankReading reading = tank::calculateReading(filteredCm);
        if (!reading.valid) {
          tank::resetFilter(distanceFilter);
          Serial.println("ERROR: calibration calculation failed");
        } else {
          Serial.print("Raw (cm): ");
          Serial.print(distanceCm, 2);
          Serial.print(" | Filtered (cm): ");
          Serial.print(filteredCm, 2);
          Serial.print(" | Level (% height): ");
          Serial.print(reading.levelPercent, 1);
          Serial.print(" | Volume (L): ");
          Serial.print(reading.liters, 3);
          Serial.print(" | Fill (% volume): ");
          Serial.print(reading.fillPercent, 1);
          if (reading.endpointClamped) Serial.print(" | Boundary: CLAMPED");
          Serial.println();
          if (WiFi.status() == WL_CONNECTED &&
              millis() - lastFirebaseSendMs >= FIREBASE_SEND_INTERVAL_MS) {
            lastFirebaseSendMs = millis();
            sendToFirebase(reading, filteredCm);
          }
        }
      }
    }
  }

  // Space measurements to avoid interference from previous echoes.
  delay(SAMPLE_INTERVAL_MS);
}
