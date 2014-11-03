/* global FB,History */
(function ($) {
  "use strict";

  // Loads the Facebook SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

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
       * Adds event listeners to the checkboxes inside the widget.
       */
      function initOptions() {
        self.find(settings.newsletter).change(function () {
          $.fb_subscriptions.subscribeNewsletter(this.checked);
        });
        self.find(settings.offers).change(function () {
          $.fb_subscriptions.subscribeOffers(this.checked);
        });
      }

      var self = this;
      /**
       * The settings for the specific instance of the widget.
       * @type {Object}
       */
      var settings = $.extend($.fn.fb_subscribe.defaultOptions, options);

      /**
       * Adds an event listener for the event when the Facebook login status changes.
       * The event handler initializes the widget and its components.
       */
      $(document).on(statusChangedEventName, function (e, response) {
        self.each(initContainer(response.status)).visible();
        if (response.status === 'connected') {
          $.fb_subscriptions.get()
            .then(function (data) {
              self.find(settings.newsletter).prop('checked', data !== 0);
              self.find(settings.offers).prop('checked', data !== 0);
              initOptions();
            });
        }
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
    var fbid, fbToken;
    var checkUserUrl = 'http://simulation.dk/other/sumo/checkUser.php';

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
     * @param  {String} appId - Facebook application id
     */
    function fbInit(appId) {
      FB.init({
        appId      : appId,
        cookie     : true,  // enable cookies to allow the server to access 
                            // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.1', // use version 2.1
        status: true // the SDK will attempt to get info about the current user immediately after init
      });

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
     * Initializes the Facebook SDK by providing the correct
     * Facebook application id.
     * @param  {String} appId - Facebook application id
     */
    $.fb_init = function (appId) {
      // if the Facebook SDK is loaded synchronously
      if (typeof FB !== 'undefined') {
        fbInit(appId);
      }
      else {
        window.fbAsyncInit = function () {
          fbInit(appId);
        };
      }
    };

    function buildUrl(data) {
      return checkUserUrl + '?' + $.param(data);
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
        FB.api('/me?fields=id,email,gender,age_range', function (response) {
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
     * The subscriptions service can be used to retrive
     * user related data from the Facebook API and the 
     * website web services.
     * @type {Object}
     */
    $.fb_subscriptions = {

      /**
       * Retrieves the subscriptions of the current logged in user.
       * @return {jQuery.Deferred}
       */
      get: function () {
        if (!fbid) {
          return unknownUser();
        }
        else {
          return $.getJSON(buildUrl({
            op: 0,
            id: fbid,
            token: fbToken
          }));
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
          return $.get(buildUrl({
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
          return $.get(buildUrl({
            op: 1,
            id: fbid,
            token: fbToken,
            val: (subscribe ? 1 : 0)
          }));
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
    $.fn.fb_login = function () {
      var self = this;
      /**
       * Variable holding information whether the user is logged in.
       * @type {Boolean}
       */
      var loggedIn = false;

      // Always hides the button at the beginning.
      // Makes sure the button does not pop in on loading, messing around the other elements.
      this.invisible();

      /**
       * Adds an event listener for the event when the Facebook login status changes.
       * The event handler initializes the widget and its components.
       */
      $(document).on(statusChangedEventName, function (e, response) {
        var options = $.fn.fb_login.defaultOptions;
        loggedIn = response.status === 'connected';
        var optionName = loggedIn ? 'logout' : 'login';
        var text = options[optionName];
        // sets the proper text to the button ('Log In' or 'Log Out')
        $(self.selector).find(options.text).text(text);
        self.visible();
      });

      /**
       * Adds an event listener for pressing the button.
       * The event handler logs in or logs out the user from Facebook.
       */
      this.on('click', function (e) {
        e.preventDefault();
        if (!loggedIn) {
          FB.login(null, { scope: 'public_profile,email' });
        }
        else {
          FB.logout();
        }
      });
      return this;
    };

    /**
     * The default options for the widget.
     * They cannot be overwritten for seperate instances of the widget.
     * @type {Object}
     */
    $.fn.fb_login.defaultOptions = {
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
     * The handler invoked when a waypoint element is visible.
     * "this" points to that waypoint element.
     */
    function waypointHandler() {
      var data = null;
      var url = $(this).data('url');
      var title = url;
      History.pushState(data, title, url);
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
        return contextHeight / 2 - $(this).outerHeight();
      },
      handler: waypointHandler
    };

    $.fn.fb_scroll = function () {
      var selector = this.selector;
      /**
       * Initialzes the waypoint plugin with the plugin selector.
       */
      var init = function () {
        $(selector).waypoint(waypointTopOptions);
        $(selector).waypoint(waypointBottomOptions);
      };
      /**
       * The waypoint plugin does not recalculate the offset on window resize,
       * so it is recalculated manually.
       */
      $(window).resize(function () {
        $(selector).waypoint('destroy');
        init();
      });
      init();
      return this;
    };
  }());
}(jQuery));