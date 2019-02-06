/**
 * halyard.js v1.3.1
 * Copyright (c) 2018 QlikTech International AB
 * This library is licensed under MIT - See the LICENSE file for full details
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.halyard = factory());
}(this, (function () { 'use strict';

  /**
   * Get folder path from file path
   * @private
   * @param {string} path
   * @returns {string}
   */
  function folderPath(path) {
    let folderPathMatch = path.match(/^(.*)(\\.*\..*$|\\.*)$/);

    if (folderPathMatch) {
      return folderPathMatch[1];
    }

    // Unix file path check
    folderPathMatch = path.match(/^(.*)(\/.*\..*$|\/.*)$/);

    return folderPathMatch && folderPathMatch[1];
  }

  /**
   * Get file name from file path
   * @private
   * @param {string} path
   * @returns {string}
   */
  function fileName(path) {
    let fileNameMatch = path.match(/^.*\\(.*\..*|.*)$/);

    if (fileNameMatch) {
      return fileNameMatch[1];
    }

    fileNameMatch = path.match(/^.*\/(.*\..*|.*)$/);

    return fileNameMatch && fileNameMatch[1];
  }

  /**
   * Get file extension from file path
   * @private
   * @param {string} path
   * @returns {string}
   */
  function fileExtension(path) {
    const fileExtensionMatch = path.match(/^.*\.(.*)$/);

    return fileExtensionMatch && fileExtensionMatch[1];
  }

  /**
   * Escape text with double quotes
   * @private
   * @param {string} text
   * @returns {string}
   */
  function escapeText(text) {
    return text.replace(/"/g, '""');
  }

  /**
   * Get a unique name
   * @private
   * @returns {string}
   */
  function uniqueName() {
    /* eslint no-bitwise: ["off"] */
    /* eslint no-mixed-operators: ["off"] */

    return 'xxxxx-8xxxx-yxxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate the field type
   * @private
   * @param {string} type
   * @returns {boolean}
   */
  function validFieldType(type) {
    const validFieldTypes = ['time', 'timestamp', 'date', 'interval'];

    type = type || '';

    return validFieldTypes.indexOf(type.toLowerCase()) > -1;
  }

  /**
   * Get indentation characters
   * @private
   * @returns {string}
   */
  function indentation() {
    return '  ';
  }

  /**
   * Get the field name
   * @private
   * @param {Field} field
   * @returns {string}
   */
  function getFieldName(field) {
    return field.name || field.src;
  }

  /**
   * A base set of methods used by Connections
   * @typedef {object} Connection
   * @property {string} path - The Path to a resource
   * @property {string} connectionType - The type can be either 'folder' or 'internet'
   */

  class ConnectionBase {
    /**
     * A base set of methods used by Connections
     * @public
     * @param {string} path - The Path to a resource
     * @param {string} connectionType - The type can be either 'folder' or 'internet'
     * @class
     */
    constructor(path, connectionType) {
      this.path = path;
      this.connectionType = connectionType;
      this.fileExtension = '';
    }

    /**
     * Returns specified file extension.
     * @public
     * @returns {string}
     */
    getFileExtension() {
      return this.fileExtension;
    }

    /**
     * Get specified connection type.
     * @public
     * @returns {string}
     */
    getConnectionType() {
      return this.connectionType;
    }

    /**
     * Get the QIX representation of a connection.
     * @public
     * @returns {{qName: (string), qConnectionString: (string), qType: (string)}}
     */
    getQixConnectionObject() {
      return {
        qName: this.getName(),
        qConnectionString: this.path,
        qType: this.getConnectionType(),
      };
    }

    /**
     * Get the name and if nothing is set then it will receive a unique name
     * @public
     * @returns {string}
     */
    getName() {
      if (!this.name) {
        this.name = uniqueName();
      }

      return this.name;
    }

    /**
     * Get the lib statement used in the load script to connect to a connection
     * @public
     * @returns {string}
     */
    getLibStatement() {
      return `lib://${this.getName()}`;
    }

    /**
     * Get the load script for this connection
     * @public
     * @returns {string}
     */
    getScript() {
      return `FROM [${this.getLibStatement()}]`;
    }
  }

  class FileConnection extends ConnectionBase {
    /**
     * File Connection representation. It will create a folder connection in QIX.
     * @public
     * @param {string} path - Absolute file path
     * @constructor
     */
    constructor(path) {
      super(folderPath(path), 'folder');

      this.fileName = fileName(path);

      this.fileExtension = fileExtension(path) || 'txt';
    }

    /**
     * Get the lib statement for the specified file path
     * @public
     * @returns {string}
     */
    getLibStatement() {
      return `${super.getLibStatement()}/${this.fileName}`;
    }
  }

  class WebFileConnection extends ConnectionBase {
    /**
     * Web file connector structure. It will setup everything to create a QIX internet connection.
     * @public
     * @param {string} url
     * @param {string} fileExtension
     */
    constructor(url, fileExtension) {
      super(url, 'internet');

      const fileExtensionMatch = url.match(/^https?:\/\/.*\/.*\.(\w*)\?.*$/)
        || url.match(/^https?:\/\/.*\/.*\.(\w*)$/);

      this.fileExtension = fileExtension || (fileExtensionMatch && fileExtensionMatch[1]) || 'html';
    }
  }

  class InlineData extends ConnectionBase {
    /**
     * Inline data representation. This is typically CSV formatted data.
     * @public
     * @param {string} data
     * @constructor
     */
    constructor(data) {
      super();

      this.data = data;

      this.fileExtension = 'txt';
    }

    /**
     * Get the load script representation
     * @public
     * @returns {string}
     */
    getScript() {
      return `INLINE "\n${escapeText(this.data)}\n"`;
    }

    /**
     * Get lib statement but there are none for inline data
     * @private
     */
    getLibStatement() {
    }

    /**
     * Get the QAE connection object but there are none for inline data
     * @private
     */
    getQixConnectionObject() {
    }
  }

  /**
   * Default set of Connections that are available
   * @constant
   * @type {object}
   */
  var Connections = {
    File: FileConnection,
    Web: WebFileConnection,
    Inline: InlineData,
  };

  /**
   * Escape values containing delimiter
   * @private
   * @param {string} data
   * @param {string} delimiter
   * @returns {string}
   */
  function escapeValueContainingDelimiter(data, delimiter) {
    if (data && typeof data === 'string' && (data.indexOf(delimiter) > -1 || data.indexOf('\n') > -1)) {
      return `"${data.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    }

    return data;
  }

  /**
   * Convert array date to a string in a csv format
   * @private
   * @param {array} data
   * @returns {string}
   */
  function convert(data) {
    if (data instanceof Array === false) {
      data = [data];
    }

    let csv = '';
    const delimiter = ',';

    const headers = Object.keys(data[0]);

    csv = `${csv + headers.map(header => escapeValueContainingDelimiter(header, delimiter))
    .join(delimiter)}\n`;

    let fields = [];

    for (let i = 0; i < data.length; i += 1) {
      fields = [];

      for (let j = 0; j < headers.length; j += 1) {
        fields.push(escapeValueContainingDelimiter(data[i][headers[j]], delimiter));
      }

      csv = `${csv + fields.join(delimiter)}\n`;
    }

    csv = csv.slice(0, -('\n'.length));

    return csv;
  }

  /**
   * Validate that the data is an JSON array
   * @private
   * @param {array} data
   * @returns {boolean}
   */
  function isJson(data) {
    if (data instanceof Array) {
      if (data[0] && typeof data[0] === 'object') {
        return true;
      }
    }

    return false;
  }

  class ConnectionLookup {
    /**
     * Utility to add a matching function and a connection type to make it easier to implicitly choose a connection
     * @private
     * @constructor
     */
    constructor() {
      this.connectionsRegistry = [];
    }

    /**
     * Connection matching callback to identify which connection to use for an implicitly declared source.
     * @callback connectionMatchingCallback
     * @param {string} data - Url, file path, csv data
     * @returns {Connection}
     */

    /**
     * Add a matching function with a connection instance
     * @private
     * @param {connectionMatchingCallback} matchingFn - Matching function to decide what connection function to invoke
     * @param {Connection} connection - Callback that returns a Connection instance
     */
    addConnection(matchingFn, connection) {
      this.connectionsRegistry.push({
        matchingFn,
        connection,
      });
    }

    /**
     * Find a match for connection based on the input data
     * @private
     * @param {string} data - The data can be an Url, a file path or a csv data blob
     * @returns {object}
     */
    findMatch(data) {
      for (let i = 0; i < this.connectionsRegistry.length; i += 1) {
        if (this.connectionsRegistry[i].matchingFn(data)) {
          return this.connectionsRegistry[i].connection(data);
        }
      }

      return data;
    }
  }

  const connectionMatcher = new ConnectionLookup();

  // url to a table file
  connectionMatcher.addConnection(data => typeof data === 'string' && data.match(/^https?:\/\/(.*)$/g), data => new Connections.Web(data));

  // Path to a table file
  connectionMatcher.addConnection(data => typeof data === 'string' && data.match(/^.*\.(.*)$/g), data => new Connections.File(data));

  // Inline JSON table to csv
  connectionMatcher.addConnection(
    data => data instanceof Array && isJson(data),
    data => new Connections.Inline(convert(data)),
  );

  // Inline csv table
  connectionMatcher.addConnection(data => typeof data === 'string', data => new Connections.Inline(data));

  /**
   * Validates supported character sets
   * @private
   * @param {string} characterSet
   * @returns {boolean|string}
   */
  function supportedCharacterSet(characterSet) {
    const validCharacterSets = ['utf8', 'unicode', 'ansi', 'oem', 'mac'];

    return (validCharacterSets.indexOf(characterSet) > -1 && characterSet)
      || (Number(characterSet).toString() !== 'NaN' && `codepage is ${characterSet}`);
  }

  /**
   * Get the QIX specific format of a file
   * @private
   * @param {{ fileExtension: string, headerRowNr: number, delimiter: string, characterSet: string, srcTable: string, noLabels: boolean }} options
   * @returns {string}
   */
  function formatSpecification(options) {
    if (!options) {
      options = {};
    }

    const formatSpecificationArr = [];

    if (options.fileExtension) {
      let fileFormat = options.fileExtension;

      if (fileFormat === 'xlsx') {
        fileFormat = 'ooxml';
      }

      if (fileFormat === 'csv') {
        fileFormat = 'txt';
      }

      if (fileFormat === 'htm') {
        fileFormat = 'html';
      }

      formatSpecificationArr.push(fileFormat);
    }

    if (options.headerRowNr || options.headerRowNr === 0) {
      formatSpecificationArr.push(`header is ${options.headerRowNr} lines`);
      // Should be included if header row is specified!
      formatSpecificationArr.push('embedded labels');
    }

    if (options.delimiter) {
      formatSpecificationArr.push(`delimiter is '${options.delimiter}'`);
    }

    if (options.characterSet && supportedCharacterSet(options.characterSet)) {
      formatSpecificationArr.push(supportedCharacterSet(options.characterSet));
    }

    if (options.srcTable) {
      formatSpecificationArr.push(`table is "${escapeText(options.srcTable)}"`);
    }

    if (options.noLabels) {
      formatSpecificationArr.push('no labels');
    }

    let formatSpecificationString = '';

    if (formatSpecificationArr.length > 0) {
      formatSpecificationString = `\n(${formatSpecificationArr.join(', ')})`;
    }

    return formatSpecificationString;
  }

  class Table {
    /**
     * Table definition
     * @public
     * @class
     * @param {Connection} connection
     * @param {object} options - Table options
     * @param {string} options.name - Table name
     * @param {Field[]} options.fields - Array of field objects
     * @param {string} options.prefix - Add prefix before the table
     * @param {string} options.section - Section to add table to
     * @constructor
     */
    constructor(connection, options) {
      this.connection = connectionMatcher.findMatch(connection);

      options = options || {};

      if (typeof options === 'string') {
        this.name = options;
        options = {};
      } else {
        this.name = options.name;
        this.fields = options.fields;
        this.prefix = options.prefix;
        if (options.section) {
          this.section = options.section;
        }
      }

      this.options = options;
    }

    /**
     * @typedef Field
     * @public
     * @property {string} src - Name in the data source of the field
     * @property {string} name - Name after reload
     * @property {string} type - Date, Time, TimeStamp
     * @property {string} inputFormat - Input format to explain how a field should be parsed.
     * @property {string} displayFormat - Display format that should be used after reload.
     * @property {string} expr - Customize how this field should be loaded with Qlik Script.
     */
    /**
     * Get the fields from a table
     * @public
     * @returns {Field[]} Array of fields
     */
    getFields() {
      return this.fields;
    }

    /**
     * Get the script representation of the field list. If nothing is specified than all the fields will be returned.
     * @public
     * @returns {string}
     */
    getFieldList() {
      if (this.fields) {
        return this.fields.map((field) => {
          let formattedInput = `"${escapeText(field.src || '')}"`;

          if (validFieldType(field.type)) {
            const format = field.type.toUpperCase();

            if (field.inputFormat) {
              formattedInput = `${format}#(${formattedInput}, '${field.inputFormat}')`;
            }

            if (field.displayFormat) {
              formattedInput = `${format}(${formattedInput}, '${field.displayFormat}')`;
            } else {
              formattedInput = `${format}(${formattedInput})`;
            }
          }

          if (field.expr) {
            formattedInput = field.expr;
          }


          if (!(field.name || field.src)) {
            throw (new Error(`A name or src needs to specified on the field: ${JSON.stringify(field)}`));
          }

          return `${indentation() + formattedInput} AS "${escapeText(field.name || field.src)}"`;
        }).join(',\n');
      }

      return '*';
    }

    /**
     * Is the table used as a proceeding load
     * @public
     * @returns {boolean}
     */
    isProceedingLoad() {
      return this.connection instanceof Table;
    }

    /**
     * Returns the specified prefix of the table if it exists.
     * The prefix can be for instance be a Qlik script snippet that always should be executed before the table is loaded.
     * @public
     * @returns {string}
     */
    getPrefix() {
      if (this.prefix) {
        return `${this.prefix}\n`;
      }
      return '';
    }

    /**
     * Get the script representation of the table
     * @public
     * @returns {string}
     */
    getScript() {
      // In the future this could be moved into a connectionMatcher
      // but for sake of clarity it is kept inline.
      if (this.isProceedingLoad()) {
        return `${this.getPrefix()}LOAD\n${this.getFieldList()};\n${this.connection.getScript()}`;
      }

      // Hack!
      if (this.connection.getFileExtension) {
        this.options.fileExtension = this.connection.getFileExtension();
      }

      return `${this.getPrefix()}LOAD\n${this.getFieldList()}\n${this.connection.getScript()}${formatSpecification(this.options)};`;
    }

    /**
     * Get the name of the table
     * @public
     * @returns {string}
     */
    getName() {
      return this.name || '';
    }

    /**
     * Get the section that the table belongs to
     * @public
     * @returns {string}
     */
    getSection() {
      return this.section;
    }

    /**
     * Returns the connection or table that the table uses.
     * @public
     * @returns {(Connection|Table)} Connection or Table
     */
    getConnection() {
      return this.connection;
    }
  }

  /**
   * @constant
   * @type {{timestamp: string, date: string, time: string, interval: string}}
   */
  const qTypes = {
    timestamp: 'TS',
    date: 'D',
    time: 'T',
    interval: 'IV',
  };

  /**
   * @constant
   * @type {{timestamp: string, text: string, numeric: string}}
   */
  const qDimensionType = {
    timestamp: 'T',
    text: 'D',
    numeric: 'N',
  };

  var hyperCubeSpecification = {
    qTypes,
    qDimensionType,
  };

  const DEFAULT_DELIMITER = ',';

  /**
   * If a dimension has mixed types
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeMixed(dimension) {
    return (
      dimension.qDimensionType === hyperCubeSpecification.qDimensionType.numeric
      && dimension.qTags.length === 0
    );
  }

  /**
   * Is dimension type a text
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeText(dimension) {
    return dimension.qDimensionType === hyperCubeSpecification.qDimensionType.text;
  }

  /**
   * Is dimension type a timestamp
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeTimestamp(dimension) {
    if (dimension.qDimensionType === hyperCubeSpecification.qDimensionType.timestamp) {
      return true;
    }
    if (
      dimension.qDimensionType === hyperCubeSpecification.qDimensionType.numeric
      && dimension.qNumFormat.qType === hyperCubeSpecification.qTypes.timestamp
    ) {
      return true;
    }
    return false;
  }

  /**
   * Is dimension type a date
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeDate(dimension) {
    if (
      dimension.qDimensionType === hyperCubeSpecification.qDimensionType.numeric
      && dimension.qNumFormat.qType === hyperCubeSpecification.qTypes.date
    ) {
      return true;
    }
    return false;
  }

  /**
   * Is dimension type a time
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeTime(dimension) {
    if (
      dimension.qDimensionType === hyperCubeSpecification.qDimensionType.numeric
      && dimension.qNumFormat.qType === hyperCubeSpecification.qTypes.time
    ) {
      return true;
    }
    return false;
  }

  /**
   * Is dimension type an interval
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {boolean}
   */
  function isDimensionTypeInterval(dimension) {
    if (
      dimension.qDimensionType === hyperCubeSpecification.qDimensionType.numeric
      && dimension.qNumFormat.qType === hyperCubeSpecification.qTypes.interval
    ) {
      return true;
    }
    return false;
  }

  /**
   * Get dimension type where the dimension matches one of the following text, mixed, timestamp, time, data, interval or num.
   * @private
   * @param {QAE.NxDimension} dimension
   * @returns {string}
   */
  function getDimensionType(dimension) {
    if (isDimensionTypeText(dimension)) {
      return 'text';
    }
    if (isDimensionTypeMixed(dimension)) {
      return 'mixed';
    }
    if (isDimensionTypeTimestamp(dimension)) {
      return 'timestamp';
    }
    if (isDimensionTypeTime(dimension)) {
      return 'time';
    }
    if (isDimensionTypeDate(dimension)) {
      return 'date';
    }
    if (isDimensionTypeInterval(dimension)) {
      return 'interval';
    }
    return 'num';
  }

  /**
   * Is numeric dimension type
   * @private
   * @param {string} dimensionType
   * @returns {boolean}
   */
  function isNumericDimensionType(dimensionType) {
    const numericDimensionTypes = [
      'timestamp',
      'interval',
      'time',
      'date',
      'num',
    ];
    dimensionType = dimensionType || '';
    return numericDimensionTypes.indexOf(dimensionType.toLowerCase()) > -1;
  }

  /**
   * Is field numeric
   * @private
   * @param {QAE.NxField} field
   * @returns {boolean}
   */
  function storeNumeric(field) {
    if (field.type === 'measure') {
      return true;
    }
    if (
      field.type === 'dimension' && isNumericDimensionType(field.dimensionType)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if field is a dual value
   * @private
   * @param {Field} field
   * @returns {boolean}
   */
  function checkIfFieldIsDual(field) {
    return field.type === 'dimension' && field.dimensionType === 'num';
  }

  /**
   * Has cell a dual value
   * @private
   * @param {QAE.NxCell} cell
   * @param {Field} field
   * @returns {boolean}
   */
  function isCellDual(cell, field) {
    return checkIfFieldIsDual(field) && cell.qText !== Number(cell.qNum).toString();
  }

  /**
   * Escape string containing delimiter
   * @private
   * @param {string} string
   * @param {string} delimiter
   * @returns {string}
   */
  function escapeStringContainingDelimiter(string, delimiter) {
    if (string.indexOf(delimiter) > -1 || string.indexOf('\n') > -1) {
      return `'${string.replace(/'/g, "''").replace(/\n/g, ' ')}'`;
    }
    return string;
  }

  /**
   * Get the numeric from cell value
   * @private
   * @param {QAE.NxCell} cell
   * @returns {number}
   */
  function getNumericCellValue(cell) {
    return cell.qNum;
  }

  /**
   * Get the text from a cell value
   * @private
   * @param {QAE.NxCell} cell
   * @returns {string}
   */
  function getTextCellValue(cell) {
    return escapeStringContainingDelimiter(cell.qText, DEFAULT_DELIMITER);
  }

  /**
   * Get the value of a cell
   * @private
   * @param {QAE.NxCell} cell
   * @param {Field} field
   * @returns {(string|number)}
   */
  function getCellValue(cell, field) {
    if (storeNumeric(field)) {
      return getNumericCellValue(cell);
    }
    return getTextCellValue(cell);
  }

  /**
   * Get dual data row
   * @private
   * @param {QAE.NxCell} cell
   * @returns {string}
   */
  function getDualDataRow(cell) {
    return `${cell.qNum}${DEFAULT_DELIMITER}${escapeStringContainingDelimiter(cell.qText, DEFAULT_DELIMITER)}`;
  }

  /**
   * Get dual headers from a field
   * @private
   * @param {Field} field
   * @returns {string}
   */
  function getDualHeadersForField(field) {
    return `${field.name}${DEFAULT_DELIMITER}${field.name}_qText}`;
  }

  class HyperCube {
    /**
     * Hypercube representation
     * @public
     * @class
     * @param {object} hyperCubeLayout - The QIX representation of a hypercube
     * @param {object} options - Hypercube options
     * @param {string} name - Name
     * @param {string} section - Section to add hypercube data to
     * @constructor
     */
    constructor(hyperCubeLayout, options) {
      this.items = [];
      this.fields = [];
      this.hyperCubeLayout = this.validateHyperCubeLayout(hyperCubeLayout);

      options = options || {};

      if (typeof options === 'string') {
        this.name = options;
        options = {};
      } else {
        this.name = options.name;
        if (options.section) {
          this.section = options.section;
        }
      }

      this.parseHyperCubeLayout(options);

      this.options = options;
    }

    /**
     * Validate the hypercube layout
     * @private
     * @param {object} hyperCubeLayout
     * @returns {object} hyperCubeLayout
     */
    validateHyperCubeLayout(hyperCubeLayout) {
      if (!hyperCubeLayout) { throw new Error('Hyper cube layout is undefined'); }
      if (!hyperCubeLayout.qDimensionInfo) { throw new Error('qDimensionInfo is undefined'); }
      if (!hyperCubeLayout.qMeasureInfo) { throw new Error('qMeasureInfo is undefined'); }
      if (hyperCubeLayout.qMode === 'P') { throw new Error('Cannot add hyper cube in pivot mode, qMode:P(DATA_MODE_PIVOT) is not supported'); }
      if (hyperCubeLayout.qMode === 'K') { throw new Error('Cannot add hyper cube in stacked mode, qMode:K(DATA_MODE_PIVOT_STACK) is not supported'); }
      if (hyperCubeLayout.qMode === 'S') {
        this.validateDataPages(hyperCubeLayout.qDataPages);
        this.validateDataPagesCoverage(hyperCubeLayout.qDataPages, hyperCubeLayout);
        return hyperCubeLayout;
      }
      throw new Error('HyperCubeLayout is not valid');
    }

    /**
     * Validates the datapages of the hypercube
     * @private
     * @param {object} dataPages
     */
    validateDataPages(dataPages) {
      if (!dataPages) {
        throw new Error('qDataPages are undefined');
      }

      if (dataPages[0].qArea && dataPages[0].qArea.qTop > 0) {
        throw new Error('qDataPages first page should start at qTop: 0.');
      }
    }

    /**
     * Validates that all datapages in the hypercube is covered
     * @private
     * @param {object[]} dataPages
     * @param {object} hyperCubeLayout
     */
    validateDataPagesCoverage(dataPages, hyperCubeLayout) {
      let qHeight = 0;

      dataPages.forEach((dataPage) => {
        this.validateQMatrix(dataPage);
        this.validateQArea(dataPage, hyperCubeLayout, qHeight);
        qHeight += dataPage.qArea.qHeight;
      }, this);

      if (hyperCubeLayout.qSize.qcy !== qHeight) {
        throw new Error('qDataPages are missing pages.');
      }
    }

    /**
     * Validates the QMatrix in the datapage
     * @private
     * @param {object} dataPage
     */
    validateQMatrix(dataPage) {
      if (!dataPage.qMatrix) {
        throw new Error('qMatrix of qDataPages are undefined');
      }
      if (dataPage.qMatrix.length === 0) {
        throw new Error('qDataPages are empty');
      }
    }

    /**
     * Validates the QArea in the datapage
     * @private
     * @param {object} dataPage
     * @param {object} hyperCubeLayout
     * @param {number} qHeight
     */
    validateQArea(dataPage, hyperCubeLayout, qHeight) {
      if (!dataPage.qArea) {
        throw new Error('qArea of qDataPages are undefined');
      }
      if (dataPage.qArea.qLeft > 0) {
        throw new Error('qDataPages have data pages that\'s not of full qWidth.');
      }
      if (dataPage.qArea.qWidth < hyperCubeLayout.qSize.qcx) {
        throw new Error('qDataPages have data pages that\'s not of full qWidth.');
      }
      if (dataPage.qArea.qTop < qHeight) {
        throw new Error('qDataPages have overlapping data pages.');
      }
      if (dataPage.qArea.qTop > qHeight) {
        throw new Error('qDataPages are missing pages.');
      }
    }

    /**
     * Parses the hypercube an extracts the data
     * @private
     */
    parseHyperCubeLayout() {
      const that = this;
      that.fields = that.getFieldsFromHyperCubeLayout();
      that.data = that.getDataFromHyperCubeLayout();
      const inlineData = `${that.fields
      .map(field => field.name)
      .join(',')}\n${this.data}`;
      let hasDual = false;
      that.fields.forEach((field) => {
        if (field.isDual) {
          hasDual = true;
          that.items.push(that.getMapTableForDualField(field));
        }
      });
      const options = {
        name: that.name,
        fields: that.getFieldsDefinition(that.fields),
      };
      if (that.section && !hasDual) {
        options.section = that.section;
      }
      that.items.push(new Table(inlineData, options));
    }

    /**
     * Get the Fields definition
     * @private
     * @param {object[]} fields
     * @returns {object[]} fields
     */
    getFieldsDefinition(fields) {
      return fields.map((field) => {
        const mappedField = { name: field.name };
        if (validFieldType(field.dimensionType)) {
          mappedField.type = field.dimensionType;
          mappedField.displayFormat = field.displayFormat;
        }
        if (field.isDual) {
          mappedField.expr = `Dual(ApplyMap('MapDual__${field.name}', "${field.name}"), "${field.name}")`;
        } else {
          mappedField.src = field.name;
        }
        return mappedField;
      });
    }

    /**
     * Return qmatrix with dual fields
     * @private
     * @param {object} qMatrix
     * @param {object} field
     * @returns {object} field
     */
    mapDualFieldQMatrix(qMatrix, field) {
      function uniqueFilter(value, index, self) {
        return self.indexOf(value) === index;
      }
      return qMatrix
        .map(row => getDualDataRow(row[field.index]))
        .filter(uniqueFilter);
    }

    /**
     * Get table with dual fields
     * @private
     * @param {object} field
     * @returns {object} Table
     */
    getMapTableForDualField(field) {
      const that = this;
      const concatQMatrix = that.hyperCubeLayout.qDataPages.reduce(
        (prev, curr) => [...prev, ...curr.qMatrix],
        [],
      );
      const data = that.mapDualFieldQMatrix(concatQMatrix, field);
      const headers = getDualHeadersForField(field);
      const inlineData = `${headers}\n${data.join('\n')}`;
      const name = `MapDual__${field.name}`;
      const options = { name, prefix: 'Mapping' };
      if (this.section && this.items.length === 0) {
        options.section = this.section;
      }
      return new Table(inlineData, options);
    }

    /**
     * Extracts the data from the hypercube layout as a csv representation
     * @private
     * @returns {string}
     */
    getDataFromHyperCubeLayout() {
      const that = this;
      const data = that.hyperCubeLayout.qDataPages
        .map(dataPage => dataPage.qMatrix
          .map(row => row
            .map((cell, index) => {
              const field = that.fields[index];
              if (!field.isDual && isCellDual(cell, field)) {
                field.isDual = true;
              }
              return getCellValue(cell, field);
            })
            .join(','))
          .join('\n'))
        .join('\n');
      return data;
    }

    /**
     * Get the fields from the hypercube
     * @private
     * @returns {{type: string, dimensionType: string, name: string, displayFormat: string, index: number }[]} - An array of dimension and measures
     */
    getFieldsFromHyperCubeLayout() {
      const that = this;
      const fields = [];
      for (let i = 0; i < that.hyperCubeLayout.qDimensionInfo.length; i += 1) {
        fields.push({
          type: 'dimension',
          dimensionType: getDimensionType(that.hyperCubeLayout.qDimensionInfo[i]),
          name: that.hyperCubeLayout.qDimensionInfo[i].qFallbackTitle,
          displayFormat: that.hyperCubeLayout.qDimensionInfo[i].qNumFormat.qFmt,
          index: i,
        });
      }
      for (let j = 0; j < that.hyperCubeLayout.qMeasureInfo.length; j += 1) {
        fields.push({
          type: 'measure',
          name: that.hyperCubeLayout.qMeasureInfo[j].qFallbackTitle,
          index: that.hyperCubeLayout.qDimensionInfo.length + j,
        });
      }
      return fields;
    }

    /**
     * Get tables from the hypercube
     * @public
     * @returns {object[]} Tables
     */
    getItems() {
      return this.items;
    }
  }

  class SetStatement {
    /**
     * Define set statements
     * @class
     * @public
     * @param {object} defaultSetStatements - A representation where each property name will be used as key and the property will be the value
     * @constructor
     */
    constructor(defaultSetStatements) {
      this.defaultSetStatements = defaultSetStatements;
    }

    /**
     * Get the entire set statement as script
     * @public
     * @returns {string}
     */
    getScript() {
      return Object.keys(this.defaultSetStatements)
        .map(key => `SET ${key}='${Array.isArray(this.defaultSetStatements[key])
        ? this.defaultSetStatements[key].join(';') : this.defaultSetStatements[key]}';`)
        .join('\n');
    }

    /**
     * Always returns the name as empty
     * @public
     * @returns {string}
     */
    getName() {
      return '';
    }
  }

  class DerivedFieldsTemplate {
    /**
     * Declare fields that can be derived from a template. An example can be a calendar template.
     * @public
     * @param {object} options - Derived Field Template definition.
     * @param {callback} options.fieldMatchFunction - Matching function that will apply a field template definition.
     * @param {string} options.name - Name of derived field.
     * @param {string} options.fieldTag - What field tag that will be used in the derived field.
     * @param {string} options.derivedFieldDefinition - What script definition should be used in the derived field.
     * @constructor
     */
    constructor(options) {
      this.getFieldFn = options.fieldMatchFunction;
      this.name = options.name;
      this.fieldTag = options.fieldTag;
      this.derivedFieldDefinition = options.derivedFieldDefinition;
    }

    /**
     * Returns the script
     * @public
     * @returns {string}
     */
    getScript() {
      const fields = this.getFieldFn() || [];

      if (fields.length > 0) {
        return this.getDefinition(fields.map(getFieldName));
      }

      return undefined;
    }

    /**
     * Get the script definition for a set of specific fields
     * @public
     * @param {string[]} fieldNames - An array of strings with field names.
     * @returns {string}
     */
    getDefinition(fieldNames) {
      return `"${escapeText(this.name)}":
DECLARE FIELD DEFINITION Tagged ('$${this.fieldTag}')
FIELDS
${this.derivedFieldDefinition}
DERIVE FIELDS FROM FIELDS [${fieldNames.join(', ')}] USING "${escapeText(this.name)}";`;
    }
  }

  const derivedFieldsDefinition = `Dual(Year($1), YearStart($1)) AS [Year] Tagged ('$axis', '$year'),
  Dual('Q'&Num(Ceil(Num(Month($1))/3)),Num(Ceil(NUM(Month($1))/3),00)) AS [Quarter] Tagged ('$quarter', '$cyclic'),
  Dual(Year($1)&'-Q'&Num(Ceil(Num(Month($1))/3)),QuarterStart($1)) AS [YearQuarter] Tagged ('$yearquarter', '$qualified'),
  Dual('Q'&Num(Ceil(Num(Month($1))/3)),QuarterStart($1)) AS [_YearQuarter] Tagged ('$yearquarter', '$hidden', '$simplified'),
  Month($1) AS [Month] Tagged ('$month', '$cyclic'),
  Dual(Year($1)&'-'&Month($1), monthstart($1)) AS [YearMonth] Tagged ('$axis', '$yearmonth', '$qualified'),
  Dual(Month($1), monthstart($1)) AS [_YearMonth] Tagged ('$axis', '$yearmonth', '$simplified', '$hidden'),
  Dual('W'&Num(Week($1),00), Num(Week($1),00)) AS [Week] Tagged ('$weeknumber', '$cyclic'),
  Date(Floor($1)) AS [Date] Tagged ('$axis', '$date', '$qualified'),
  Date(Floor($1), 'D') AS [_Date] Tagged ('$axis', '$date', '$hidden', '$simplified'),
  If (DayNumberOfYear($1) <= DayNumberOfYear(Today()), 1, 0) AS [InYTD] ,
Year(Today())-Year($1) AS [YearsAgo] ,
  If (DayNumberOfQuarter($1) <= DayNumberOfQuarter(Today()),1,0) AS [InQTD] ,
4*Year(Today())+Ceil(Month(Today())/3)-4*Year($1)-Ceil(Month($1)/3) AS [QuartersAgo] ,
Ceil(Month(Today())/3)-Ceil(Month($1)/3) AS [QuarterRelNo] ,
  If(Day($1)<=Day(Today()),1,0) AS [InMTD] ,
12*Year(Today())+Month(Today())-12*Year($1)-Month($1) AS [MonthsAgo] ,
Month(Today())-Month($1) AS [MonthRelNo] ,
  If(WeekDay($1)<=WeekDay(Today()),1,0) AS [InWTD] ,
(WeekStart(Today())-WeekStart($1))/7 AS [WeeksAgo] ,
Week(Today())-Week($1) AS [WeekRelNo];`;

  /**
   * A field matching callback to identify which fields that are associated with a specific calendarTemplate.
   * @callback fieldMatchingCalendarCallback
   * @param {string} calendarTemplate
   * @param {Field}
   */

  /**
   * Get the derived field definition for a field that matches the pattern
   * @public
   * @param {fieldMatchingCalendarCallback} fn - Field matcher function
   * @returns {DerivedFieldsTemplate}
   */
  function getCalenderDerivedFieldDefinition(fn) {
    return new DerivedFieldsTemplate({
      name: 'autoCalendar',
      fieldTag: 'date',
      derivedFieldDefinition: derivedFieldsDefinition,
      fieldMatchFunction: () => fn(f => f.calendarTemplate),
    });
  }

  const SCRIPT_BLOCK_SPACING = '\n\n';

  class Halyard {
    /**
     * Representation of tables or hypercubes to load
     * @class
     * @public
     * @constructor
     */
    constructor() {
      this.defaultSetStatements = {};
      this.items = [];
      this.addItem(new SetStatement(this.defaultSetStatements));
      this.lastItems = [getCalenderDerivedFieldDefinition(x => this.getFields(x))];
    }

    /**
     * Get connections object that are used in the model
     * @public
     * @returns {Connection[]}
     */
    getConnections() {
      return this.items.filter(item => item.getConnection).map(item => item.getConnection());
    }

    /**
     * Get the QIX connections definitions that are used in the model
     * @public
     * @returns {{qName: (string), qConnectionString: (string), qType: (string)}
     */
    getQixConnections() {
      return this.getConnections().map(connection => connection.getQixConnectionObject())
        .filter(connection => connection);
    }

    /**
     * Field matching callback to identify if a field matches another
     * @callback fieldMatchingCallback
     * @param {Field} field
     * @param {boolean}
     */

    /**
     * Get fields that matches pattern sent in as params
     * @public
     * @param {fieldMatchingCallback} matcherFn
     * @returns {Field[]}
     */
    getFields(matcherFn) {
      matcherFn = matcherFn || (() => true);

      const fields = [];

      this.items.forEach((item) => {
        if (item.getFields && item.getFields()) {
          fields.push(...item.getFields().filter(matcherFn));
        }
      });

      return fields;
    }

    /**
     * Configure the default set statements like time, date, currency formats
     * @public
     * @param {SetStatement} defaultSetStatements
     * @param {boolean} preservePreviouslyEnteredValues
     */
    setDefaultSetStatements(defaultSetStatements, preservePreviouslyEnteredValues) {
      const that = this;

      Object.keys(defaultSetStatements).forEach((key) => {
        if (!(preservePreviouslyEnteredValues && that.defaultSetStatements[key])) {
          that.defaultSetStatements[key] = defaultSetStatements[key];
        }
      });
    }

    /**
     * Get the script for a item (table, preceeding load)
     * @public
     * @param {(Table|HyperCube)} item
     * @returns {string}
     */
    getItemScript(item) {
      let itemScript = item.getScript();

      if (item.getName && item.getName()) {
        if (item.section) {
          itemScript = `///$tab ${escapeText(item.section)}\n"${escapeText(item.getName())}":\n${itemScript}`;
        } else {
          itemScript = `"${escapeText(item.getName())}":\n${itemScript}`;
        }
      }

      return itemScript;
    }

    /**
     * Fetch all script blocks
     * @public
     * @returns {string[]}
     */
    getAllScriptBlocks() {
      return this.items.concat(this.lastItems).filter(item => item.getScript());
    }

    /**
     * Fetches the entire script
     * @public
     * @returns {string}
     */
    getScript() {
      return this.getAllScriptBlocks().map(item => this.getItemScript(item))
        .join(SCRIPT_BLOCK_SPACING);
    }

    /**
     * Add hyper cube explicit or implicitly
     * @public
     * @param {Hypercube} arg1 - Hypercube
     * @param {object} options - Hypercube options
     * @param {string} options.name - Name
     * @param {string} options.section - Section to add hypercube data to
     * @returns {Hypercube} Hypercube
     */
    addHyperCube(arg1, options) {
      let newHyperCube;

      if (arg1 instanceof HyperCube) {
        newHyperCube = arg1;
      } else {
        newHyperCube = new HyperCube(arg1, options);
      }

      for (let i = 0; i < newHyperCube.items.length; i += 1) {
        this.checkIfItemNameExists(newHyperCube.items[i]);
      }

      for (let i = 0; i < newHyperCube.items.length; i += 1) {
        this.addItem(newHyperCube.items[i]);
      }

      return newHyperCube;
    }

    /**
     * Support to add table explicit or implicitly
     * @public
     * @param {Table} arg1 - Table
     * @param {object} options
     * @param {string} options.name - Table name
     * @param {Field[]} options.fields - Array of field objects
     * @param {string} options.prefix - Add prefix before the table
     * @param {string} options.section - Section to add table to
     * @returns {object} Table
     */
    addTable(arg1, options) {
      let newTable;

      if (arg1 instanceof Table) {
        newTable = arg1;
      } else {
        newTable = new Table(arg1, options);
      }

      return this.addItem(newTable);
    }

    /**
     * Verify that item doesn't exist in model
     * @public
     * @param {(Table|Hypercube)} newItem - Table or Hypercube
     */
    checkIfItemNameExists(newItem) {
      if (newItem.getName && newItem.getName()) {
        if (this.items.filter(item => item.getName() === newItem.getName()).length > 0) {
          throw new Error('Cannot add another table with the same name.');
        }
      }
    }

    /**
     * Add new item to the model
     * @public
     * @param {(Table|Hypercube)} newItem - Table or Hypercube
     * @returns {(Table|Hypercube)} - Table or Hypercube
     */
    addItem(newItem) {
      this.checkIfItemNameExists(newItem);

      this.items.push(newItem);

      return newItem;
    }

    /**
     * Locate which item that generated a script at the specified character position
     * @public
     * @param {number} charPosition
     * @returns {(Table|Hypercube)} - Table or Hypercube
     */
    getItemThatGeneratedScriptAt(charPosition) {
      const allScriptBlocks = this.getAllScriptBlocks();
      let scriptBlockStartPosition = 0;

      for (let i = 0; i < allScriptBlocks.length; i += 1) {
        const itemScript = this.getItemScript(allScriptBlocks[i]);
        const scriptBlockEndPosition = scriptBlockStartPosition
            + (`${itemScript}${SCRIPT_BLOCK_SPACING}`).length;

        if (scriptBlockStartPosition <= charPosition && charPosition <= scriptBlockEndPosition) {
          return allScriptBlocks[i];
        }

        scriptBlockStartPosition = scriptBlockEndPosition;
      }

      return undefined;
    }
  }

  Halyard.Table = Table;

  Halyard.HyperCube = HyperCube;

  Halyard.Connections = Connections;

  if (typeof module !== 'undefined') {
    module.exports = Halyard;
  }

  return Halyard;

})));
//# sourceMappingURL=halyard.js.map
