Avatars = new Meteor.Collection("avatars");

if (Meteor.isClient) {

  Template.avatar.events({
    'click button#update-button' : function (event) {
      var screen_names = $('#screen_names').val().split("\n");
      var force        = $('#force').is(':checked');

      Session.set('avatars_found', []);
      $.each(screen_names, function (index, name) {
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
