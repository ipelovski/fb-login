/* global FB */
(function () {
  "use strict";

  var fbButtonTemplate = '<fb:login-button class="fb-login-button" id="loginbtn" data-size="xlarge" autologoutlink="true" scope="public_profile,email" onlogin="checkLoginState();"></fb:login-button>';

  

  function widgetsInit(loggedIn) {
    var lockedContent = $('.locked-content');
    if (loggedIn) {
      lockedContent.addClass('unlocked');
    }
    else {
      lockedContent.each(function (idx, elem) {
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

      lockedContent.resize(function (e) {
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

  // This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {

    $('#permissionContainer').hide();

    //console.log('statusChangeCallback');
    //console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      //document.getElementById('loginbtn').style.display = "none";
      testAPI();
      
    } else if (response.status === 'not_authorized') {

      // $('#overlay').show();
      // document.getElementById('loginspn').innerHTML = '<fb:login-button id="loginbtn" data-size="xlarge" autologoutlink="true" scope="public_profile,email" onlogin="checkLoginState();"></fb:login-button>';
      // FB.XFBML.parse(document.getElementById('loginspn'));

      // The person is logged into Facebook, but not your app.
      //document.getElementById('status').innerHTML = 'Please log ' + 'into this app.';
    } else {

      // $('#overlay').show();
      // document.getElementById('loginspn').innerHTML = '<fb:login-button id="loginbtn" data-size="xlarge" autologoutlink="true" scope="public_profile,email" onlogin="checkLoginState();"></fb:login-button>';
      // FB.XFBML.parse(document.getElementById('loginspn'));


      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      //document.getElementById('status').innerHTML = 'Please log ' + 'into Facebook.';
    }
    var loggedIn = response.status === 'connected';
    widgetsInit(loggedIn);
  }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  function checkLoginState() {
    FB.getLoginStatus(function (response) {
      statusChangeCallback(response);

    });
  }

  window.fbAsyncInit = function () {
    FB.init({
      appId      : '668806603233882', //'823531907664969',
      cookie     : true,  // enable cookies to allow the server to access 
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v2.1', // use version 2.1
      status: true // the SDK will attempt to get info about the current user immediately after init
    });

    // Now that we've initialized the JavaScript SDK, we call 
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

    FB.getLoginStatus(function (response) {
      statusChangeCallback(response);
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

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI() {

    FB.api('/me?fields=id,email,gender,age_range', function (response) {

      // ga('send', 'pageview', {
      //   'fbgender': response.gender,
      //   'fbagerange' : response.age_range.min
      // });

      //console.log(response);

      $.getJSON('checkUser.php?op=0&id=' + response.id, function (data) {
        $('#overlay').hide();
        $('#permission').data('fbid', response.id);
        $('#permissionContainer').show();
        $('#permission').prop('checked', data !== 0);
        $('#permission2').prop('checked', data !== 0);
      });
    });
  }

  $('#permission').click(function () {
    var fbid = $(this).data('fbid');
    // ga('send', 'event', 'newsletter', 'action', ((this.checked) ? 'signup' : 'cancel'));
    $.get('checkUser.php?op=1&id=' + fbid + '&val=' + (this.checked ? 1 : 0), function (data) {
      // Something
    });
  });

  $('#permission2').click(function () {
    var fbid = $(this).data('fbid');
    // ga( 'send', 'event', 'newsletter', 'action', ( ( this.checked ) ? 'signup' : 'cancel' ) );
    $.get('checkUser.php?op=1&id=' + fbid + '&val=' + (this.checked ? 1 : 0), function (data) {
      // Something
    });
  });

  $('#permission').click(function () {
    var fbid = $(this).data('fbid');
    // ga( 'send', 'event', 'newsletter', 'action', ( ( this.checked ) ? 'signup' : 'cancel' ) );
    $.get('checkUser.php?op=1&id=' + fbid + '&val=' + (this.checked ? 1 : 0), function (data) {
      // Something
    });
  });

  $('#permission2').click(function () {
    var fbid = $(this).data('fbid');
    // ga( 'send', 'event', 'newsletter', 'action', ( ( this.checked ) ? 'signup' : 'cancel' ) );
    $.get('checkUser.php?op=1&id=' + fbid + '&val=' + (this.checked ? 1 : 0), function (data) {
      // Something
    });
  });

  $(function setLockedContent() {
    $('.locked').each(function (idx, elem) {
      var container = $(elem);
      if (container.find('.locked-content').length === 0) {
        container.find('> :first-child').addClass('locked-content');
      }
    });
  });
}());