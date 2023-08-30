const _ = require("lodash/fp");

class ExtendDeploymentWithAccessLogGroup {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.provider = this.serverless.getProvider("aws");

    this.configuration = _.get(
      "service.custom.serverless-apigateway-log-group",
      serverless
    );
    if (!this.configuration)
      throw new Error(
        "Plugin serverless-apigateway-log-group must be configured"
      );
    if (!_.has("log-group", this.configuration))
      throw new Error(
        "Plugin serverless-apigateway-log-group must be configured: missing log-group"
      );
    this.hooks = {
      "before:aws:package:finalize:mergeCustomProviderResources":
        this.bindDeploymentId.bind(this),
    };
  }

  bindDeploymentId() {
    const template =
      this.serverless.service.provider.compiledCloudFormationTemplate;

    // ApiGatewayLogGroup
    template.Resources.ApiGatewayLogGroup = {
      Type: "AWS::Logs::LogGroup",
      Properties: {
        LogGroupName: this.configuration["log-group"],
        RetentionInDays: this.configuration["log-group-retention"] || 7,
      },
    };
  }
}

module.exports = ExtendDeploymentWithAccessLogGroup;
