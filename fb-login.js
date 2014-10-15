/* global FB */
(function ($) {
  "use strict";

  // widget for email subscriptions
  (function () {
    var StatusClassNames = {
      'connected': 'status-connected',
      'not_authorized': 'status-not-authorized',
      'unknown': 'status-unknown'
    };
    var StatusClassNamesArray = ['status-connected', 'status-not-authorized', 'status-unknown'];
    var fbid, fbEmail;
    var checkUserUrl = 'http://simulation.dk/other/sumo/checkUser.php';

    $.fn.subscribe = function () {
      function initContainer(status) {
        return function (idx, elem) {
          var container = $(elem);
          for (var i = 0; i < StatusClassNamesArray.length; i++) {
            container.find('.' + StatusClassNamesArray[i]).hide();
          }
          var className = StatusClassNames[status];
          container.find('.' + className).show();
        };
      }
      var self = this;
      $().fbRepo().on('fbStatusChanged', function (e, response) {
        self.each(initContainer(response.status)).removeClass('hidden');
      });
      return this.each(initContainer(''));
    };

    function updateStatusWidget(status) {
      FB.api('/me?fields=id,email,gender,age_range', function (response) {
        fbid = response.id;
        fbEmail = response.email;
        $.getJSON(checkUserUrl + '?op=0&id=' + fbid, function (data) {
          var permissionsContainer = $('.permissions-container');
          permissionsContainer.show();
          permissionsContainer.find('.newsletter-option').prop('checked', data !== 0);
          permissionsContainer.find('.offers-option').prop('checked', data !== 0);
        });

        // $.get('checkUser.php?op=1&id=' + fbid + '&val=' + (this.checked ? 1 : 0), function (data) {
        //   // Something
        // });
      });
    }
  }());

  window.fbAsyncInit = function () {
    FB.init({
      appId      : '668806603233882', //'823531907664969',
      cookie     : true,  // enable cookies to allow the server to access 
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v2.1', // use version 2.1
      status: true // the SDK will attempt to get info about the current user immediately after init
    });
  };

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
    var fbRepo = $({});
    var oldfbAsyncInit = window.fbAsyncInit;
    function fbStatusChangedHandler(response) {
      fbRepo.trigger('fbStatusChanged', response);
    }
    window.fbAsyncInit = function () {
      if (typeof oldfbAsyncInit === 'function') {
        oldfbAsyncInit();
      }
      FB.getLoginStatus(fbStatusChangedHandler);
      FB.Event.subscribe('auth.authResponseChange', fbStatusChangedHandler);

      ['auth.login', 'auth.logout', 'auth.authResponseChange', 'auth.statusChange'].forEach(function (eventType) {
        FB.Event.subscribe(eventType, function (response) {
          console.log(eventType);
        });
      });
    };
    $.fn.fbRepo = function () {
      return fbRepo;
    };
  }());

  // overlay widget
  (function () {
    // onlogin="checkLoginState();"
    var fbButtonTemplate = '<fb:login-button class="fb-login-button-xlarge" data-size="xlarge" scope="public_profile,email"></fb:login-button>';

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
          overlay.append(fbButtonTemplate);
          FB.XFBML.parse(overlay[0]);
          container.append(overlay);
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
            // 'background-color': 'rgba(0, 0, 0, 0.70)',
            // 'position': 'absolute',
            // 'left': left,
            // 'top': top,
            'width': width,
            'height': height,
            // 'z-index': 100
          });
        });//.resize();
      }
    }
    $.fn.lockable = function () {
      $().fbRepo().on('fbStatusChanged', function (e, response) {
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
}(jQuery));