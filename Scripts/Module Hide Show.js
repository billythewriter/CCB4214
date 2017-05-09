/**
 * Copyright 2015 UC Regents
 *
 * @fileoverview Script used to toggle visibility of Servicenow Elements. It
 * is important to note that when debug = false, this script will modify records
 * that are tracked via update set by the platform. This script is intended to
 * be a temporary work around to the issue of long term development visibility until it is done.
 */

// Used to determine which state to set things. active = false is off, active = true is on
var targetActiveValue = false;

// Debug can be used to check target records. No records will be updated when debug = true
var scriptDebug = true;

// Used for logging. Will be the script source for the background script
var scriptName = 'Toggle_Script';

//Configuration for what to hide and show
var configuration = [
  {
    //Toggles category in the main service catalog
    'table':'sc_category',
    'searchColumn': 'sys_id',
    'searchStrings': ['sys_id'], //use sys_ids that are from your instance
    'searchLimit': 1
  },
  {
    //Toggles inbound actions
    'table':'sysevent_in_email_action',
    'searchColumn': 'sys_id',
    'searchStrings': [
      'sys_id',
      'sys_id'
    ],
    'searchLimit': 2
  },
  {
    //Toggles agent portal menu items
    'table':'sys_app_module',
    'searchColumn': 'sys_id',
    'searchStrings': [
      'sys_id',
      'sys_id'
    ],
    'searchLimit': 2
  },
  {
    //Hides specific  record producers
    'table':'sc_cat_item_producer',
    'searchColumn': 'sc_catalogs',
    'searchStrings': ['sys_id'],
    'searchLimit': 15,
    'queryOperator':'CONTAINS',
    'targetActiveValue':false //this only runs when the global targetActiveValue is false. Hide but don't show
  },
  {
    //Shows specific record producers
    'table':'sc_cat_item_producer',
    'searchColumn': 'sys_id',
    'searchStrings': [
      'sys_id',
      'sys_id'
    ],
    'searchLimit': 2,
    'targetActiveValue':true //this only runs when the global targetActiveValue is true. Show but don't hide
  },
  {
    //Toggles catalogs
    'table':'sc_catalog',
    'searchColumn': 'sys_id',
    'searchStrings': ['sys_id'],
    'searchLimit': 1
  }
];

toggleGlideRecords(configuration, targetActiveValue);

/**
 * Set Glide Records active property without audit logging
 * @param {object} config A configuration object containing the query parameters
 * @param {boolean} newStatus The intended status of the matching record(s)
 */
function toggleGlideRecords(config, newStatus) {
  for (var i = 0; i < config.length; i++) {

    //This allows us to have table configs that are targeted to a specific action.
    //For this script, we want to turn all record producers off, but only a few on
    //If you don't specify one, it assume you always want it to run
    if((typeof config[i].targetActiveValue !== 'undefined') && (config[i].targetActiveValue !== newStatus)){
      continue;
    }

    var glideRecord = new GlideRecord(config[i].table);

    glideRecord.autoSysFields(false);
    glideRecord.setUseEngines(false);
    glideRecord.setWorkflow(false);

    //We check if it's a single specified value, multiple, or a specified search operator
    var queryOperator = '=';
    if (config[i].searchStrings.length > 1) {
      queryOperator = 'IN';
    }else if(typeof config[i].queryOperator !== 'undefined'){
      //If we specify a specific operator, use that.
      queryOperator = config[i].queryOperator;
    }

    glideRecord.addQuery(config[i].searchColumn, queryOperator, config[i].searchStrings.join(','));

    // Override query limit (if provided)
    if (config[i].searchLimit !== null) {
      glideRecord.setLimit(config[i].searchLimit);
    }

    // Limit to 0 results if no search string values are provided
    if (config[i].searchStrings.length < 1) {
      glideRecord.setLimit(0);
    }

    glideRecord.query();

    while (glideRecord.next()) {
      glideRecord.setValue('active', newStatus);

      var result = true;
      if (scriptDebug === false) {
        result = glideRecord.update();
      }

      logUpdate((result !== null), glideRecord.getRecordClassName(), glideRecord.getValue('sys_id'), newStatus);
    }
  }
}

/**
 * Log update actions
 * @param {boolean} isSuccess The result of the update operation
 * @param {string} itemClass A dictionary name of the target record
 * @param {string} itemID A sys_id of the target record
 * @param {boolean} itemStatus The intended status of the target record
 */
function logUpdate(isSuccess, itemClass, itemID, itemStatus) {
  var itemStatusString = (itemStatus === true) ? 'active' : 'inactive';

  var messageSuccess = 'Set {{itemClass}}_{{itemID}} to {{itemStatus}}';
  var messageFailed = 'Failed to set {{itemClass}}_{{itemID}} to {{itemStatus}}';

  var message = (isSuccess) ? messageSuccess : messageFailed;
  message = message.replaceAll('{{itemClass}}', itemClass);
  message = message.replaceAll('{{itemID}}', itemID);
  message = message.replaceAll('{{itemStatus}}', itemStatusString);

  if (scriptDebug === true) {
    message = 'DEBUG: ' + message;
  }

  if (isSuccess) {
    gs.log(message, scriptName);
  } else {
    gs.logWarning(message, scriptName);
  }
}
