console.time("duration");

import PngCrop from "png-crop";
import axios from "axios";
import ocrSpaceApi from "ocr-space-api";

//fichier d'entrée
const INITIAL_IMAGE_PATH = "./images/hq_image.png";

//OCR API
const ocrURL = "https://api.ocr.space/parse/image";
const API_KEY = "597c38f59188957";
const LANGUAGE = "eng";
const IMAGE_FORMAT = "image/png";

// Objet résultat d'analyse
const finalResult = {
  question: undefined,
  answers: []
};

const ELEMENT_TO_ANALYSE = 2;
let analysedElements = 0;

//Configuration pour les crops
const ANSWER_CROP_CONFIG = { width: 626, height: 440, top: 516, left: 50 };
const QUESTION_CROP_CONFIG = { width: 628, height: 278, top: 232, left: 50 };

const PATH_TO_CROPED_IMAGES = "./images/cropedImages";
const ANSWER_FILE_NAME_CROPED_IMAGE = "answer_croped.png";
const QUESTION_FILE_NAME_CROPED_IMAGE = "question_croped.png";

const fillResultWithOCRData = (parsedResult, isQuestion) => {
  //retire les caracteres non désiré de la réponse OCR
  if (isQuestion) {
    finalResult.question = parsedResult.parsedText
      .replace(/(\r\n)/g, "")
      .trim();
  } else {
    const answers = parsedResult.ocrParsedResult.ParsedResults[
      0
    ].ParsedText.split("\r\n");
    for (let i = 0; i < 3; i++) {
      finalResult.answers[i] = answers[i].replace(/(\r\n|\n|\r)/gm, "").trim();
    }
  }
  analysedElements++;
  if (analysedElements === ELEMENT_TO_ANALYSE) {
    console.log(finalResult);
    console.timeEnd("duration");
  }
};
// Appel l'api OCR.space avec l'url locale d'une image
const getTextFromImageUrl = (imagePath, isQuestion) => {
  var options = {
    apikey: API_KEY,
    language: LANGUAGE,
    imageFormat: IMAGE_FORMAT
  };
  ocrSpaceApi
    .parseImageFromLocalFile(imagePath, options)
    .then(parsedResult => fillResultWithOCRData(parsedResult, isQuestion))
    .catch(err => console.log("ERROR:", err));
};

//crop un image selon son path et sa crop config, puis les sauvegarde
const processImage = (imagePath, cropConfig, isQuestion) => {
  const resultPath = `${PATH_TO_CROPED_IMAGES}/${cropConfig.resultFilePath}`;
  PngCrop.crop(imagePath, resultPath, cropConfig.cropLocation, err => {
    getTextFromImageUrl(resultPath, isQuestion);
  });
};

let initialImage = INITIAL_IMAGE_PATH;
if (process.argv[2]) {
  initialImage = process.argv[2];
} else {
  throw new Error("Veuillez renseigner un chemin vers l'image HQ à analyser");
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
