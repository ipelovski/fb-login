Problem
=======

The web page will contain some widgets. These widgets should be locked or inaccessible if the user is not logged in Facebook. This sort of widget locking should be implemented as a grey transparent layer, called overlay, placed over a locked widget. The overlay will contain a Facebook login button in its center. Note that every widget should have this kind of overlay. When the user logs in, all overlays are removed and the widgets become accessible.

Solution
========

The solution consists of jQuery plugins, used for creating components, and a special jQuery event. The code of the components is placed in file `fb.js`, and their styling in `fb-login.css` and `sc-btn.css` (see below). The web page also should contain JavaScript initialization code in order to set up the correct Facebook application ID and create the necessary components.

Example:
```
<script type="text/javascript">
  $.fb_init(applicationID);
  $(function () {
    $('.lockable').fb_lockable();
    $('.status').fb_subscribe();
    $('.facebook-login').fb_login();
  });
</script>
```

Third party libraries:

* jQuery 1.11.1
* [jQuery resize plugin](http://benalman.com/projects/jquery-resize-plugin/)
* Facebook SDK

Every jQuery plugin resides in the "fb_" namespace to avoid possible name collisions with other plugins.

The "fbStatusChanged" event
---------------------------

Syntax: `$(document).on("fbStatusChanged", eventHandler)`

This event is fired on loading the Facebook SDK (i.e. page load) and when the Facebook login status of the user is changed. It is fired on the document element in order to be easily accessible. Every component listens for this event and sets its state accordingly. Before firing for the first time, all components are in uninitialized state.

The lockable widget component
-----------------------------

Syntax: `$(".lockable").fb_lockable()`

Every widget should be placed inside an HTML element that is used as a container. The HTML element should be marked in some way, preferably a CSS class. This class then could be used as a jQuery selector. When the component is created it decides whether to place an overlay element over the widget, based on the Facebook login status. Note that this component assumes that the widget is the first child element of the HTML container element. If that is not so (as in the case of the Facebook post widget) the element that represents the very widget should be marked with the CSS class "lockable-content".

Example:
```
  <div id="widget3" class="lockable">
    <div id="fb-root"></div> <script>(function(d, s, id) { var js, fjs = d.getElementsByTagName(s)[0]; if (d.getElementById(id)) return; js = d.createElement(s); js.id = id; js.src = "//connect.facebook.net/da_DK/all.js#xfbml=1"; fjs.parentNode.insertBefore(js, fjs); }(document, 'script', 'facebook-jssdk'));</script>
    <div class="lockable-content fb-post" data-href="https://www.facebook.com/video.php?v=10152969684371509" data-width="466">
      <div class="fb-xfbml-parse-ignore">
        <a href="https://www.facebook.com/video.php?v=10152969684371509">Opslag</a> af <a href="https://www.facebook.com/cnn">CNN</a>.
      </div>
    </div>
  </div>
```

When an overlay is created it contains a custom Facebook login button. The template of this button should be placed in a script element with id `fb-login-button`. The HTML element of the button should be marked with the CSS class "facebook-login".

Example:
```
<script type="text/template" id="fb-login-button">
  <a href="#" class="facebook-login fb-login-button-xlarge bold-btn sc-btn sc--facebook sc--large">
    <span class="sc-icon">
      <svg viewBox="0 0 33 33" width="25" height="25" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path d="M 17.996,32L 12,32 L 12,16 l-4,0 l0-5.514 l 4-0.002l-0.006-3.248C 11.993,2.737, 13.213,0, 18.512,0l 4.412,0 l0,5.515 l-2.757,0 c-2.063,0-2.163,0.77-2.163,2.209l-0.008,2.76l 4.959,0 l-0.585,5.514L 18,16L 17.996,32z"></path></g></svg>
    </span>
    <span class="sc-text"></span>
  </a>
</script>
```

The login button component
--------------------------

Syntax: `$(".facebook-login").fb_login()`

The login button widget provided by Facebook is quite heavy: it contains an iframe loading other scripts and style sheets. That's why the solution uses lightweight custom buttons. The style sheets used for the custom buttons are from this site: [http://www.mattboldt.com/demos/social-buttons/](http://www.mattboldt.com/demos/social-buttons/) and are placed in file `sc-btn.css`. The component for the buttons uses internally the `fbStatusChanged` event to get the Facebook login status of the user and display the correct button text ("Log In" or "Log Out"). The button texts can be configured using the `login` and `logout` fields of the `$.fn.fb_login.defaultOptions` configuration object.

The status component
--------------------

Syntax: `$(".status").fb_subscribe(options)`

This component displays the current Facebook login status of the user and provides options for subscribing to newsletters and offers if the user is logged in. The jQuery selector should points to the HTML root element of the widget. The plugin accepts an `options` object which can configure the given instance of component. The default options can be accessed through the `$.fn.fb_subscribe.defaultOptions` configuration object. Here is the list of its fields:

* `notLoggedinMessage` - The message displayed by the widget when the user is not logged in. Defaults to "Please log into Facebook."
* `notAuthorizeMessage` - The message displayed by the widget when the user is logged in but did not authorize the application. Defaults to "Please log into this app."
* `loginMessage` - The message displayed by the widget when the user is logged in. Defaults to "You are logged in."
* `options` - The jQuery selector for the element containing the checkboxes inside the widget. Defaults to ".permissions-container"
* `newsletter` - The jQuery selector for the checkbox element that is responsible for the user subsriptions to the newsletter. Defaults to ".newsletter-option"
* `offers` - The jQuery selector for the checkbox element that is responsible for the user subsriptions to the offers. Defaults to ".offers-option"
* `message` - The jQuery selector for the element containing the login status message. Defaults to ".status-message"

The subscriptions service
-------------------------

The status component uses internally this service to fill its state. The service communicates with the Facebook API or the website web services to retrieve or persist user related data. Every service function returns a jQuery `Deferred` object in order for the developer to chain up callbacks as necessary.

Building the solution
=====================

In order to save bandwidth and decrease load time, the source files of the solution are minified. The minified files are placed in the `build` directory and their names end with `.min`. The minification process is based on Node.js and Gulp. Here are the steps to build the minified files:

Open a terminal and type the following commands

* `npm install -g gulp` - Installs globally the Gulp module. Skip this step if the module is already installed.
* `npm install` - Installs the development modules listed in the package file.
* `gulp` - Invokes the Gulp command to minify the files.