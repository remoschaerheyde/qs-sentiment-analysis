const language = require('@google-cloud/language');
const path = require('path');
const enigmaConfig = require('./assets/js/config/enigma-config');
const enigma = require('enigma.js');
const enigmaMixin = require('./assets/js/halyard_dist/halyard-enigma-mixin.js');
const Halyard = require('./assets/js/halyard_dist/halyard.js');
const excelToJson = require('convert-excel-to-json');

enigmaConfig.mixins = enigmaMixin;

// READ XLS  
const filePath = path.join(__dirname, './assets/data/qsDays.xlsx');
 
const feedbackExcel = excelToJson(
    {
    sourceFile: filePath,
    header:{
        rows: 1
    },
    columnToKey: {
      'A': '{{A1}}',
      'B': '{{B1}}',
      'C': '{{C1}}',
      'D': '{{D1}}',
    }
});

// Create array of TXT-objects to be analysed
let textObj = feedbackExcel.Feedback.map(val => {
  return {textId: val.FeedbackId, textText: val.FeedbackText}
});


// Analyse all 100 Texts // current limit by google nat lang
async function analyseText(textObj) {
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


// Create app in qlik sense
analyseText(textObj).then(analysedTextJson => {

  const individualSentencesJson = analysedTextJson.map(analysedText => analysedText.sentences.map(sentence => sentence)[0])

  const halyard = new Halyard()

  const feedbackTable = new Halyard.Table(filePath, {
    name:'userFeedback', fields: [
      { src: 'FeedbackId', name: '%FeedbackId'},
      { src: 'Datum', name: '%Datum'},
      { src: 'KundenId', name: '%KundenId'},
      { src: 'FeedbackText', name: 'FeedbackText'}
    ],
      headerRowNr: 0
  })

  const textEval = new Halyard.Table(analysedTextJson, {name:'Text-Eval', fields: [{src:'textId', name:'%FeedbackId'},{src: 'magnitude', name:'magnitude_text'}, {src:'sentiment', name:'sentiment_text'}, {expr: 'if(sentiment < 0.4 and sentiment > -0.4 and magnitude < 1.5 , \'Neutral\', \'Emotional\' )', name: 'sentiment_Kat' }]});
  const sentenceEval = new Halyard.Table(individualSentencesJson, {name:'Sentence-Eval', fields: [{src:'textId', name:'%FeedbackId'},{src: 'phrase'}, {src: 'magnitude', name:'magnitude_sentence'}, {src:'sentiment', name: 'sentiment_sentence'}]});

  halyard.addTable(feedbackTable);
  halyard.addTable(textEval);
  halyard.addTable(sentenceEval);

  
  enigma.create(enigmaConfig).open().then(qix => {
    console.log('after create')
    const appName = `__newApp`;
    qix.createAppUsingHalyard(appName, halyard).then(result => {
        console.log(`App created and reloaded - ${appName}.qvf`);
        process.exit(1);
        }, (err) => {console.log(err);});
    })
    .catch(err => console.log(err));

}).catch(err => {
  console.log(err)
})
