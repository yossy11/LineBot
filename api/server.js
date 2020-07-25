"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const PORT = 3000;
process.env.PORT;

const config = {
  channelSecret: process.env.SECRET,
  channelAccessToken: process.env.ACCESSTOKEN,
};

// const config = {
//   channelSecret: "e789dde58c5d44eb3682661bc6dac198",
//   channelAccessToken:
//     "dMIDrt8yE+l4Y41sIi8tZZXGOiQsZlmhHLDA3mEDO4XlTaXOms8t/gFO2Wjwd9FXSLHK5L5ux0iTAkKkLIk7WkOIXNNY3YHYYii394pgKw9NKZVYyt5N1AQJpFBjck/jm2VCLDLr38KBFEdHKoy7IQdB04t89/1O/w1cDnyilFU=",
// };

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")); //ブラウザ確認用(無くても問題ない)
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);

  //ここのif分はdeveloper consoleの"接続確認"用なので削除して問題ないです。
  if (
    req.body.events[0].replyToken === "00000000000000000000000000000000" &&
    req.body.events[1].replyToken === "ffffffffffffffffffffffffffffffff"
  ) {
    res.send("Hello LINE BOT!(POST)");
    console.log("疎通確認用");
    return;
  }

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: event.message.text, //実際に返信の言葉を入れる箇所
  });
}

// app.listen(PORT);
// console.log(`Server running at ${PORT}`);
process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
