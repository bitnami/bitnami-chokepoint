# name: bitnami-chokepoint
# about: Bitnami Discourse topic creation entrypoint
# version: 1.1.0
# authors: crhernandez, jsalmeron

register_asset "javascripts/discourse/initializers/search.js.es6"
register_asset "javascripts/discourse/initializers/chokePoint.js.es6"

extend_content_security_policy(
  script_src: ['http://internal-bndiagnostic-retrieval-1263868043.us-east-1.elb.amazonaws.com', 'http://internal-bndiagnostic-retrieval-dev-1996126494.us-east-1.elb.amazonaws.com'],
)
