"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const request = require("request");
const parseString = require("xml2js").parseString;
const PORT = 3000;
const url = "http://www.drk7.jp/weather/xml/12.xml";

const config = {
  channelSecret: process.env.SECRET,
  channelAccessToken: process.env.ACCESSTOKEN,
};

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)"));
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }
  const message = makeText(event.message.text);
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: message,
  });
}

function makeText(text) {
  if (text === "天気") {
    const message = getWeather();
    return message;
  } else {
    return text;
  }
}

async function getWeather() {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        parseString(body, (err, result) => {
          const day =
            result.weatherforecast.pref[0].area[1].info[0]["$"].date + "\n";
          const weather =
            result.weatherforecast.pref[0].area[1].info[0].weather[0] + "\n";
          const detail =
            result.weatherforecast.pref[0].area[1].info[0].weather_detail[0] +
            "\n";
          const max =
            "最高気温は" +
            result.weatherforecast.pref[0].area[1].info[0].temperature[0]
              .range[0]._ +
            "度\n";
          const min =
            "最低気温は" +
            result.weatherforecast.pref[0].area[1].info[0].temperature[0]
              .range[1]._ +
            "度です";
          const message =
            "今日の天気予報です\n" + day + weather + detail + max + min;
          resolve(message);
        });
      } else {
        console.log(error + " : " + response);
        reject(error);
      }
    });
  });
}

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
