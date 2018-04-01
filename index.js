import PngCrop from "png-crop";
import axios from "axios";
import ocrSpaceApi from "ocr-space-api";
import google from "google";
var exec = require("child_process").exec, child;
const readline = require("readline"); //fichier d'entrée
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const INITIAL_IMAGE_PATH = "./images/hq_image.png";
let scriptCall = 0;
//OCR API
const ocrURL = "https://api.ocr.space/parse/image";
const API_KEY = "597c38f59188957";
const LANGUAGE = "eng";
const IMAGE_FORMAT = "image/png";

// Objet résultat d'analyse
let finalResult = {
  question: undefined,
  answers: [
    { content: "", score: 0 },
    { content: "", score: 0 },
    { content: "", score: 0 }
  ]
};

const ELEMENT_TO_ANALYSE = 2;
let analysedElements = 0;

//Configuration pour les crops
const QUESTION_CROP_CONFIG = { width: 388, height: 177, top: 161, left: 35 };
const ANSWER_CROP_CONFIG = { width: 395, height: 271, top: 337, left: 27 };

const PATH_TO_CROPED_IMAGES = "./images/cropedImages";
const ANSWER_FILE_NAME_CROPED_IMAGE = "answer_croped.png";
const QUESTION_FILE_NAME_CROPED_IMAGE = "question_croped.png";

let linkOpened = 0;
const MAX_LINK_TO_OPEN_PER_ANSWER = 5;
// Pour trier les réponses
function compareAnswer(answerA, answerB) {
  if (answerA.score > answerB.score) return -1;
  if (answerA.score < answerB.score) return 1;
  return 0;
}
// Véirifie si chaque question à ouvert ses liens et affiche le récap des score par question
function checkEnd() {
  if (linkOpened === MAX_LINK_TO_OPEN_PER_ANSWER * finalResult.answers.length) {
    let result = finalResult.answers.sort(compareAnswer);
    console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n****");
    console.log("****");
    console.log("****");
    console.log("****            " + result[0].content);
    console.log("****");
    console.log("****");
    console.log("****\n\n\n\n\n\n\n\n\n\n\n\n\n");
    finalResult.answers.map(a => console.log(a));
    console.log("\n\n");
    console.timeEnd("duration" + scriptCall);
    go();
  } else {
    let result = [...finalResult.answers];
    result = result.sort(compareAnswer);
    console.log("\n\nCurrent best : ", result[0].content);
  }
}
//retire des mot useless du string en parametre
function keyword(s) {
  s = s.toLocaleLowerCase();
  let words = ["of", "the", "in", "on", "at", "to", "a", "is", "an"];
  const regex = new RegExp("\\b(" + words.join("|") + ")\\b", "g");
  return (s || "").replace(regex, "").replace(/[ ]{2,}/, " ");
}

// Parcours chaque lien
function requestQuestionAndFindOccurenceOfAnswer(question, answer, index) {
  google.resultsPerPage = MAX_LINK_TO_OPEN_PER_ANSWER;

  const currentAnswer = keyword(answer.content.toLocaleLowerCase());
  google(question + " " + currentAnswer, function(err, res) {
    if (err) console.error(err);

    for (var i = 0; i < res.links.length; i++) {
      var link = res.links[i];
      if (link.href) {
        axios
          .get(link.href)
          .then(response => {
            linkOpened++;
            let count = 0;
            // Test à la fois la chaine entiere et chaque morceaux dans le résultat de la recherche
            const regex = new RegExp(currentAnswer, "g");
            count += (response.data.match(regex) || []).length;
            const splitedAnswer = currentAnswer.split(" ");
            splitedAnswer.map(s => {
              if (s != "") {
                const regex2 = new RegExp(s, "g");
                count += (response.data.match(regex2) || []).length;
              }
            });
            //S'il y a + de mot dans une reponse que dans une autre le score explose donc on fait un ratio sur le nombre de mot
            count = count / splitedAnswer.length;
            finalResult.answers[index].score += count;
            checkEnd();
          })
          .catch(err => {
            linkOpened++;
            checkEnd();
          });
      } else {
        linkOpened++;
        checkEnd();
      }
    }
  });
}

//retire les caracteres non désiré de la réponse OCR et rempli le résultat final
function fillResultWithOCRData(parsedResult, isQuestion) {
  if (isQuestion) {
    finalResult.question = parsedResult.parsedText
      .replace(/(\r\n)/g, "")
      .trim();
  } else {
    const answers = parsedResult.ocrParsedResult.ParsedResults[
      0
    ].ParsedText.split("\r\n");
    for (let i = 0; i < 3; i++) {
      finalResult.answers[i].content = answers[i]
        .replace(/(\r\n|\n|\r)/gm, "")
        .trim();
    }
  }
  analysedElements++;
  // Une fois aque les question et réponses ont été extraites, rechercher les occurences pour chaque réponse
  if (analysedElements === ELEMENT_TO_ANALYSE) {
    console.log("Request http...");
    finalResult.answers.map((a, index) => {
      requestQuestionAndFindOccurenceOfAnswer(finalResult.question, a, index);
    });
  }
}
// Appel l'api OCR.space avec l'url locale d'une image
function getTextFromImageUrl(imagePath, isQuestion) {
  var options = {
    apikey: API_KEY,
    language: LANGUAGE,
    imageFormat: IMAGE_FORMAT
  };
  ocrSpaceApi
    .parseImageFromLocalFile(imagePath, options)
    .then(parsedResult => {
      fillResultWithOCRData(parsedResult, isQuestion);
    })
    .catch(err => console.log("ERROR:", err));
}
//crop un image selon son path et sa crop config, puis les sauvegarde
function processImage(imagePath, cropConfig, isQuestion) {
  const resultPath = `${PATH_TO_CROPED_IMAGES}/${cropConfig.resultFilePath}`;
  PngCrop.crop(imagePath, resultPath, cropConfig.cropLocation, err => {
    if (err) {
      console.log("erreur crop", err);
    }
    getTextFromImageUrl(resultPath, isQuestion);
  });
}
//Démarre le crop et l'analyse
function analyseImages() {
  // Récupere le chemin de l'image à analyser en parametre, sinon prend une image par défaut.
  let initialImage = INITIAL_IMAGE_PATH;
  if (process.argv[2]) {
    initialImage = process.argv[2];
  }

  //processQuestion
  processImage(
    initialImage,
    {
      cropLocation: QUESTION_CROP_CONFIG,
      resultFilePath: QUESTION_FILE_NAME_CROPED_IMAGE
    },
    true
  );
  //process answer
  processImage(
    initialImage,
    {
      cropLocation: ANSWER_CROP_CONFIG,
      resultFilePath: ANSWER_FILE_NAME_CROPED_IMAGE
    },
    false
  );
}

function cleanData() {
  analysedElements = 0;
  linkOpened = 0;
  finalResult = {
    question: undefined,
    answers: [
      { content: "", score: 0 },
      { content: "", score: 0 },
      { content: "", score: 0 }
    ]
  };
}
function go() {
  scriptCall++;

  cleanData();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Appuis sur ENTRER pour analyser.", answer => {
    console.time("duration" + scriptCall);
    exec("screencapture -x -R517,45,458,815 ./images/hq_image.png;");
    setTimeout(analyseImages, 300);
    rl.close();
  });
}
go();
