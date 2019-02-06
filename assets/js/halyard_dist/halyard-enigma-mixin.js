/**
 * halyard.js v1.3.1
 * Copyright (c) 2018 QlikTech International AB
 * This library is licensed under MIT - See the LICENSE file for full details
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

  /**
   * @public
   * @param {{qThousandSep: string, qDecimalSep: string qMoneyThousandSep: string, qMoneyDecimalSep: string, qMoneyFmt: string,
   * qTimeFmt: string, qDateFmt: string, qTimestampFmt: string, qFirstWeekDay: string, qReferenceDay: string,
   * qFirstMonthOfYear: string, qCollation: string, qMonthNames: string,
   * qLongMonthNames: string, qDayNames: string, qLongDayNames: string }} localInfoData
   * @returns {{ThousandSep: string, DecimalSep: string, MoneyThousandSep: string, MoneyDecimalSep: string,
   * MoneyFormat: string, TimeFormat: string, DateFormat: string, TimestampFormat: string, FirstWeekDay: string,
   * ReferenceDay: string, FirstMonthOfYear: string, CollationLocale: string, MonthNames: string, LongMonthNames: string,
   * DayNames: string, LongDayNames: string}}
   */
  function convertQixGetLocalInfo(localInfoData) {
    return {
      ThousandSep: localInfoData.qThousandSep,
      DecimalSep: localInfoData.qDecimalSep,
      MoneyThousandSep: localInfoData.qMoneyThousandSep,
      MoneyDecimalSep: localInfoData.qMoneyDecimalSep,
      MoneyFormat: localInfoData.qMoneyFmt,
      TimeFormat: localInfoData.qTimeFmt,
      DateFormat: localInfoData.qDateFmt,
      TimestampFormat: localInfoData.qTimestampFmt,
      FirstWeekDay: localInfoData.qFirstWeekDay,
      ReferenceDay: localInfoData.qReferenceDay,
      FirstMonthOfYear: localInfoData.qFirstMonthOfYear,
      CollationLocale: localInfoData.qCollation,
      MonthNames: localInfoData.qCalendarStrings.qMonthNames,
      LongMonthNames: localInfoData.qCalendarStrings.qLongMonthNames,
      DayNames: localInfoData.qCalendarStrings.qDayNames,
      LongDayNames: localInfoData.qCalendarStrings.qLongDayNames,
    };
  }

  const CONNECTION_ERROR = 'Connection Error';
  const LOADING_ERROR = 'Loading Error';
  const SYNTAX_ERROR = 'Syntax Error';
  /**
   * Create error message
   * @private
   * @param {string} errorType
   * @param {object} qixError
   * @param {(Table|HyperCube)} item
   * @returns {{type: string, message: string, item: object, qixError: string}}
   */
  function createErrorMessage(errorType, qixError, item) {
    return {
      type: errorType,
      message: qixError.message || qixError.qErrorString,
      item,
      qixError,
    };
  }

  const halyardMixin = {
    types: 'Global',
    init(args) {
      if (args.config) {
        args.api.Promise = args.config.Promise;
      } else {
        args.api.Promise = args.Promise;
      }
    },
    extend: {
      /**
       * Creates a session app based on the model in the halyard instance
       * @public
       * @param {Halyard} halyard - A halyard instance
       * @returns {Promise.<TResult>}
       */
      createSessionAppUsingHalyard(halyard) {
        const that = this;
        return that.createSessionApp().then(app => that.setScriptAndReloadWithHalyard(app, halyard, false));
      },

      /**
       * Creates an app with the model in the halyard instance.
       * @public
       * @param {string} appName
       * @param {Halyard} halyard
       * @returns {Promise.<TResult>}
       */
      createAppUsingHalyard(appName, halyard) {
        const that = this;
        return that.createApp(appName).then((app) => {
          const appId = app.qAppId;
          return that.openDoc(appId).then(result => that.setScriptAndReloadWithHalyard(result, halyard, true));
        });
      },

      /**
       * Reloads an existing app with the model in the halyard instance. Can also create an app is createIfMissing is set to true.
       * @public
       * @param {string} existingAppName
       * @param {Halyard} halyard
       * @param {boolean} createIfMissing
       * @returns {Promise.<TResult>}
       */
      reloadAppUsingHalyard(existingAppName, halyard, createIfMissing) {
        const that = this;
        return that.openDoc(existingAppName)
          .catch((error) => {
            const COULD_NOT_FIND_APP = 1003;

            if (createIfMissing && error.code === COULD_NOT_FIND_APP) {
              return that.createApp(existingAppName).then(app => that.openDoc(app.qAppId));
            }
            return that.Promise.reject(error);
          })
          .then(result => that.setScriptAndReloadWithHalyard(result, halyard, true));
      },

      /**
       * Use the model in halyard to set the script of an app and save it
       * @public
       * @param {Qix.app} app
       * @param {Halyard} halyard
       * @param {boolean} doSaveAfterReload
       * @returns {Promise.<TResult>}
       */
      setScriptAndReloadWithHalyard(app, halyard, doSaveAfterReload) {
        const that = this;
        const deferredConnections = [];

        halyard.getConnections().forEach((connection) => {
          const qixConnectionObject = connection.getQixConnectionObject();
          if (qixConnectionObject) {
            const connectionPromise = app.createConnection(qixConnectionObject)
              .then(result => result, (err) => {
                const LOCERR_CONNECTION_ALREADY_EXISTS = 2000;

                // Will not throw error if connection already exists.
                // The connections guid makes the connections unique and we assumes that it
                // is the same that was previously created
                if (!(err.code && err.code === LOCERR_CONNECTION_ALREADY_EXISTS)) {
                  throw createErrorMessage(CONNECTION_ERROR, err, connection);
                }
              });

            deferredConnections.push(connectionPromise);
          }
        });

        return that.Promise.all(deferredConnections).then(() => app.getLocaleInfo().then((localeInfoResult) => {
          halyard.setDefaultSetStatements(convertQixGetLocalInfo(localeInfoResult), true);
          return app.globalApi.configureReload(true, true, false).then(() => app.setScript(halyard.getScript())
            .then(() => app.doReload().then(() => app.globalApi.getProgress(0).then((progressResult) => {
              if (progressResult.qErrorData.length !== 0) {
                return app.checkScriptSyntax().then((syntaxCheckData) => {
                  if (syntaxCheckData.length === 0) {
                    throw createErrorMessage(LOADING_ERROR, progressResult.qErrorData[0]);
                  } else {
                    const item = halyard.getItemThatGeneratedScriptAt(syntaxCheckData[0].qTextPos);
                    throw createErrorMessage(SYNTAX_ERROR, progressResult.qErrorData[0], item);
                  }
                });
              }

              if (doSaveAfterReload) {
                return app.doSave().then(() => app);
              }

              return app;
            }))));
        }));
      },
    },
  };


  const exposeGlobalApi = {
    types: 'Doc',
    init(args) {
      const getObjectArgs = {
        handle: -1,
        id: 'Global',
        type: 'Global',
      };
      if (args.config) {
        getObjectArgs.genericType = 'Global';
      } else {
        getObjectArgs.customType = 'Global';
        getObjectArgs.delta = true;
      }
      args.api.globalApi = args.api.session.getObjectApi(getObjectArgs);
    },
  };

  module.exports = [halyardMixin, exposeGlobalApi];

})));
//# sourceMappingURL=halyard-enigma-mixin.js.map
