/* global FB,History,FastClick,ga */
(function ($) {
  "use strict";

  // utilities
  $.fn.visible = function () {
    return this.css('visibility', 'visible');
  };
  $.fn.invisible = function () {
    return this.css('visibility', 'hidden');
  };

  /**
   * The name of the event when the Facebook login status changes.
   * @type {String}
   */
  var statusChangedEventName = 'fbStatusChanged';

  /**
   * Initialization
   */
  (function () {
    // If the user refreshes the page then it is scrolled to the top.
    // This way after the page reloads the browser does not jump
    // back to a scroll position down the page.
    $(window).on('beforeunload', function () {
      $(window).scrollTop(0);
    });
    // Initializes the FastClick library.
    // It eliminates the 300ms delay between a physical tap
    // and the firing of a click event on mobile browsers.
    $(function () {
      if (typeof FastClick !== 'undefined') {
        FastClick.attach(document.body);
      }
    });
  }());

  /**
   * Calls a function to display a list of articles in the left side
   * when the user login status is available.
   */
  (function () {
    var fbid = null, lastFbid = null;
    $(document).on(statusChangedEventName, function (e, response) {
      if (response.status !== 'connected') {
        fbid = null;
        if (typeof window.create_articlelist === 'function') {
          try {
            window.create_articlelist();
          }
          catch (e) {}
        }
      }
      else {
        fbid = response.authResponse.userID;
        if (fbid !== lastFbid) {
          FB.api('/me', { fields: 'likes,birthday' }, function (response) {
            if (typeof window.create_articlelist === 'function') {
              try {
                window.create_articlelist(response.birthday, response.likes);
              }
              catch (e) {}
            }
          });
        }
      }
      lastFbid = fbid;
    });
  }());

  /**
   * Widget for email subscriptions implemented as a jQuery plugin.
   */
  (function () {
    $.fn.fb_subscribe = function (options) {

      /**
       * Hides or shows the subscribing checkboxes depending on the login status
       * @param  {jQuery} container - the jQuery object that holds the root element of the widget
       * @param  {string} loginStatus - the Facebook login status
       */
      function displayOptions(container, loginStatus) {
        // finds the container of the checkboxes and hides it
        var optionsContainer = container.find(settings.options);
        optionsContainer.hide();
        if (!loginStatus) {
          return;
        }
        if (loginStatus === 'connected') {
          // if the user is logged in then show the checkboxes
          optionsContainer.show();
        }
      }

      /**
       * Sets the login status message inside the widget.
       * The messages can be customized through the widget options.
       * @param {jQuery} container - the jQuery object that holds the root element of the widget
       * @param {string} loginStatus - the Facebook login status
       */
      function setLoginMessage(container, loginStatus) {
        var message;
        if (loginStatus === 'connected') {
          message = settings.loginMessage;
        }
        else if (loginStatus === 'not_authorized') {
          message = settings.notAuthorizeMessage;
        }
        else {
          message = settings.notLoggedinMessage;
        }
        // finds the container of the messages and hides it
        var messageContainer = container.find(settings.message);
        // if the user is not logged in show the proper message
        messageContainer.text(message);
        messageContainer.show();
      }

      /**
       * Creates and returns a function that is used for initialization of the widget.
       * @param  {string} loginStatus
       * @return {function}
       */
      function initContainer(loginStatus) {
        return function (idx, elem) {
          var container = $(elem);
          displayOptions(container, loginStatus);
          setLoginMessage(container, loginStatus);
        };
      }

      /**
       * The event handler called when the user checks or unchecks
       * the option for subscribing to a newsletter.
       */
      function subscribeNewsletter() {
        $.fb_service.subscribeNewsletter(this.checked);
      }

      /**
       * Adds event listeners to the checkboxes inside the widget.
       */
      function initOptions() {
        self.find(settings.newsletter)
          .off('change', subscribeNewsletter)
          .on('change', subscribeNewsletter);
      }

      var self = this;
      /**
       * The settings for the specific instance of the widget.
       * @type {Object}
       */
      var settings = $.extend($.fn.fb_subscribe.defaultOptions, options);

      /**
       * Holds the previous status of the user login status.
       * Used to avoid unnecessary AJAX calls and event bindings.
       * @type {String}
       */
      var lastStatus = null;

      /**
       * Adds an event listener for the event when the Facebook login status changes.
       * The event handler initializes the widget and its components.
       */
      $(document).on(statusChangedEventName, function (e, response) {
        var responseStatus = response.status;
        self.each(initContainer(responseStatus)).visible();
        if (responseStatus === 'connected' && responseStatus !== lastStatus) {
          $.fb_service.get()
            .then(function (subscribed) {
              self.find(settings.newsletter).prop('checked', subscribed);
              initOptions();
            },
            function () {
              self.find(settings.newsletter).prop('checked', false);
              initOptions();
            });
        }
        lastStatus = responseStatus;
      });

      return this.each(initContainer(null));
    };

    /**
     * The default options for the widget.
     * They can be overwritten for each instance of the widget.
     * @type {Object}
     */
    $.fn.fb_subscribe.defaultOptions = {
      /**
       * The message displayed by the widget when the user is not logged in.
       * @type {String}
       */
      notLoggedinMessage: 'Please log into Facebook.',
      /**
       * The message displayed by the widget when the user is logged in
       * but did not authorize the application.
       * @type {String}
       */
      notAuthorizeMessage: 'Please log into this app.',
      /**
       * The message displayed by the widget when the user is logged in.
       * @type {String}
       */
      loginMessage: 'You are logged in.',
      /**
       * The jQuery selector for the element
       * containing the checkboxes inside the widget.
       * @type {String}
       */
      options: '.permissions-container',
      /**
       * The jQuery selector for the checkbox element
       * that is responsible for the user subsriptions to the newsletter.
       * @type {String}
       */
      newsletter: '.newsletter-option',
      /**
       * The jQuery selector for the checkbox element
       * that is responsible for the user subsriptions to the offers.
       * @type {String}
       */
      offers: '.offers-option',
      /**
       * The jQuery selector for the element
       * containing the login status message.
       * @type {String}
       */
      message: '.status-message'
    };
  }());

  /**
   * Facebook SDK initialization and a service for subscriptions.
   */
  (function () {
    var fbid, fbToken, fbAppId, serviceUrl;

    /**
     * An event handler for the 'auth.authResponseChange'
     * Facebook event which fires the 'fbStatusChanged' event in turn.
     * @param  {Object} response - Contains the login status, Facebook ID, access token
     */
    function fbStatusChangedHandler(response) {
      if (response.status !== 'connected') {
        fbid = fbToken = null;
      }
      else {
        fbid = response.authResponse.userID;
        fbToken = response.authResponse.accessToken;
      }
      $(document).trigger(statusChangedEventName, response);
    }

    /**
     * Initializes the Facebook SDK.
     */
    function fbInit() {
      FB.getLoginStatus(fbStatusChangedHandler);
      FB.Event.subscribe('auth.authResponseChange', fbStatusChangedHandler);
    }

    var oldEventData = null;
    /**
     * Special jQuery event for the event when the Facebook login status changes.
     * If a component adds a handler after the first fired event
     * the copmonent will be notified with the last fired one.
     * This is done so the component can always be initialized
     * to the correct login status by only subscribing with a handler,
     * i.e. no calls for retrieving  the status are necessary.
     */
    $.event.special[statusChangedEventName] = {
      add: function (handleObj) {
        if (oldEventData) {
          handleObj.handler(oldEventData.event, oldEventData.data);
        }
      },
      trigger: function (event, data) {
        oldEventData = { event: event, data: data };
      }
    };

    /**
     * Checks if a value for a required argument is passed.
     * If not then it throws a descriptive error.
     * @param  {*} value - The value of the argument to be checked.
     * @param  {String} name - The name of the argument.
     * @param  {String} desc - The description of the argument.
     */
    function guardRequired(value, name, desc) {
      if (typeof value === 'undefined') {
        throw new Error('The argument "' + name + '" is required. ' + desc);
      }
    }

    /**
     * Initializes the Facebook SDK by providing the correct
     * Facebook application id.
     * @param {String} appId - The Facebook application ID.
     * @param {String} aServiceUrl - The URL of the digout.com service.
     */
    $.fb_init = function (appId, aServiceUrl) {
      guardRequired(appId, 'appId', 'The Facebook application ID.');
      guardRequired(aServiceUrl, 'aServiceUrl', 'The URL of the digout.com service.');
      fbAppId = appId;
      serviceUrl = aServiceUrl;
      var old_fbAsyncInit = window.fbAsyncInit;
      window.fbAsyncInit = function () {
        if (old_fbAsyncInit) {
          old_fbAsyncInit();
        }
        fbInit();
      };
    };

    function buildUrl(action, data) {
      return serviceUrl + action + '&' + $.param(data);
    }

    function buildSubscriptionUrl(data) {
      return buildUrl('my_subscriptions', data);
    }

    function buildVoteUrl(data) {
      return buildUrl('article_vote', data);
    }

    var fbEmail = null;
    /**
     * Retrieves the email of the current logged in user from the Facebook API
     * and stores it it the "fbEmail" variable.
     * @return {jQuery.deferred}
     */
    function getEmail() {
      var deferred = $.Deferred();
      // if fbid is not null then the user is logged in
      // and it is safe to use the fbEmail
      // if the user logs out then the fbid will be null
      // and the fbEmail will no longer be valid
      if (fbid !== null && fbEmail !== null) {
        deferred.resolve(fbEmail);
      }
      else {
        FB.api('/me?fields=email', function (response) {
          fbEmail = response.email;
          deferred.resolve(fbEmail);
        });
      }
      return deferred;
    }

    /**
     * Creates a promise that always fails.
     * Used when the there is no logged in user.
     * @return {jQuery.Deferred}
     */
    function unknownUser() {
      var deferred = $.Deferred();
      deferred.reject(new Error('Unknown Facebook ID.'));
      return deferred;
    }

    /**
     * The service can be used to retrive or store
     * user related data from the Facebook API and the 
     * website web services.
     * @type {Object}
     */
    $.fb_service = {
      /**
       * Invokes the Facebook login dialog if it is available.
       */
      login: function () {
        // Checks if the user agent is Chrome on iOS.
        // There is a bug related to this browser:
        // http://stackoverflow.com/questions/16843116/facebook-oauth-unsupported-in-chrome-on-ios
        if (navigator.userAgent.match('CriOS')) {
          window.location = 'https://www.facebook.com/dialog/oauth?client_id=' + fbAppId +
            '&redirect_uri=' + window.location.href +
            '&scope=public_profile,email,user_likes,user_birthday';
        }
        else {
          FB.login(null, { scope: 'public_profile,email,user_likes,user_birthday' });
        }
      },

      /**
       * Retrieves the subscriptions of the current logged in user.
       * @return {jQuery.Deferred}
       */
      get: function () {
        if (!fbid) {
          return unknownUser();
        }
        else {
          return $.getJSON(buildSubscriptionUrl({
              op: 0,
              id: fbid,
              token: fbToken
            }))
            .then(function (data) {
              return data.status === 'success' && data.permission === '1';
            });
        }
      },

      /**
       * Subscribes or unsubscribes the current logged in user
       * for the newsletters provided by the website,
       * using its Facebook ID, access token and email.
       * @param  {Boolean} subscribe - "true" to subscribe, "false" unsubscribe
       * @return {jQuery.Deferred}
       */
      subscribeNewsletter: function (subscribe) {
        if (!fbid) {
          return unknownUser();
        }
        else {
          return $.post(buildSubscriptionUrl({
            op: 1,
            id: fbid,
            token: fbToken,
            val: (subscribe ? 1 : 0)
          }));
        }
      },

      /**
       * Subscribes or unsubscribes the current logged in user
       * for the offers provided by the website,
       * using its Facebook ID, access token and email.
       * @param  {Boolean} subscribe - "true" to subscribe, "false" unsubscribe
       * @return {jQuery.Deferred}
       */
      subscribeOffers: function (subscribe) {
        if (!fbid) {
          return unknownUser();
        }
        else {
          return $.post(buildSubscriptionUrl({
            op: 1,
            id: fbid,
            token: fbToken,
            val: (subscribe ? 1 : 0)
          }));
        }
      },

      /**
       * Stores an article vote made by a user.
       * @param  {String} articleId - The ID of the article. This is a Wordpress id.
       * @param  {Boolean} up - Specifies whether this is an upvote or a downvote.
       * @return {jQuery.Deferred}
       */
      vote: function (articleId, up) {
        if (!articleId) {
          var deferred = $.Deferred();
          deferred.reject(new Error('Article ID is null.'));
          return deferred;
        }
        if (!fbid) {
          return unknownUser();
        }
        else {
          return $.post(buildVoteUrl({
            id: fbid,
            token: fbToken,
            artid: articleId,
            val: (up ? 1 : -1)
          }))
          .then(function (data) {
            if (data.status === 'error') {
              window.alert(data.message);
              throw new Error(data.message);
            }
            else {
              return data;
            }
          }, function (xhr, status, error) {
            var data;
            try {
              data = $.parseJSON(xhr.responseText);
              if (data && data.message) {
                window.alert(data.message);
              }
            }
            catch (e) {}
            throw error;
          });
        }
      },
    };
  }());

  /**
   * Widget for creating overlays over other widgets implemented as a jQuery plugin.
   * The overlay is a darkened area with a login button centered inside it.
   */
  (function () {

    /**
     * The template for the Facebook login buttons inside the overlay widgets
     * @type {String}
     */
    var fbButtonTemplate = $('#fb-login-button').html();
    var overlayClassName = 'overlay';
    var overlaySelector = '.' + overlayClassName;

    /**
     * Initializes the lockable component
     * @param  {Boolean} loggedIn - Specifies whether there is a logged in user
     */
    function widgetsInit(loggedIn) {
      // gets the very widget that needs to be locked
      var lockableContent = $('.lockable-content');
      // if there is a logged in user removes the overlay
      if (loggedIn) {
        lockableContent.addClass('unlockable');
        var overlays = $(overlaySelector);
        overlays.remove();
      }
      // otherwise adds an overlay and a button inside it
      else {
        lockableContent.removeClass('unlockable');
        // the size of the overlay is calculated dynamically
        // because most of the widget are loaded dynamically
        lockableContent.each(function (idx, elem) {
          var widget = $(elem);
          var container = widget.parent();
          var overlay = $('<div/>').addClass(overlayClassName);
          overlay.height(widget.height());
          overlay.width(widget.width());
          
          container.append(overlay);
          // we test every widget until it is loaded
          var interval = setInterval(function () {
            // The loaded widget and its overlay are expected to be bigger than 100px x 100px
            // The overlay dimensions are tested
            // since they might be updated a few milliseconds after the widget is resized.
            if (overlay.height() > 100 && overlay.width() > 100) {
              overlay.append(fbButtonTemplate);
              overlay.find('.facebook-login').fb_login();
              clearInterval(interval);
            }
          }, 50);
        });

        // the widget element starts to listen for its custom resize event
        // so its overlay is resized too
        lockableContent.resize(function (e) {
          var widget = $(e.target);
          var container = widget.parent();
          var offset = container.offset();
          var height = widget.height();
          var width = widget.width();
          var top = offset.top + "px";
          var left = offset.left + "px";

          container.find(overlaySelector).css({
            'width': width,
            'height': height,
          });
        });
      }
    }

    $.fn.fb_lockable = function () {
      $(document).on(statusChangedEventName, function (e, response) {
        var loggedIn = response.status === 'connected';
        widgetsInit(loggedIn);
      });

      return this.each(function () {
        var container = $(this);
        // The component assumes that the first child is the widget
        // that needs to be locked.
        // If that is not the case then the widget should be marked
        // with the "lockable-content" CSS class.
        if (container.find('.lockable-content').length === 0) {
          container.find('> :first-child').addClass('lockable-content');
        }
      });
    };
  }());

  /**
   * Widget for custom Facebook login buttons implemented as a jQuery plugin.
   */
  (function () {
    $.fn.fb_login = function (options) {
      var self = this;
      /**
       * Variable holding information whether the user is logged in.
       * @type {Boolean}
       */
      var loggedIn = false;

      /**
       * The settings for the specific instance of the widget.
       * @type {Object}
       */
      var settings = $.extend($.fn.fb_login.defaultOptions, options);

      /**
       * Sets the text inside of the login button.
       */
      var setText = function (text) {
        var textElement = $(self.selector);
        if (settings.text) {
          textElement = textElement.find(settings.text);
        }
        textElement.html(text);
      };

      // Always hides the button at the beginning.
      // Makes sure the button does not pop in on loading, messing around the other elements.
      setText(settings.unknown);

      /**
       * Adds an event listener for the event when the Facebook login status changes.
       * The event handler initializes the widget and its components.
       */
      $(document).on(statusChangedEventName, function (e, response) {
        loggedIn = response.status === 'connected';
        var optionName = loggedIn ? 'logout' : 'login';
        var text = settings[optionName];
        // sets the proper text to the button ('Log In' or 'Log Out')
        setText(text);
      });

      /**
       * Adds an event listener for pressing the button.
       * The event handler logs in or logs out the user from Facebook.
       */
      this.on('click', function (e) {
        e.preventDefault();
        if (!loggedIn) {
          $.fb_service.login();
        }
        else {
          FB.logout();
        }
      });
      return this;
    };

    /**
     * The default options for the widget.
     * They can be overwritten for seperate instances of the widget.
     * @type {Object}
     */
    $.fn.fb_login.defaultOptions = {
      /**
       * The button text displayed when the login status of the user is unknown.
       * @type {String}
       */
      unknown: '&hellip;',
      /**
       * The button text displayed when the user is not logged in.
       * @type {String}
       */
      login: 'Log In',
      /**
       * The button text displayed when the user is logged in.
       * @type {String}
       */
      logout: 'Log Out',
      /**
       * The jQuery selector for the element
       * containing the button text.
       * @type {String}
       */
      text: '.sc-text'
    };
  }());

  /**
   * Widget for changing the page URL on scrolling to a specific element
   */
  (function () {
    /**
     * Data attributes to be copied to the share button
     * @type {Array}
     */
    var dataAttributes = ['url', 'title', 'image', 'description'];

    /**
     * The ID of the currently visible article.
     * @type {String}
     */
    var articleId = null;

    /**
     * A collection of articles already tracked by google analytics.
     * Contains the IDs of the articles.
     * @type {Array}
     */
    var trackedArticles = [];

    /**
     * The handler invoked when a waypoint element is visible.
     * "this" points to that waypoint element.
     */
    function waypointHandler() {
      var $elem = $(this);
      var url = $elem.data('url');
      var title = $elem.data('title');
      var data = { url: url };
      // changes the URL of the page
      History.replaceState(data, title, url);

      // copies data attributes to the sahre button
      // from the currently visible article
      var share = $($.fn.fb_scroll.defaultOptions.shareButton);
      $.each(dataAttributes, function (index, attribute) {
        var dataAttribute = 'data-' + attribute;
        share.attr(dataAttribute, $elem.attr(dataAttribute));
      });
      // sets the text of the button
      $.fn.fb_scroll.defaultOptions.shareButtonText(share, title);

      articleId = $elem.data('wid');

      // Checks for the top article.
      // It is already tracked on page load so it is skipped here.
      if (trackedArticles.length === 0) {
        trackedArticles.push(articleId);
      }
      else {
        // Checks whether the article is not already tracked.
        if (typeof ga !== 'undefined' &&
          trackedArticles.indexOf(articleId) === -1) {

          trackedArticles.push(articleId);
          var page = window.location.pathname + window.location.search;
          ga('send', {
            'hitType': 'pageview',
            'page': page,
            'title': title
          });
        }
      }
    }

    /**
     * Options for the waypoint plugin.
     * These options will make a waypoint to be active
     * when its top moves to the top half of the screen.
     * Useful when scrolling down.
     * @type {Object}
     */
    var waypointTopOptions = {
      continuous: false, // it will trigger the handler if it is the last waypoint
      offset: '50%',
      handler: waypointHandler
    };
    /**
     * Options for the waypoint plugin.
     * These options will make a waypoint to be active
     * when its bottom moves to the bottom half of the screen.
     * Useful when scrolling up.
     * @type {Object}
     */
    var waypointBottomOptions = {
      continuous: false,
      offset: function () {
        // once the bottom of an element moves below the middle of the screen
        // then switch to the waypoint of that element
        var contextHeight = $.waypoints('viewportHeight');
        return contextHeight / 2 - ($(this).outerHeight(true) - 1);
        // Because the offsets of top and bottom waypoints are the same
        // the number 1 is substracted so they should differ
        // and the top waypoint should take precedence (its offset should be bigger).
        // Note: waypoints.js sorts the waypoints by their offsets
      },
      handler: waypointHandler
    };

    $.fn.fb_scroll = function (options) {
      var selector = this.selector;
      /**
       * Initialzes the waypoint plugin with the plugin selector.
       */
      $(selector).waypoint($.extend({}, waypointTopOptions, options));
      $(selector).waypoint($.extend({}, waypointBottomOptions, options));

      return this;
    };

    /**
     * The default options for the widget.
     * They cannot be overwritten for each instance of the widget.
     * @type {Object}
     */
    $.fn.fb_scroll.defaultOptions = {
      /**
       * The jQuery selector for the share button.
       * @type {String}
       */
      shareButton: '#share',
      /**
       * Sets the given text to the share button
       * @param  {jQuery} shareButton
       * @param  {String} text
       */
      shareButtonText: function (shareButton, text) {
        shareButton.html('Del ' + text);
      }
    };

    /**
     * Variable holding information whether the user is logged in.
     * @type {Boolean}
     */
    var loggedIn;
    /**
     * An event handler invoked when the Facebook login status changes.
     * @type {Function}
     */
    var fbStatusChangedHandler = null;

    /**
     * Tries to log in the user and invokes the given callback after that.
     * It replaces the event handler above so only one callback is invoked
     * on successful authentication.
     * @param  {Function} callback
     */
    function login(callback) {
      if (fbStatusChangedHandler !== null) {
        $(document).off(statusChangedEventName, fbStatusChangedHandler);
      }
      fbStatusChangedHandler = function (e, response) {
        if (response.status === 'connected') {
          callback();
          $(document).off(statusChangedEventName, fbStatusChangedHandler);
        }
      };
      $(document).on(statusChangedEventName, fbStatusChangedHandler);
      $.fb_service.login();
    }

    /**
     * The event handler called when the user votes up an article.
     */
    function voteUpHandler() {
      if (!loggedIn) {
        login(function () {
          $.fb_service.vote(articleId, true);
        });
      }
      else {
        $.fb_service.vote(articleId, true);
      }
    }

    /**
     * The event handler called when the user votes down an article.
     */
    function voteDownHandler() {
      if (!loggedIn) {
        login(function () {
          $.fb_service.vote(articleId, false);
        });
      }
      else {
        $.fb_service.vote(articleId, false);
      }
    }

    $.fn.fb_vote = function (options) {
      if (typeof options.up === 'string') {
        this.find(options.up)
          .off('click', voteUpHandler)
          .on('click', voteUpHandler);
      }
      if (typeof options.down === 'string') {
        this.find(options.down)
          .off('click', voteDownHandler)
          .on('click', voteDownHandler);
      }
    };

    // Updates the loggedIn variable when the Facebook login status changes.
    $(document).on(statusChangedEventName, function (e, response) {
      loggedIn = response.status === 'connected';
    });
  }());
}(jQuery));

//////////
//ui.js //
//////////

(function (window, document) {
  'use strict';

  jQuery(function () {
    var layout   = document.getElementById('layout'),
        menu     = document.getElementById('menu'),
        menuLink = document.getElementById('menuLink');

    function toggleClass(element, className) {
      var classes = element.className.split(/\s+/),
          length = classes.length,
          i = 0;

      for (; i < length; i++) {
        if (classes[i] === className) {
          classes.splice(i, 1);
          break;
        }
      }
      // The className is not found
      if (length === classes.length) {
        classes.push(className);
      }

      element.className = classes.join(' ');
    }

    if (menuLink) {
      menuLink.onclick = function (e) {
        var active = 'active';

        e.preventDefault();
        toggleClass(layout, active);
        toggleClass(menu, active);
        toggleClass(menuLink, active);
      };
    }
  });
}(this, this.document));