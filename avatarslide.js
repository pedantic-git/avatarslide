Avatars = new Meteor.Collection("avatars");

if (Meteor.isClient) {

  // Initialize the canvas object properly
  Template.slide.rendered = function () {
    if (!Template.slide.canvas) {
      var canvas = new fabric.Canvas('slide-canvas');
      canvas.on('after:render', function(){
	canvas.calcOffset();
      });
      var fte = new fabric.Text("This is your Avatarslide canvas.\nAdd Twitter screen names and title text below to begin.",
				{fontFamily: 'sans-serif',
				 fontSize: 24,
				 textAlign: 'center',
				 originX: 'center',
				 originY: 'center',
				 top: canvas.height/2,
				 left: canvas.width/2});
      Template.slide.fte = fte;
      canvas.add(Template.slide.fte);
      Template.slide.canvas = canvas;      
    }

    // Add keyboard commands
    $(window).on('keydown', function (e) {
      switch (e.which) {
	case 46: // DEL
          if(canvas.getActiveGroup()){
	    canvas.getActiveGroup().forEachObject(function(o){ 
	      canvas.remove(o) 
	    });
	    canvas.discardActiveGroup().renderAll();
	  } else {
	    canvas.remove(canvas.getActiveObject());
	  }
	  break;
      }
    });
  };

  Template.slide.events({
    'click button#clear-button' : function (event) {
      Template.slide.canvas.clear();
    },

    'click button#add-button' : function (event) {
      var canvas = Template.slide.canvas;

      canvas.remove(Template.slide.fte); // If it's still there

      var screen_names = $('#screen_names').val().split("\n");
      var force        = $('#force').is(':checked');

      $.each(screen_names, function (index, name) {
	name = $.trim(name); // watch out for whitespace
	if (name == '') return;
	Meteor.call('avatar_url', name, force, function (error, result) {
	  if (error) {
	    console.log(error);
	  }
	  else {
	    fabric.Image.fromURL(result, function (img) {
	      var text = new fabric.Text(name, {fontFamily: 'sans-serif',
						fontSize: 12,
						top: 50,
					       });
	      img.set('left', text.width/2-24);

	      // Pick a random location on the canvas to insert
	      // FIXME: Avoid clipping?
	      var x = Math.floor((Math.random()*(canvas.width-32))+16);
	      var y = Math.floor((Math.random()*(canvas.height-32))+16);

	      var group = new fabric.Group([text, img], {
		left: x,
		top: y,
		originX: 'center',
		originY: 'center'
	      });
	      canvas.add(group);
	    });
	  }
	});
      });
      
      $('#screen_names').val(''); // Clear the box for more entry
    },

    'click button#title-add-button' : function (event) {
      var canvas = Template.slide.canvas;
      canvas.remove(Template.slide.fte); // If it's still there

      var title  = $('#title-input').val();
      var text   = new fabric.Text(title, {fontFamily: 'sans-serif',
					   fontSize: 64,
					   originX: 'center',
					   originY: 'center',
					   top: canvas.height / 2,
					   left: canvas.width / 2
					  });
      canvas.add(text);
      $('#title-input').val(''); // Clear input
    }
  });
}

if (Meteor.isServer) {

  Meteor.startup(function () {
    Future = Npm.require('fibers/future');

    Twit = new TwitMaker({
      consumer_key: 'fn0QgIwGCJ27vJWkFY3hVw',
      consumer_secret: 'DJu8ilh2LovDdzDFPlTs0cqWFhnAX4RI9Ewr2nVGE',
      access_token: '5991392-6yejtb5pSOzRHBN562wsnLECmDro4RKmxCBn9YSEnI',
      access_token_secret: 'zBOpTK97kE8p3oU3aSkPucPjuCBTBopV1JNiY7nUaVOXr'
    });
  });

  Meteor.methods({
    avatar_url: function (screen_name, force) {
      var fut = new Future();

      var avatar = Avatars.findOne({screen_name: screen_name})
      if (!force &&
	  avatar && 
	  avatar.timestamp && 
	  // Always refresh avatars that are more than 2 days old
	  moment(avatar.timestamp).isAfter(moment().subtract('days', 2))) {
	fut['return'](avatar.url);
      }
      else {
	Twit.get('users/show', {screen_name: screen_name},
		 function (err, reply) {
		   var url = '';
		   if (err) {
		     // 34: user doesn't exist
		     // 63: user has been suspended
		     if (err.code != 34 && err.code != 63) {
		       console.log(err);
		     }
		   } else {
		     url = reply.profile_image_url;
		   }
		   
		   fut['return'](url);
		 });
      }
      var url = fut.wait();
      // Add to Avatars
      Avatars.update({screen_name: screen_name},
		     {$set: {url: url, timestamp: moment()}},
		     {upsert: true});
      return url;
    }
  });

}
