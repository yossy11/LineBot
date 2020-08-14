"use strict";
const makeImage = require("./draw.js");
const express = require("express");
const line = require("@line/bot-sdk");
const request = require("request");
const parseString = require("xml2js").parseString;
const PORT = 3000;
const imageURL = "https://line-bot-delta.vercel.app/result";
const weatherURL = "http://www.drk7.jp/weather/xml/12.xml";
const simple_wikipedia_api = "http://wikipedia.simpleapi.net/api";
const horoscopeURL = "http://api.jugemkey.jp/api/horoscope/free/";
const wikiPattern = /(.*)って(なに|何)(？|\?)?$/;
const horoscopePattern = /牡羊座|牡牛座|双子座|蟹座|獅子座|乙女座|天秤座|蠍座|射手座|山羊座|水瓶座|魚座/;

const config = {
  channelSecret: process.env.SECRET,
  channelAccessToken: process.env.ACCESSTOKEN,
};

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)"));

const base64Data = makeImage();
base64Data.then((result) => {
  app.get("/result", function (req, res) {
    const img = Buffer.from(result, "base64");
    res.writeHead(200, {
      "Content-Type": "image/png;charset=UTF-8",
      "Content-Length": img.length,
    });
    res.end(img);
  });
});

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
  const reply = await makeReply(event);
  return reply;
}

async function makeReply(event) {
  const text = event.message.text;
  if (text === "コロナ") {
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: imageURL,
      previewImageUrl: imageURL,
    });
  }
  let message = text;
  if (text === "天気") {
    message = await getWeather();
  } else if (text.match(wikiPattern)) {
    const str = text.match(wikiPattern)[1];
    message = await getWikipediaUrlAndBody(str);
  } else if (text.match(horoscopePattern)) {
    const str = text.match(horoscopePattern)[0];
    message = await getHoroscope(str);
  }
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: message,
  });
}

async function getWeather() {
  return new Promise((resolve, reject) => {
    request(weatherURL, (error, response, body) => {
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

async function getWikipediaUrlAndBody(str) {
  const url =
    simple_wikipedia_api +
    "?keyword=" +
    encodeURIComponent(str) +
    "&output=json";
  const options = {
    url: url,
    method: "GET",
    json: true,
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        const message = [
          "説明しよう！" + str + "とは！",
          response.body[0].body.substr(0, 140) + "...",
          "続きは",
          response.body[0].url,
        ];
        resolve(message.join("\n"));
      } else {
        console.log(error + " : " + response);
        reject(error);
      }
    });
  });
}

async function getHoroscope(str) {
  const today = formDate();
  const options = {
    url: horoscopeURL + today,
    method: "GET",
    json: true,
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        const results = response.body.horoscope[today];
        const result = results.find((element) => element.sign === str);
        const message = [
          "今日の" + str + "の運勢は" + result.rank + "位！",
          result.content,
          "ラッキーアイテムは" + result.item,
          "ラッキーカラーは" + result.color + "だよ",
        ];
        resolve(message.join("\n"));
      } else {
        console.log(error + " : " + response);
        reject(error);
      }
    });
  });
}

const formDate = () => {
  const today = new Date();
  let month = String(today.getMonth() + 1);
  month = month.length < 2 ? "0" + month : month;
  return [today.getFullYear(), month, today.getDate()].join("/");
};

setInterval(() => {
  makeImage().then((result) => {
    app.get("/result", function (req, res) {
      const img = Buffer.from(result, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length,
      });
      res.end(img);
    });
  });
}, 43200000);
process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
