# serverless-restapi-log

This Serverless-restapi-log plugin enables you to have apigateway log group maintained through serverless cloudformation template.
If this plugin is enabled, it enable restapi logs as well on apigateway

In any case this plugin is removed, log group will be removed as it no longer be part of the stack template. Howevver, restapi is still enabled but no log being captured. To disbale this, a custom pre deploy script is needed to check this plugin is enabled, otherwise disable the log

## Installation

First, add `serverless-restapi-log to your project:

```sh
npm install serverless-restapi-log
```

Then inside your project's `serverless.yml` file, add following entry to the plugins section

```yml
plugins:
  - serverless-restapi-log
```

[See example](./example/README.md)

## Configuration

Plugin need to be configured with a log group, and a format.
Log group just need a name, plugins takes care to ensure CloudWatchLogGroup creation.

To configure it, add something like the following to your `serverless.yml`.

```yml
custom:
  serverless-restapi-log:
    log-group: /aws/my-api/${self:provider.stage}/access-logs
    format: '{ "requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "caller":"$context.identity.caller", "user":"$context.identity.user","requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath", "status":"$context.status","protocol":"$context.protocol", "responseLength":"$context.responseLength" }'
    log-group-retention: 14 # optional, default to 7
```
