const language = require('@google-cloud/language');
const path = require('path');
const enigmaConfig = require('./assets/js/config/enigma-config');
const enigma = require('enigma.js');
const enigmaMixin = require('./assets/js/halyard_dist/halyard-enigma-mixin.js');
const Halyard = require('./assets/js/halyard_dist/halyard.js');
const excelToJson = require('convert-excel-to-json');

enigmaConfig.mixins = enigmaMixin;

const APP_NAME = `__newApp`;
const FILE_PATH = path.join(__dirname, './assets/data/qsDays.xlsx');
const xlsFileStructure = {
  sourceFile: FILE_PATH,
  header:{rows: 1},
  columnToKey: {
      'A': '{{A1}}',
      'B': '{{B1}}',
      'C': '{{C1}}',
      'D': '{{D1}}',
    }
}

let texts = excelToJson(xlsFileStructure);
let fieldNames = Object.keys(texts.Feedback[0])
let textObj = texts.Feedback.map(text => ({textId: text[fieldNames[0]], textText: text[fieldNames[3]]}));

async function SentimentAnalysis(textObj) {
    const client = new language.LanguageServiceClient();
    
    let analysedTxt = textObj.map(async text => {
      let document = {
        content: text.textText,
        type: 'PLAIN_TEXT'
      };
      let result = await client.analyzeSentiment({document: document})
      
      let sentiment = result[0].documentSentiment;

      let sentences = result[0].sentences.map(sentence => {
        return {
          textId: text.textId,
          phrase: sentence.text.content,
          magnitude: sentence.sentiment.magnitude,
          sentiment: sentence.sentiment.magnitude,
        }
      })
      return {textId: text.textId, magnitude: sentiment.magnitude, sentiment: sentiment.score, sentences: sentences}
    })
  return await Promise.all(analysedTxt)
};

SentimentAnalysis(textObj).then(async analysedTextJson => {

  // Create Qlik Sense APP
  const individualSentencesJson = analysedTextJson.map(analysedText => analysedText.sentences.map(sentence => sentence)[0])

  const halyard = new Halyard()

  // create Master data table
  const feedbackTable = new Halyard.Table(FILE_PATH, {
    name:'userFeedback', fields: [
      { src: fieldNames[0], name: '%FeedbackId'},
      { src: fieldNames[1], name: '%Datum'},
      { src: fieldNames[2], name: '%KundenId'},
      { src: fieldNames[3], name: 'FeedbackText'}
    ],
      headerRowNr: 0
  })

  const textEval = new Halyard.Table(analysedTextJson, {name:'Text-Eval', fields: [{src:'textId', name:'%FeedbackId'},{src: 'magnitude', name:'magnitude_text'}, {src:'sentiment', name:'sentiment_text'}, {expr: 'if(sentiment < 0.4 and sentiment > -0.4 and magnitude < 1.5 , \'Neutral\', \'Emotional\' )', name: 'sentiment_Kat' }]});
  const sentenceEval = new Halyard.Table(individualSentencesJson, {name:'Sentence-Eval', fields: [{src:'textId', name:'%FeedbackId'},{src: 'phrase'}, {src: 'magnitude', name:'magnitude_sentence'}, {src:'sentiment', name: 'sentiment_sentence'}]});

  halyard.addTable(feedbackTable);
  halyard.addTable(textEval);
  halyard.addTable(sentenceEval);

  // open qlik sense
  const qix = await enigma.create(enigmaConfig).open()
  
  try {
      let result = await qix.reloadAppUsingHalyard(APP_NAME, halyard, true)
      console.log(`App created and reloaded - ${APP_NAME}.qvf`);
      process.exit(1);
  } catch(err) {
      console.log('could not create app')
      process.exit(1);
  }
  
})