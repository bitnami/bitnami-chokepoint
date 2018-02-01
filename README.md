# bitnami-chokepoint

Discourse plugin for ticket creation entry point

## How to install it in a Discourse Bitnami stack?

```
cd /opt/bitnami/apps/discourse/htdocs
RAILS_ENV=production bundle exec rake plugin:install repo=https://github.com/bitnami/bitnami-chokepoint
sudo chown -R bitnami:daemon /opt/bitnami/apps/discourse/htdocs/plugins/bitnami-chokepoint/
RAILS_ENV=production bundle exec rake assets:precompile
```

## How to upgrade it in a Discourse Bitnami stack?

```
cd /opt/bitnami/apps/discourse/htdocs/plugins/bitnami-chokepoint/
git pull
cd /opt/bitnami/apps/discourse/htdocs/
RAILS_ENV=production bundle exec rake assets:precompile
```
