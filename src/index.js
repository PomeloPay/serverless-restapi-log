const AWS = require('aws-sdk')

const apiGateway = new AWS.APIGateway({})
const cloudWatchLogs = new AWS.CloudWatchLogs({})
const cloudFormation = new AWS.CloudFormation({})

class RestApiLog {
  constructor(serverless, options) {
    this.serverless = serverless
    this.provider = this.serverless.getProvider('aws')

    this.configuration = this.serverless.service.custom['serverless-restapi-log']
    if (!this.configuration) {
      throw new Error('Plugin serverless-restapi-log must be configured')
    }
    if (!this.configuration['log-group']) {
      throw new Error('Plugin serverless-restapi-log must be configured: missing log-group')
    }
    if (!this.configuration['format']) {
      throw new Error('Plugin serverless-restapi-log must be configured: missing format')
    }
    this.hooks = {
      'before:aws:package:finalize:mergeCustomProviderResources': this.addApiGatewayLogGroup.bind(this),
      'after:deploy:deploy': this.enableRestApiLog.bind(this)
    }
  }

  async getLogGroupByName(name) {
    console.log('==============GET LOG GROUP NAME==============')
    const { logGroups } = await cloudWatchLogs
      .describeLogGroups({
        logGroupNamePattern: name
      })
      .promise()
    console.log(`describeLogGroups result: ${JSON.stringify(logGroups)}`)

    const logGroup = logGroups.find((l) => l.logGroupName === name)

    return logGroup
  }

  async addApiGatewayLogGroup() {
    console.log('==============ADD API GATEWAY LOG GROUP==============')
    const template = this.serverless.service.provider.compiledCloudFormationTemplate
    const stackName = this.serverless.service.provider.stackName

    const existingTemplate = await cloudFormation
      .getTemplate({
        StackName: stackName
      })
      .promise()
      .catch(() => {
        return null
      })

    if (existingTemplate) {
      console.log('stack template exists, checking if log group exists in stack')
      const jsonTemplate = JSON.parse(existingTemplate.TemplateBody)

      if (jsonTemplate.Resources && jsonTemplate.Resources.ApiGatewayLogGroup) {
        console.log('ApiGatewayLogGroup resource exists in existing stack, maintaining it')
        template.Resources.ApiGatewayLogGroup = {
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: this.configuration['log-group'],
            RetentionInDays: this.configuration['log-group-retention'] || 7
          }
        }
      } else {
        console.log('ApiGatewayLogGroup resource not exists in existing stack... checking if log group ald exists')

        const logGroup = await this.getLogGroupByName(this.configuration['log-group'])
        if (!logGroup) {
          template.Resources.ApiGatewayLogGroup = {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
              LogGroupName: this.configuration['log-group'],
              RetentionInDays: this.configuration['log-group-retention'] || 7
            }
          }
        } else {
          console.log('log group exists with no ref to stack...')
        }
      }
    } else {
      console.log('stack template not exists, adding ApiGatewayLogGroup to stack')
      // ApiGatewayLogGroup
      template.Resources.ApiGatewayLogGroup = {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
          LogGroupName: this.configuration['log-group'],
          RetentionInDays: this.configuration['log-group-retention'] || 7
        }
      }
    }
  }

  async enableRestApiLog() {
    console.log('==============ENABLE REST API LOG==============')
    try {
      const restApiId = this.provider.getApiGatewayRestApiId()
      const stageName = this.provider.getStage()

      console.log('restApiId', restApiId)
      console.log('stageName', stageName)

      const stage = await apiGateway.getStage({ restApiId, stageName }).promise()
      console.log('stage', stage)

      const logGroup = await this.getLogGroupByName(this.configuration['log-group'])

      if (logGroup) {
        const destinationArn = logGroup.arn.replace(':*', '')
        console.log('destinationArn', destinationArn)

        if (destinationArn) {
          const op = stage && stage.accessLogSettings ? 'replace' : 'add'
          const updatedStage = await apiGateway
            .updateStage({
              restApiId,
              stageName,
              patchOperations: [
                {
                  op,
                  path: '/accessLogSettings/destinationArn',
                  value: destinationArn
                },
                {
                  op,
                  path: '/accessLogSettings/format',
                  value: this.configuration['format']
                }
              ]
            })
            .promise()

          console.log('updatedStage', updatedStage)
        }
      } else {
        console.log(`log group ${this.configuration['log-group']} not exists`)
        throw new Error('Log group doest exists, cant enable rest api log')
      }
    } catch (error) {
      console.error('enableRestApiLog error', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      throw new Error('ENABLE REST API LOG ERROR')
    }
  }
}

module.exports = RestApiLog
