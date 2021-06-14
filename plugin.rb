# name: bitnami-chokepoint
# about: Bitnami Discourse topic creation entrypoint
# version: 1.0.9
# authors: crhernandez, jsalmeron

register_asset "javascripts/discourse/initializers/search.js.es6"
register_asset "javascripts/discourse/initializers/chokePoint.js.es6"

extend_content_security_policy(
  script_src: ['https://76v23gpdc8.execute-api.us-east-1.amazonaws.com'],
)
