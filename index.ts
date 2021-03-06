import { Selector } from "testcafe";
import "dotenv/config";
import TwitterApi from "twitter-api-v2";
import {
  enterWord,
  evaluateRow,
  filterWordList,
  GAME_ID,
  getRandomWord,
  getSelector,
  revertWord,
} from "./util";
import words from "./final-list.json";

let wordList = [...words];

const {
  TWITTER_API_KEY,
  TWITTER_API_KEY_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET,
} = process.env;

if (
  !TWITTER_API_KEY ||
  !TWITTER_API_KEY_SECRET ||
  !TWITTER_ACCESS_TOKEN ||
  !TWITTER_ACCESS_SECRET
) {
  throw new Error("One or more tokens not present");
}

const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_KEY_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_SECRET,
});

const getDayOffset = (today: Date) => {
  const firstDay = new Date(2021, 5, 19, 0, 0, 0, 0);
  const offsetInMs = today.setHours(0, 0, 0, 0) - firstDay.setHours(0, 0, 0, 0);
  return Math.round(offsetInMs / 864e5);
};

fixture`Solving Wordle`.page`https://www.nytimes.com/games/wordle/index.html`;

test("Attempting Wordle", async (t: TestController) => {
  const gameApp = Selector(GAME_ID);

  const gameModalOpen = gameApp.find(getSelector("Modal-module_content"));
  // Close game instructions modal if shown at start of game
  if (await gameModalOpen.exists) {
    const gameModalCloseIcon = gameModalOpen.find(
      getSelector("Modal-module_closeIcon")
    );
    await t.click(gameModalCloseIcon);
  }

  let attempt: string | number = "X";
  let shareString = "";

  for (let i = 0; i < 6; i++) {
    console.log("word list length:", wordList.length);
    const word = getRandomWord(wordList);
    console.log("attempting word:", word);
    await enterWord(t, word);
    const result = await evaluateRow(i);
    // word not in wordle list. revert and try again.
    if (
      result.every(
        ({ evaluation }) => evaluation === "tbd" || evaluation === "empty"
      )
    ) {
      await revertWord(t);
      i--;
      continue;
    }
    shareString +=
      result.reduce(
        (s: string, { evaluation }) =>
          (s +=
            evaluation === "correct"
              ? "????"
              : evaluation === "present"
              ? "????"
              : "???"),
        ""
      ) + "\n";
    if (result.every(({ evaluation }) => evaluation === "correct")) {
      attempt = i + 1;
      break;
    }
    wordList = filterWordList(wordList, result);
  }

  // share result
  shareString = `Wordle ${getDayOffset(
    new Date()
  )} ${attempt}/6\n\n${shareString}`;

  try {
    const twitterResponse = await twitterClient.v2.post("tweets", {
      text: shareString,
    });
    console.log(
      "response from twitter is:",
      JSON.stringify(twitterResponse, null, 2)
    );
  } catch (error) {
    console.log("twitter error:", error);
  }

  await t.wait(5000);
});
