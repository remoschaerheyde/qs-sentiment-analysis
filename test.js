const excelToJson = require('convert-excel-to-json');
const path = require('path');

const xlsFileStructure = {
    sourceFile: path.join(__dirname, './assets/data/qsDays.xlsx'),
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

  console.log(textObj)

