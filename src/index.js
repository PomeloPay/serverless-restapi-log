const AWS = require("aws-sdk");

const apiGateway = new AWS.APIGateway({});
const cloudWatchLogs = new AWS.CloudWatchLogs({});

class RestApiLog {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.provider = this.serverless.getProvider("aws");

    this.configuration =
      this.serverless.service.custom["serverless-restapi-log"];
    if (!this.configuration) {
      throw new Error("Plugin serverless-restapi-log must be configured");
    }
    if (!this.configuration["log-group"]) {
      throw new Error(
        "Plugin serverless-restapi-log must be configured: missing log-group"
      );
    }
    if (!this.configuration["format"]) {
      throw new Error(
        "Plugin serverless-restapi-log must be configured: missing format"
      );
    }
    this.hooks = {
      "before:aws:package:finalize:mergeCustomProviderResources":
        this.addApiGatewayLogGroup.bind(this),
      "after:deploy:deploy": this.enableRestApiLog.bind(this),
    };
  }

  addApiGatewayLogGroup() {
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

  async enableRestApiLog() {
    try {
      const restApiId = this.provider.getApiGatewayRestApiId();
      const stageName = this.provider.getStage();

      console.log("restApiId", restApiId);
      console.log("stageName", stageName);

      const stage = await apiGateway
        .getStage({ restApiId, stageName })
        .promise();
      console.log("stage", stage);

      const { logGroups } = await cloudWatchLogs
        .describeLogGroups({
          logGroupNamePattern: this.configuration["log-group"],
        })
        .promise();
      const logGroup = logGroups.find(
        (l) => l.logGroupName === this.configuration["log-group"]
      );
      const destinationArn = logGroup.arn.replace(":*", "");
      console.log("destinationArn", destinationArn);

      if (destinationArn) {
        const op = stage && stage.accessLogSettings ? "replace" : "add";
        const updatedStage = await apiGateway
          .updateStage({
            restApiId,
            stageName,
            patchOperations: [
              {
                op,
                path: "/accessLogSettings/destinationArn",
                value: destinationArn,
              },
              {
                op,
                path: "/accessLogSettings/format",
                value: this.configuration["format"],
              },
            ],
          })
          .promise();

        console.log("updatedStage", updatedStage);
      }
    } catch (error) {
      console.error("enableRestApiLog error", error);
    }
  }
}

module.exports = RestApiLog;
