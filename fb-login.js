/* global FB */
(function ($) {
  "use strict";

  // utilities
  (function () {
    $.fn.visible = function () {
      return this.css('visibility', 'visible');
    };
    $.fn.invisible = function () {
      return this.css('visibility', 'hidden');
    };
  }());

  // widget for email subscriptions
  (function () {
    $.fn.subscribe = function (options) {
      function initContainer(status) {
        return function (idx, elem) {
          var container = $(elem);
          // finds the container of the checkboxes and hides it
          var optionsContainer = container.find(settings.options);
          optionsContainer.hide();
          if (!status) {
            return;
          }
          if (status === 'connected') {
            // if the user is logged in then show the checkboxes
            optionsContainer.show();
          }
          var message;
          if (status === 'connected') {
            message = settings.loginMessage;
          }
          else if (status === 'not_authorized') {
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
        };
      }
      function initOptions() {
        self.find(settings.newsletter).change(function () {
          $.fbRepo.subscribeNewsletter(this.checked);
        });
        self.find(settings.offers).change(function () {
          $.fbRepo.subscribeOffers(this.checked);
        });
      }
      var self = this;
      var settings = $.extend($.fn.subscribe.defaultOptions, options);
      $(document).on('fbStatusChanged', function (e, response) {
        self.each(initContainer(response.status)).visible();
        if (response.status === 'connected') {
          $.fbRepo.getUserDetails()
            .then(function (data) {
              self.find(settings.newsletter).prop('checked', data !== 0);
              self.find(settings.offers).prop('checked', data !== 0);
              initOptions();
            });
        }
      });

      return this.each(initContainer(null));
    };
    $.fn.subscribe.defaultOptions = {
      notLoggedinMessage: 'Please log into Facebook.',
      notAuthorizeMessage: 'Please log into this app.',
      loginMessage: 'You are logged in.',
      options: '.permissions-container',
      newsletter: '.newsletter-option',
      offers: '.offers-option',
      message: '.status-message'
    };
  }());

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  // fb repository implemented as a jQuery plugin
  (function () {
    var fbid, fbEmail, fbToken;
    var checkUserUrl = 'http://simulation.dk/other/sumo/checkUser.php';
    var facebookIdCookieName = 'facebook-id';
    var facebookEmailCookieName = 'facebook-email';
    function fbStatusChangedHandler(response) {
      if (response.status !== 'connected') {
        fbid = fbEmail = fbToken = null;
        $.removeCookie(facebookIdCookieName);
        $.removeCookie(facebookEmailCookieName);
      }
      else {
        fbid = response.authResponse.userID;
        fbToken = response.authResponse.accessToken;
        $.cookie(facebookIdCookieName, fbid);
      }
      $(document).trigger('fbStatusChanged', response);
    }
    function fbInit(appId) {
      FB.init({
        appId      : appId,
        cookie     : true,  // enable cookies to allow the server to access 
                            // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.1', // use version 2.1
        status: true // the SDK will attempt to get info about the current user immediately after init
      });

      // var storedFacebookId = $.cookie(facebookIdCookieName);
      // if (storedFacebookId) {
      //   fbStatusChangedHandler({
      //     status: 'connected',
      //     authResponse: {
      //       userID: storedFacebookId
      //     }
      //   });
      // }
      // else {
      FB.getLoginStatus(fbStatusChangedHandler);
      // }
      FB.Event.subscribe('auth.authResponseChange', fbStatusChangedHandler);

      // ['auth.login', 'auth.logout', 'auth.authResponseChange', 'auth.statusChange'].forEach(function (eventType) {
      //   FB.Event.subscribe(eventType, function (response) {
      //     console.log(eventType);
      //   });
      // });
    }
    var oldEventData = null;
    $.event.special.fbStatusChanged = {
      add: function (handleObj) {
        if (oldEventData) {
          handleObj.handler(oldEventData.event, oldEventData.data);
        }
      },
      trigger: function (event, data) {
        oldEventData = { event: event, data: data };
      }
    };
    function buildUrl(data) {
      return checkUserUrl + '?' + $.param(data);
    }
    var fbRepo = {
      init: function (appId) {
        if (typeof FB !== 'undefined') {
          fbInit(appId);
        }
        else {
          window.fbAsyncInit = function () {
            fbInit(appId);
          };
        }
      },
      getUserDetails: function () {
        function retrieveSubscription() {
          $.getJSON(buildUrl({
            op: 0,
            id: fbid,
            token: fbToken
          }), function (data) {
            deferred.resolve(data);
          });
        }
        var deferred = $.Deferred();
        var storedFacebookEmail = $.cookie(facebookEmailCookieName);
        if (storedFacebookEmail) {
          fbEmail = storedFacebookEmail;
          retrieveSubscription();
        }
        else {
          FB.api('/me?fields=id,email,gender,age_range', function (response) {
            //fbid = response.id;
            fbEmail = response.email;
            $.cookie(facebookEmailCookieName, fbEmail);
            retrieveSubscription();
          });
        }
        return deferred;
      },
      subscribeNewsletter: function (subscribe) {
        if (!fbid) {
          var deferred = $.Deferred();
          deferred.reject(new Error('Unknown Facebook ID.'));
          return deferred;
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
      subscribeOffers: function (subscribe) {
        if (!fbid) {
          var deferred = $.Deferred();
          deferred.reject(new Error('Unknown Facebook ID.'));
          return deferred;
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
    $.fbRepo = fbRepo;
  }());

  // overlay widget
  (function () {
    // onlogin="checkLoginState();"
    //var fbButtonTemplate = '<fb:login-button class="fb-login-button-xlarge" data-size="xlarge" scope="public_profile,email"></fb:login-button>';
    var fbButtonTemplate = '<a href="#" class="fb-login-button-xlarge bold-btn sc-btn sc--facebook sc--large">' +
      '<span class="sc-icon">' +
          '<svg viewBox="0 0 33 33" width="25" height="25" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path d="M 17.996,32L 12,32 L 12,16 l-4,0 l0-5.514 l 4-0.002l-0.006-3.248C 11.993,2.737, 13.213,0, 18.512,0l 4.412,0 l0,5.515 l-2.757,0 c-2.063,0-2.163,0.77-2.163,2.209l-0.008,2.76l 4.959,0 l-0.585,5.514L 18,16L 17.996,32z"></path></g></svg>' +
      '</span>' +
      '<span class="sc-text"></span>' +
    '</a>';

    function widgetsInit(loggedIn) {
      var lockableContent = $('.lockable-content');
      var overlays = $('.overlay');
      if (loggedIn) {
        lockableContent.addClass('unlockable');
        overlays.remove();
      }
      else {
        lockableContent.removeClass('unlockable');
        lockableContent.each(function (idx, elem) {
          // var container = $(elem);
          // var widget = container.find('> :first-child');
          var widget = $(elem);
          var container = widget.parent();
          var overlay = $('<div/>').addClass('overlay');
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
              // FB.XFBML.parse(overlay[0]);
              overlay.find('.sc-btn').fbLogin();
              clearInterval(interval);
            }
          }, 50);
          // overlay.append('<iframe src="about:blank"></iframe>');
        });

        lockableContent.resize(function (e) {
          var widget = $(e.target);
          var container = widget.parent();
          var offset = container.offset();
          var height = widget.height();
          var width = widget.width();
          var top = offset.top + "px";
          var left = offset.left + "px";

          container.find('.overlay').css({
            'width': width,
            'height': height,
          });
        });
      }
    }
    $.fn.lockable = function () {
      $(document).on('fbStatusChanged', function (e, response) {
        var loggedIn = response.status === 'connected';
        widgetsInit(loggedIn);
      });

      return this.each(function () {
        var container = $(this);
        if (container.find('.lockable-content').length === 0) {
          container.find('> :first-child').addClass('lockable-content');
        }
      });
    };
  }());
  // custom facebook login buttons
  (function () {
    $.fn.fbLogin = function () {
      var self = this;
      var loggedIn = false;
      this.invisible();
      $(document).on('fbStatusChanged', function (e, response) {
        loggedIn = response.status === 'connected';
        var text = loggedIn ? 'Log Out' : 'Log In';
        $(self.selector).find('.sc-text').text(text);
        self.visible();
      });
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
  }());
}(jQuery));