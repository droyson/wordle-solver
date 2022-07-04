import { Selector } from "testcafe";

const ENTER = "↵";

const DELETE = "←";

export const GAME_ID = "#wordle-app-game";

export const getSelector = (
  value: string,
  element: string = "div",
  attribute: string = "class"
) => {
  return `${element}[${attribute}*='${value}']`;
};

export const clickLetter = async (t: TestController, letter: string) => {
  const gameApp = Selector(GAME_ID);
  const gameKeyboard = gameApp.find(getSelector("Keyboard-module_keyboard"));
  const key = gameKeyboard.find(`button[data-key="${letter}"]`);

  await t.click(key);
};

export const enterWord = async (t: TestController, word: string) => {
  for (const letter of word) {
    await clickLetter(t, letter);
  }

  await clickLetter(t, ENTER);
  await t.wait(4000);
};

export const revertWord = async (t: TestController) => {
  for (let i = 0; i < 5; i++) {
    await clickLetter(t, DELETE);
  }
};

type Evaluation = "correct" | "absent" | "present" | "tbd" | "empty";

type Reveal = {
  letter: string | null;
  evaluation: Evaluation;
};

export const evaluateRow = async (rowIndex: number): Promise<Reveal[]> => {
  const gameApp = Selector(GAME_ID);

  const gameRow = gameApp.find(getSelector("Row-module_row")).nth(rowIndex);
  const gameTiles = gameRow.find(getSelector("Tile-module_tile"));
  const rowReveal: Reveal[] = [];
  for (let i = 0; i < 5; i++) {
    const gameTile = gameTiles.nth(i);
    const letter = await gameTile.textContent;
    const evaluation = (await gameTile.getAttribute(
      "data-state"
    )) as Evaluation;
    rowReveal.push({
      letter,
      evaluation,
    });
  }

  return rowReveal;
};

export const getRandomWord = (wordList: string[]): string => {
  const len = wordList.length;
  const index = Math.floor(Math.random() * len);

  return wordList.splice(index, 1)[0];
};

export const filterWordList = (
  wordList: string[],
  result: Reveal[]
): string[] => {
  // A letter can be marked absent and present at same time for repeat letters in the list hence we filter the absent list.
  const { absent } = result.reduce(
    (acc: { present: string[]; absent: string[] }, { letter, evaluation }) => {
      if (letter) {
        if (evaluation === "absent" && !acc.present.includes(letter)) {
          acc.absent.push(letter);
        } else {
          acc.present.push(letter);
          let index = acc.absent.indexOf(letter);
          if (index > -1) {
            acc.absent.splice(index, 1);
          }
        }
      }
      return acc;
    },
    {
      present: [],
      absent: [],
    }
  );

  const newList = wordList.filter((word) => {
    // filter out absent letters
    if (absent.some((absentLetter) => word.includes(absentLetter))) {
      return false;
    }
    for (let i = 0; i < result.length; i++) {
      const { letter, evaluation } = result[i];
      if (letter) {
        // filter out words that don't have correct letter in place
        if (evaluation === "correct" && word[i] !== letter) {
          return false;
        }
        // filter out words that are present but in wrong place
        if (
          evaluation === "present" &&
          (word[i] === letter || !word.includes(letter))
        ) {
          return false;
        }
      }
    }
    return true;
  });

  return newList;
};
