if (Meteor.isClient) {

  Template.avatar.events({
    'change input#screen_name' : function (event) {
      var screen_name = event.currentTarget.value;
      console.log(screen_name);
      Meteor.call('avatar_url', screen_name, function (error, result) {
	if (!error) {
	  Session.set('the_avatar_url', result);
	}
      });
    }
  });

  Template.avatar.the_avatar_url = function () {
    return Session.get('the_avatar_url');
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
    avatar_url: function (screen_name) {
      var fut = new Future();
      Twit.get('users/show', {screen_name: screen_name},
	       function (err, reply) {
		 if (err) {
		   // 34: user doesn't exist
		   // 63: user has been suspended
		   if (err.code != 34 && err.code != 63) {
		     console.log(err);
		   }
		   fut['return']('');
		 } else {
		   fut['return'](reply.profile_image_url);
		 }
	       });
      return fut.wait();
    }
  });

}
