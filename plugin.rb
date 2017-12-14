# name: bitnami-chokepoint
# about: Bitnami Discourse topic creation entrypoint
# version: 0.0.1
# authors: crhernandez, jsalmeron

register_asset "javascripts/discourse/initializers/chokePoint.js.es6"
register_asset "javascripts/discourse/initializers/search.js.es6"

# Require gems
gem 'inflection', '1.0.0'
gem 'zendesk_api', '1.16.0'

module ::DiscourseZendeskPlugin
  module Helper
    def zendesk_client
      client = ZendeskAPI::Client.new do |config|
        config.url      = SiteSetting.zendesk_url
        config.username = SiteSetting.zendesk_username
        config.token    = SiteSetting.zendesk_token
      end
    end
  end
end

Discourse::Application.routes.append do
  post '/zendesk-plugin/issues' => 'discourse_zendesk_plugin/issue#create'
end

after_initialize do
  class ::DiscourseZendeskPlugin::IssueController < ::ApplicationController
    include DiscourseZendeskPlugin::Helper
    def create
      zendesk_client.tickets.create!(
        :subject => params(:subject),
        :comment => { :value => params(:comment) },
        :submitter_id => params(:submitter_id)
      )
    end
  end
end
