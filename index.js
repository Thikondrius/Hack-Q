import Tesseract from 'tesseract.js'
Tesseract.recognize("./images/q1.png").then((result) =>  { 
    console.log("Résultat :")
    console.log(result.paragraphs[0].text)
 })
