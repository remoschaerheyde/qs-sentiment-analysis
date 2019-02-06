# Sentiment Analysis with Qlik Sense

A simple node script that conducts a sentiment anaysis and creates a finished Qlik Sense data model based on user feedback from an excel file.

## Prerequisites

For this example to work you need a local Qlik Sense Desktop installation and Node.js installed on your machine. Be aware that Qlik Sense Desktop needs to be running in the background when the node script is being excecuted. Please also make sure that you refrence the correct schema version that corresponds to engine version of your Qlik Sense Desktop installation in your enigma-config.js file in the /assets/js/config directory. You can find the engine version of your current Qlik Sense installation the Qlik API-insights page: https://api-insights.qlik.com.

Furthermore, you also need a valid google account and a json file that contains the api-key for the Natural Language Api. Please simply follow the quickstart guide in the documentation of the Google natural language documentation: https://cloud.google.com/natural-language/docs/quickstart-client-libraries

## Installation

Download or clone the git repository and install the required dependencies from inside the folder location via npm

```
npm install
```

run the npm start script to excecute the script...

```
npm run start
```


## Built With

* [enigma.js](https://github.com/qlik-oss/enigma.js/) - JS framework to interact with the Qlik Sense Engine API
* [halyard.js](https://github.com/qlik-oss/halyard.js) - JS library to create Qlik Sense apps using common web standards
* [Google Nat Lang](https://github.com/googleapis/nodejs-language#readme) - JS library to interact with Google's nat. lang. API
* [convert-excel-to-json](https://github.com/DiegoZoracKy/convert-excel-to-json) - Used to convert excel files to json objects

## Authors

* **Remo Schaer**

## License

This project is licensed under the MIT License.

