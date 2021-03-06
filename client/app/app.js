// Application core init (models classes should be up first)
//
'use strict';

var _  = require('lodash');
var ko = require('knockout');


var DEFAULT_GLYPH_SIZE = 16;


////////////////////////////////////////////////////////////////////////////////

// App namespace/data setup, executed right after models init
//
N.wire.once('navigate.done', { priority: -90 }, function () {

  N.app = {};

  N.app.searchWord    = ko.observable('').extend({ throttle: 100 });
  N.app.searchMode    = ko.computed(function () { return N.app.searchWord().length > 0; });
  N.app.fontsList     = new N.models.FontsList({ searchWord: N.app.searchWord });
  N.app.fontSize      = ko.observable(DEFAULT_GLYPH_SIZE);
  N.app.fontName      = ko.observable('');
  N.app.cssPrefixText = ko.observable('icon-');
  N.app.cssUseSuffix  = ko.observable(false);
  N.app.hinting       = ko.observable(true);
  N.app.encoding      = ko.observable('pua');

  N.app.apiMode       = ko.observable(false);
  N.app.apiUrl        = ko.observable('');
  N.app.apiSessionId  = null;


  N.app.getConfig   = function () {
    var config = {
      name: $.trim(N.app.fontName()),
      css_prefix_text: $.trim(N.app.cssPrefixText()),
      css_use_suffix: N.app.cssUseSuffix(),
      hinting: N.app.hinting()
    };

    config.glyphs = _.map(N.app.fontsList.selectedGlyphs(), function (glyph) {
      return glyph.serialize();
    });

    return config;
  };

  N.app.serverSave  = function(callback) {
    if (!N.app.apiSessionId) { return; }

    N.io.rpc('fontello.api.update', { sid: N.app.apiSessionId, config: N.app.getConfig() }, callback);
  };

});

////////////////////////////////////////////////////////////////////////////////


// Helper. Set new code for each selected glyph using currect encoding.
//
function updateGlyphCodes() {
  var glyphs = N.app.fontsList.selectedGlyphs();

  // Reselect all currently selected glyph to update their codes.
  _.invoke(glyphs, 'selected', false);
  _.invoke(glyphs, 'selected', true);
}


// Assign  actions handlers
//
N.wire.once('navigate.done', { priority: -10 }, function () {

  //
  // Setup autosave
  //

  N.app.fontName.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.fontSize.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.cssPrefixText.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.cssUseSuffix.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.hinting.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.encoding.subscribe(function () {
    N.wire.emit('session_save');
  });

  // Try to load config before everything (tweak priority)
  if (!_.isEmpty(N.runtime.page_data && N.runtime.page_data.sid)) {
    N.app.apiSessionId = N.runtime.page_data.sid;
    N.app.apiMode(true);
    N.app.apiUrl(N.runtime.page_data.url || '');
    N.wire.emit('import.obj', N.runtime.page_data.config);
  } else {
    N.wire.emit('session_load');
  }

  //
  // Basic commands
  //

  N.wire.on('cmd:reset_selected', function () {
    _.each(N.app.fontsList.selectedGlyphs(), function (glyph) {
      glyph.selected(false);
    });
  });

  N.wire.on('cmd:reset_all', function (src) {

    // is `src` set, then event was produced
    // by link click and we need confirmation
    if (src) {
      if (!window.confirm(t('confirm_app_reset'))) {
        return;
      }
    }

    N.app.fontName('');
    //N.app.fontSize(N.runtime.config.glyph_size.val);
    N.app.cssPrefixText('icon-');
    N.app.cssUseSuffix(false);

    _.each(N.app.fontsList.fonts, function(font) {
      _.each(font.glyphs(), function(glyph) {
        glyph.selected(false);
        glyph.code(glyph.originalCode);
        glyph.name(glyph.originalName);
      });
    });
  });

  N.wire.on('cmd:toggle_hinting', function () {
    N.app.hinting(!N.app.hinting());
  });

  N.wire.on('cmd:set_encoding_pua', function () {
    N.app.encoding('pua');
    updateGlyphCodes();
  });

  N.wire.on('cmd:set_encoding_ascii', function () {
    N.app.encoding('ascii');
    updateGlyphCodes();
  });

  N.wire.on('cmd:set_encoding_unicode', function () {
    N.app.encoding('unicode');
    updateGlyphCodes();
  });

  N.wire.on('cmd:clear_custom_icons', function () {
    var custom_icons = N.app.fontsList.getFont('custom_icons');

    custom_icons.glyphs().forEach(function (glyph) {
      glyph.selected(false);
    });
    custom_icons.glyphs([]);
  });
});
