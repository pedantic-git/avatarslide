Avatars = new Meteor.Collection("avatars");

if (Meteor.isClient) {

  Template.avatar.events({
    'click #config a' : function (event) {
      event.preventDefault();
      $(this).tab('show');
    },
    'click #slide a' : function (event) {
      event.preventDefault();
      $(this).tab('show');
    },
    'click button#update-button' : function (event) {
      var screen_names = $('#screen_names').val().split("\n");
      var force        = $('#force').is(':checked');

      Session.set('avatars_found', []);
      $.each(screen_names, function (index, name) {
	name = $.trim(name); // watch out for whitespace
	if (name == '') return;
	Meteor.call('avatar_url', name, force, function (error, result) {
	  if (!error) {
	    var af = Session.get('avatars_found');
	    af.push({url: result, screen_name: name});
	    Session.set('avatars_found', af);
	  }
	});
      });
    }
  });

  Template.slide.rendered = function () {
    if (!Template.slide.canvas) {
      var canvas = new fabric.Canvas('slide-canvas');
      canvas.on('after:render', function(){canvas.calcOffset();});
      Template.slide.canvas = canvas;      
    }
  };

  Template.slide.events({
    'click button#refresh-slide' : function (event) {
      var canvas = Template.slide.canvas;
      canvas.clear();
      var sns = $('#avatars-table tr td:nth-child(2)');
      var total_sns = sns.length;
      var c_width   = canvas.width;
      var c_height  = canvas.height;
      var n_h_steps = Math.floor(Math.sqrt(total_sns));
      var h_step    = Math.floor(c_height / n_h_steps);
      var n_w_steps = Math.floor(total_sns / n_h_steps);
      var w_step    = Math.floor(c_width / n_w_steps);
      sns.each(function (index) {
	var sn = this.innerHTML;

	var img = new fabric.Image($('#img-'+sn).get(0), {width: 48,
							  height: 48});
	var text = new fabric.Text(sn, {fontFamily: 'sans-serif',
					fontSize: 12,
					top: 50
				       });
	img.set('left', text.width/2-24);
	var w_steps = index % n_w_steps;
	var h_steps = Math.floor(index * n_w_steps) % n_h_steps;
	var left = w_step * w_steps;
	var top  = h_step * h_steps;
	
	var group = new fabric.Group([text, img], {
	  left: left,
	  top: top
	});
	canvas.add(group);
      });
    }
  });

  Template.avatar.avatars_found = function () {
    return Session.get('avatars_found');
  };
      
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
