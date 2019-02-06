# Sentiment Analysis with Qlik Sense, enigma.js and halyard.js

A simple sentiment analysis using the Google Natural Language API and Qlik Sense

### Prerequisites

For this example to work you need a local Qlik Sense Desktop installation and Node.js installed on your machine. Be aware that Qlik Sense Desktop needs to be running in the background when the node script is being excecuted. Please also make sure that you refrence the correct schema version that corresponds to engine version of your Qlik Sense Desktop installation in your enigma-config.js file in the /assets/js/config directory. You can find the engine version of your current Qlik Sense installation the Qlik API-insights page: https://api-insights.qlik.com.

Furthermore, you also need a valid google account and a json file that contains the api-key for the Natural Language Api. Please simply follow the quickstart guide in the documentation of the Google natural language documentation: https://cloud.google.com/natural-language/docs/quickstart-client-libraries

### Installing

Download or clone the git repository and install that required dependencies via npm.


```
npm install
```

Run main.js via npm

```
npm run start
```

## Built With

* [enigma.js](https://github.com/qlik-oss/enigma.js/) - Framework to interact with the Qlik Sense engine
* [halyard.js](https://github.com/qlik-oss/halyard.js) - JS library to create Qlik Sense apps using common web standards
* [Google Nat Lang](https://github.com/googleapis/nodejs-language#readme) - JS library to interact with Google's nat. lang. API
* [convert-excel-to-json](https://github.com/DiegoZoracKy/convert-excel-to-json) - Used to convert excel files to json objects

## Authors

* **Remo Schaer**

## License

This project is licensed under the MIT License.

