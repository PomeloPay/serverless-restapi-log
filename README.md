# serverless-apigateway-log-group

This Serverless-apigateway-log-group plugin enables you to keep log group created from v2 when restapi log is enabled.

## Installation

First, add `serverless-apigateway-log-group to your project:

```sh
npm install serverless-apigateway-log-group
```

Then inside your project's `serverless.yml` file, add following entry to the plugins section

```yml
plugins:
  - serverless-apigateway-log-group
```

[See example](./example/README.md)

## Configuration

Plugin need to be configured with a log group, and a format.
Log group just need a name, plugins takes care to ensure CloudWatchLogGroup creation.

To configure it, add something like the following to your `serverless.yml`.

```yml
custom:
  serverless-apigateway-log-group:
    log-group: /aws/my-api/${self:provider.stage}/access-logs
    log-group-retention: 14 # optional, default to 7
```
